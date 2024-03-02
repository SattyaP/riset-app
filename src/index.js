const {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  ipcRenderer
} = require("electron");
const {
  autoUpdater
} = require("electron-updater");
const Store = require("electron-store");
const path = require("path");
const apiInstance = require("./api/instanceApi");
const {
  mac
} = require("address");

const store = new Store();

if (require("electron-squirrel-startup")) {
  app.quit();
}

let authWindow;

const createAuthWindow = () => {
  authWindow = new BrowserWindow({
    width: 500,
    height: 210,
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#0d6efd",
      symbolColor: "#fff",
    },
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: !app.isPackaged,
    },
  });

  authWindow.loadFile(path.join(__dirname, "/pages/auth.html"));
};

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: !app.isPackaged,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "/pages/index.html"));
  app.isPackaged && Menu.setApplicationMenu(null);

  autoUpdater.on("download-progress", (progress) => {
    mainWindow.webContents.send("update_progress", progress.percent);
  });

  autoUpdater.checkForUpdatesAndNotify();
  autoUpdater.on("update-available", () => {
    updateCheckInProgress = false;
    mainWindow.webContents.send("update_available");
  });

  autoUpdater.on("update-downloaded", () => {
    mainWindow.webContents.send("update_downloaded");
  });
};

function initializeApp() {
  let storage;
  try {
    let appSettings = store.get("appSettings");
    if (appSettings !== undefined) {
      storage = JSON.parse(appSettings);
    } else {
      storage = {};
    }

    let mac_address = "";
    mac((err, addr) => {
      mac_address = addr;
    });

    if (storage.appId && storage.lisence_key) {
      createWindow();
      ipcMain.on('session', (event) => {
        event.sender.send('session-data', storage.lisence_key)
      })
    } else {
      createAuthWindow();
    }

    ipcMain.on("lisence-filled", async (event, data) => {
      const lisence_key = data;
      setLoading(event, true);

      apiInstance(lisence_key)
        .post(`lisence/validated?lisence_key=${lisence_key}`)
        .then((response) => {
          const data = response.data;
          if (!data.success) return handleValidate(event, data.message);
          apiInstance(lisence_key)
            .post(
              `lisence/validated/callback/valid?valid=${data.success}&appId=${data.data.app_id}&mac_address=${mac_address}`
            )
            .then((e) => {
              setLoading(event, false);
              if (!data.success)
                return handleValidate(event, data.message);
              let appSettings = {
                appId: e.data.data.appId,
                lisence_key: lisence_key,
                mac_address: mac_address
              };
              store.set("appSettings", JSON.stringify(appSettings));
              if (authWindow) {
                authWindow.close();
                createWindow();
              }
            });
        }).catch((err) => {
          handleValidate(event, err)
        });
    });


    ipcMain.on('re-session', (event, data) => {
      const lisence_key = data;
      setLoading(event, true);
      
      apiInstance(lisence_key).post(`lisence/validated?lisence_key=${lisence_key}`)
      .then((e) => {
        const data = e.data
        if (!data.success) return handleValidate(event, data.message)
        setLoading(event, false);
      })
    })

  } catch (error) {
    console.error("Error:", error);
  }
}

app.on("ready", async (event) => initializeApp());

function setLoading(event, state) {
  event.sender.send("loading", state);
}

function handleValidate(event, msg) {
  event.sender.send("valid", msg);
  setLoading(event, false)
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.on("app_version", (event) => {
  event.sender.send("app_version", {
    version: app.getVersion(),
  });
});

ipcMain.on("restart_app", () => {
  autoUpdater.quitAndInstall();
});