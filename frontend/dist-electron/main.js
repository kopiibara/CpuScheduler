import { app, BrowserWindow, Menu, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawn } from "child_process";
import fs from "fs";
import http from "node:http";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
let backendProcess = null;
let windowCreated = false;
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log("Another instance is already running. Quitting...");
  app.quit();
} else {
  app.on("second-instance", () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  app.whenReady().then(() => {
    startBackendAndCreateWindow();
  });
}
function isBackendRunning() {
  return new Promise((resolve) => {
    http.get("http://127.0.0.1:8000/health", (res) => {
      if (res.statusCode === 200) {
        console.log("Backend is already running");
        resolve(true);
      } else {
        resolve(false);
      }
    }).on("error", () => {
      resolve(false);
    });
  });
}
async function startBackendAndCreateWindow() {
  let backendPath;
  if (await isBackendRunning()) {
    console.log("Backend already running, skipping start");
    createWindow(true);
    return;
  }
  if (VITE_DEV_SERVER_URL) {
    backendPath = path.join(
      process.env.APP_ROOT,
      "public",
      "backend_server.exe"
    );
  } else {
    backendPath = path.join(process.resourcesPath, "backend_server.exe");
  }
  console.log(`Checking if backend exists at: ${backendPath}`);
  if (!fs.existsSync(backendPath)) {
    console.error(`ERROR: Backend executable not found at ${backendPath}`);
    createWindow(false);
    return;
  }
  console.log(`Starting backend at: ${backendPath}`);
  try {
    backendProcess = spawn(backendPath, [], {
      detached: false,
      stdio: "pipe",
      // Changed from inherit to pipe
      windowsHide: true,
      // Hide console window
      cwd: path.dirname(backendPath)
      // Set working directory to the same folder as the exe
    });
    if (backendProcess && backendProcess.stdout) {
      backendProcess.stdout.on("data", (data) => {
        console.log(`Backend stdout: ${data.toString().trim()}`);
      });
    }
    if (backendProcess && backendProcess.stderr) {
      backendProcess.stderr.on("data", (data) => {
        console.error(`Backend stderr: ${data.toString().trim()}`);
      });
    }
    backendProcess.on("error", (err) => {
      console.error(`Failed to start backend: ${err.message}`);
      if (!windowCreated) {
        createWindow(false);
      }
    });
    checkBackendHealth(0);
  } catch (error) {
    console.error(
      `Exception starting backend: ${error instanceof Error ? error.message : String(error)}`
    );
    if (!windowCreated) {
      createWindow(false);
    }
  }
}
function checkBackendHealth(attempts) {
  const maxAttempts = 30;
  const initialDelay = 100;
  let currentDelay = initialDelay;
  if (attempts >= maxAttempts) {
    console.error(`Backend health check failed after ${maxAttempts} attempts`);
    if (!windowCreated) {
      createWindow(false);
    }
    return;
  }
  http.get("http://127.0.0.1:8000/health", (res) => {
    if (res.statusCode === 200) {
      console.log("Backend is healthy, creating window");
      createWindow(true);
    } else {
      currentDelay = Math.min(currentDelay * 1.5, 2e3);
      setTimeout(() => checkBackendHealth(attempts + 1), currentDelay);
    }
  }).on("error", () => {
    currentDelay = Math.min(currentDelay * 1.5, 2e3);
    setTimeout(() => checkBackendHealth(attempts + 1), currentDelay);
  });
}
function createWindow(backendReady = false) {
  if (windowCreated) {
    console.log("Window already created, skipping");
    return;
  }
  windowCreated = true;
  win = new BrowserWindow({
    icon: path.join(app.getAppPath(), "public", "cpuScheduler-icon.ico"),
    title: "CpuScheduler",
    width: 1400,
    height: 800,
    minWidth: 1200,
    minHeight: 800,
    resizable: false,
    frame: false,
    webPreferences: {
      preload: path.join(app.getAppPath(), "dist-electron", "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  win.center();
  Menu.setApplicationMenu(null);
  win.on("maximize", () => {
    win == null ? void 0 : win.webContents.send("window-state-changed", { isMaximized: true });
  });
  win.on("unmaximize", () => {
    win == null ? void 0 : win.webContents.send("window-state-changed", { isMaximized: false });
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
    win == null ? void 0 : win.webContents.send("backend-ready", backendReady);
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
ipcMain.on("window-minimize", () => {
  if (win) win.minimize();
});
ipcMain.on("window-maximize", () => {
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});
ipcMain.on("window-close", () => {
  if (win) win.close();
});
ipcMain.handle("window-is-maximized", () => {
  if (win) return win.isMaximized();
  return false;
});
app.on("window-all-closed", () => {
  if (backendProcess) {
    console.log("Terminating backend process...");
    backendProcess.kill();
    backendProcess = null;
  }
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.on("before-quit", () => {
  if (backendProcess) {
    console.log("Terminating backend process (before-quit)...");
    backendProcess.kill();
    backendProcess = null;
  }
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
