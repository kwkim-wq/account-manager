const { app, BrowserWindow, ipcMain, clipboard, net } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

require("update-electron-app")({
  repo: "kwkim-wq/account-manager",
  updateInterval: "1 hour",
});

if (require("electron-squirrel-startup")) {
  app.quit();
}

let mainWindow;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 640,
    resizable: false,
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));
};

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// --- 설정 ---

function getConfigPath() {
  return path.join(app.getPath("userData"), "config.json");
}

function loadConfig() {
  const configPath = getConfigPath();
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, "utf-8"));
  }
  return {
    serverUrl: "http://15.165.72.254:8100",
    apiKey: "3f345c3cf40bc7009972fcadda51a6454abbefb76330facce5e62ade4df556b9",
  };
}

ipcMain.handle("get-config", () => loadConfig());

ipcMain.handle("save-config", (event, config) => {
  fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2));
  return true;
});

// --- API 요청 ---

ipcMain.handle("api-request", async (event, { method, endpoint, body }) => {
  const config = loadConfig();
  const url = `${config.serverUrl}${endpoint}`;

  return new Promise((resolve, reject) => {
    const request = net.request({ method: method || "GET", url });
    request.setHeader("x-api-key", config.apiKey);
    request.setHeader("Content-Type", "application/json");

    let responseData = "";

    request.on("response", (response) => {
      response.on("data", (chunk) => {
        responseData += chunk.toString();
      });
      response.on("end", () => {
        try {
          resolve({ status: response.statusCode, data: JSON.parse(responseData) });
        } catch {
          resolve({ status: response.statusCode, data: responseData });
        }
      });
    });

    request.on("error", (err) => {
      resolve({ status: 0, data: { detail: "서버에 연결할 수 없습니다" } });
    });

    if (body) request.write(JSON.stringify(body));
    request.end();
  });
});

// --- 클립보드 ---

ipcMain.handle("copy-to-clipboard", (event, text) => {
  clipboard.writeText(text);
  setTimeout(() => {
    if (clipboard.readText() === text) clipboard.writeText("");
  }, 10000);
  return true;
});
