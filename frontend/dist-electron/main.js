import { app, BrowserWindow, Menu, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawn } from "child_process";
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
app.whenReady().then(() => {
  startBackendAndCreateWindow();
});
function startBackendAndCreateWindow() {
  const backendPath = path.join(
    app.getAppPath(),
    "public",
    "backend_server.exe"
  );
  console.log(`Starting backend at: ${backendPath}`);
  try {
    backendProcess = spawn(backendPath, [], {
      detached: false,
      stdio: "pipe",
      windowsHide: true
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
    if (backendProcess) {
      backendProcess.on("error", (err) => {
        console.error(`Failed to start backend: ${err.message}`);
        if (!windowCreated) {
          createWindow(false);
        }
      });
    }
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
    // Set window title
    width: 1400,
    // Default width of the window
    height: 800,
    minWidth: 1200,
    // Minimum width of the window
    minHeight: 800,
    // Minimum height of the window
    resizable: false,
    // Allow window resizing
    frame: false,
    // Remove default window frame
    webPreferences: {
      preload: path.join(app.getAppPath(), "dist-electron", "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  win.center();
  win.webContents.openDevTools();
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
    const indexPath = path.join(RENDERER_DIST, "index.html");
    win.loadFile(indexPath);
    win.webContents.on("did-start-loading", () => {
      win == null ? void 0 : win.webContents.executeJavaScript(`
        window.BASE_URL = './';
      `);
    });
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
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
