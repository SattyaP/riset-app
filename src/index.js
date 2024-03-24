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
    width: 1280,
    height: 600,
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#212529",
      symbolColor: "#fff",
    },
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
  let appSettings = store.get("appSettings") || false;
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
        return handleError(event, responseData.message);

      const e = await apiInstance(lisence_key).post(
        `lisence/validated/callback/valid?valid=${responseData.success}&appId=${responseData.data.app_id}&mac_address=${mac_address}`
      );
      const callbackData = e.data;
      if (!callbackData.success)
        return handleError(event, callbackData.message);

      let appSettings = {
        appId: callbackData.data.appId,
        lisence_key: lisence_key,
        mac_address: mac_address,
        expired: callbackData.data.end_expired,
        customer_email: responseData.data.customer_email,
      };

      store.set("appSettings", JSON.stringify(appSettings));
      if (authWindow) {
        authWindow.close();
        createWindow();
        setLoading(event, false);
      }
    } catch (error) {
      handleError(event, error);
    }
  });

  ipcMain.on("re-session", async (event, data) => {
    const lisence_key = data;
    setLoading(event, true);

    try {
      const response = await apiInstance(lisence_key)
        .post(`lisence/validated?lisence_key=${lisence_key}`)
        .catch((error) => {
          return handleError(event, error, true);
        });
      const responseData = response.data;
      if (!responseData.success)
        return handleError(event, responseData.message);
      setLoading(event, false);
    } catch (error) {
      handleError(event, error, true);
    }
  });
}

ipcMain.on("logout", async (event) => {
  try {
    const { appId, lisence_key } = JSON.parse(store.get("appSettings"));
    const response = await apiInstance(lisence_key)
      .post(`logout?lisence_key=${lisence_key}`)
      .catch((error) => {
        return handleError(event, error, true);
      });
    const responseData = response.data;
    if (!responseData.success) return handleError(event, responseData.message);
    store.delete("appSettings");
    appExit();
  } catch (error) {
    handleError(event, error, true);
  }
});

ipcMain.on("status-license", async (event) => {
  setLoading(event, true);

  try {
    const { appId, lisence_key } = JSON.parse(store.get("appSettings"));
    const response = await apiInstance(lisence_key)
      .get(`status?lisence_key=${lisence_key}`)
      .catch((error) => {
        return handleError(event, error, true);
      });
    const responseData = response.data;
    if (!responseData.success) return handleError(event, responseData.message);
    event.sender.send("status-license", responseData.data.status);
    setLoading(event, false);
  } catch (error) {
    handleError(event, error, true);
  }
});

app.on("ready", async (event) => initializeApp());

function setLoading(event, state) {
  event.sender.send("loading", state);
}

function handleError(event, msg, isError = false) {
  event.sender.send("error-found", msg, isError);
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

ipcMain.on("error", (event, isError) => {
  !isError && store.delete("appSettings");
  !isError && appExit();
});

function appExit() {
  app.relaunch();
  app.exit();
}

ipcMain.on("get-profile", (event) => {
  event.sender.send("profile", store.get("appSettings"));
});
