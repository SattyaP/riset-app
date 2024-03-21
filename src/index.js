const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const { autoUpdater } = require("electron-updater");
const Store = require("electron-store");
const path = require("path");
const apiInstance = require("./api/instanceApi");
const { mac } = require("address");

const store = new Store();

if (require("electron-squirrel-startup")) {
  app.quit();
}

let authWindow, mainWindow, updateCheckInProgress;

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
  let mainWindow = new BrowserWindow({
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

  // TODO : Check if update is not running on auth window
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

async function initializeApp() {
  try {
    let appSettings = store.get("appSettings") || false;
    // TODO: Check if appSettings is not empty
    let { appId, lisence_key } = appSettings ? JSON.parse(appSettings) : {};

    let mac_address = await new Promise((resolve, reject) => {
      mac((err, addr) => {
        if (err) reject(err);
        else resolve(addr);
      });
    });

    if (appId && lisence_key) {
      createWindow();
      ipcMain.on("session", (event) => {
        event.sender.send("session-data", lisence_key);
      });
    } else {
      createAuthWindow();
    }

    ipcMain.on("lisence-filled", async (event, data) => {
      const lisence_key = data;
      setLoading(event, true);

      try {
        const response = await apiInstance(lisence_key).post(
          `lisence/validated?lisence_key=${lisence_key}`
        );
        const responseData = response.data;
        if (!responseData.success)
          return handleValidate(event, responseData.message);

        const e = await apiInstance(lisence_key).post(
          `lisence/validated/callback/valid?valid=${responseData.success}&appId=${responseData.data.app_id}&mac_address=${mac_address}`
        );
        const callbackData = e.data;
        setLoading(event, false);
        if (!callbackData.success)
          return handleValidate(event, callbackData.message);

        let appSettings = {
          appId: callbackData.data.appId,
          lisence_key: lisence_key,
          mac_address: mac_address,
          expired: callbackData.data.end_expired,
        };

        store.set("appSettings", JSON.stringify(appSettings));
        if (authWindow) {
          authWindow.close();
          createWindow();
          getProfile(event);
        }
      } catch (error) {
        handleValidate(event, error);
      }
    });

    ipcMain.on("re-session", async (event, data) => {
      const lisence_key = data;
      setLoading(event, true);

      try {
        const response = await apiInstance(lisence_key).post(
          `lisence/validated?lisence_key=${lisence_key}`
        );
        const responseData = response.data;
        if (!responseData.success)
          return handleValidate(event, responseData.message);
        setLoading(event, false);
        getProfile(event);
      } catch (error) {
        handleValidate(event, error);
      }
    });
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// TODO: Handle logout app

app.on("ready", async (event) => initializeApp());

function setLoading(event, state) {
  event.sender.send("loading", state);
}

function handleValidate(event, msg) {
  event.sender.send("valid", msg);
  setLoading(event, false);
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

ipcMain.on("invalid-lisence", () => {
  store.delete("appSettings");
  appExit();
});

function appExit() {
  app.relaunch();
  app.exit();
}

function getProfile(event) {
  event.sender.send('profile', store.get("appSettings")) ;
}
