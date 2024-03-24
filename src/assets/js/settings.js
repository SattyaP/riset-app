const { ipcRenderer } = require("electron");
const Swal = require("sweetalert2");
const version = document.getElementById("version");
const loader = document.getElementById("loader");
const boxModel = document.getElementById("boxModal");

ipcRenderer.send("get-profile");
ipcRenderer.on("profile", (event, data) => {
  const profile = JSON.parse(data);
  document
    .querySelectorAll(".appId")
    .forEach((el, i) =>
      i !== 0
        ? (el.innerText = profile.appId)
        : (el.innerText = `App ID : ${profile.appId}`)
    );
  document.querySelector(
    ".customer-email"
  ).innerText = `Email : ${profile.customer_email}`;
  document.getElementById(
    "expired"
  ).innerText = `End Expired : ${profile.expired}`;
});

ipcRenderer.on("error-found", (event, msg, isError) => {
  boxModel.classList.remove("hidden");
  boxModel.querySelector("span").textContent = isError ? "Error" : msg;
  if (isError)
    document.getElementById("msg").innerHTML =
      "An error occurred, please try again later.";
});

ipcRenderer.on("loading", (event, state) => {
  state ? loader.classList.remove("hidden") : loader.classList.add("hidden");
});

document.getElementById("logout").addEventListener("click", () => {
  Swal.fire({
    title: "Logout",
    text: "Are you sure you want to logout?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes",
    cancelButtonText: "No",
    reverseButtons: true,
  }).then((result) => {
    if (result.isConfirmed) {
      ipcRenderer.send("logout");
    }
  });
});

ipcRenderer.send("status-license");
ipcRenderer.on("status-license", (event, data) => {
  document.getElementById("status").innerText = data;
});

const updateOnlineStatus = () => {
  document.querySelector(".connection-status").innerHTML = navigator.onLine
    ? "online"
    : "offline";
  if (!navigator.onLine) {
    boxModel.classList.remove("hidden");
    document.getElementById("msg").textContent =
      "You are offline, please check your internet connection.";
    document
      .querySelector(".connection-status")
      .classList.add("text-bg-danger");
  } else {
    boxModel.classList.add("hidden");
    boxModel.querySelector("span").textContent = "";
    document
      .querySelector(".connection-status")
      .classList.remove("text-bg-danger");
    document
      .querySelector(".connection-status")
      .classList.add("text-bg-success");
  }
};

window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);

updateOnlineStatus();

ipcRenderer.send("app_version");
ipcRenderer.on("app_version", (event, arg) => {
  version.innerText = "v" + arg.version;
});
