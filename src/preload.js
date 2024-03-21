const { ipcRenderer } = require("electron");
const version = document.getElementById("version");
const warp = document.getElementById("warp");
const message = document.getElementById("message");
const restartButton = document.getElementById("restart-button");
const loaderDownload = document.getElementById("warp-loader");
const loader = document.getElementById("loader");
const boxModel = document.getElementById("boxModal");

ipcRenderer.send("session");
ipcRenderer.on("session-data", (event, data) => {
  ipcRenderer.send("re-session", data);
});

ipcRenderer.on("loading", (event, state) => {
  state ? loader.classList.remove("hidden") : loader.classList.add("hidden");
});

ipcRenderer.on("valid", (event, msg) => {
  boxModel.classList.remove("hidden");
  boxModel.querySelector("span").textContent = msg;
  // TODO: Handle msg error cause sometimes the error is not same
  setTimeout(() => {
    ipcRenderer.send("invalid-lisence");
  }, 3000);
});

ipcRenderer.on('profile', (event, data) => {
    const profile = JSON.parse(data);
    document.getElementById('appId').innerText = `AppId : ${profile.appId}`;
    document.getElementById('expired').innerText = `End Expired : ${profile.expired}`;
});

let updateProgress = 0;

ipcRenderer.send("app_version");
ipcRenderer.on("app_version", (event, arg) => {
  version.innerText = "v" + arg.version;
});

ipcRenderer.on("update_available", () => {
  ipcRenderer.removeAllListeners("update_available");
  message.innerText = "A new update is available. Downloading now...";
  warp.classList.remove("hidden");
  loaderDownload.classList.remove("hidden");
});

ipcRenderer.on("update_progress", (event, progress) => {
  updateProgress = progress;
  const progsDown = document.getElementById("download-progress");
  progsDown.style.width = updateProgress + "%";
  progsDown.setAttribute("aria-valuenow", updateProgress);
});

ipcRenderer.on("update_downloaded", () => {
  ipcRenderer.removeAllListeners("update_downloaded");
  message.innerText =
    "Update Downloaded. It will be installed on restart. Restart now?";
  restartButton.classList.remove("d-none");
  warp.classList.remove("hidden");

  loaderDownload.classList.add("hidden");
});

restartButton.addEventListener("click", (e) => {
  ipcRenderer.send("restart_app");
});
