import { app, BrowserWindow, Menu, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { ChildProcess, spawn } from "child_process";
import fs from "fs";
import http from "node:http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, "..");

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;
let backendProcess: ChildProcess | null = null;
let windowCreated = false; // Prevent multiple windows

// Ensure single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log("Another instance is already running. Quitting...");
  app.quit();
} else {
  app.on("second-instance", () => {
    // Someone tried to run a second instance, focus our window instead
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  // Main entry point
  app.whenReady().then(() => {
    startBackendAndCreateWindow();
  });
}

function isBackendRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    http
      .get("http://127.0.0.1:8000/health", (res) => {
        if (res.statusCode === 200) {
          console.log("Backend is already running");
          resolve(true);
        } else {
          resolve(false);
        }
      })
      .on("error", () => {
        resolve(false);
      });
  });
}

async function startBackendAndCreateWindow() {
  let backendPath: string;

  // Check if backend is already running
  if (await isBackendRunning()) {
    console.log("Backend already running, skipping start");
    createWindow(true);
    return;
  }

  if (VITE_DEV_SERVER_URL) {
    // Development mode - use path in public folder
    backendPath = path.join(
      process.env.APP_ROOT,
      "public",
      "backend_server.exe"
    );
  } else {
    // Production mode - use path in resources
    backendPath = path.join(process.resourcesPath, "backend_server.exe");
  }

  console.log(`Checking if backend exists at: ${backendPath}`);

  if (!fs.existsSync(backendPath)) {
    console.error(`ERROR: Backend executable not found at ${backendPath}`);
    createWindow(false); // Create window anyway with fallback UI
    return;
  }

  console.log(`Starting backend at: ${backendPath}`);

  try {
    // Use more compatible spawn settings
    backendProcess = spawn(backendPath, [], {
      detached: false,
      stdio: "pipe", // Changed from inherit to pipe
      windowsHide: true, // Hide console window
      cwd: path.dirname(backendPath), // Set working directory to the same folder as the exe
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
        createWindow(false); // Create window anyway with fallback UI
      }
    });

    // Check if backend is ready
    checkBackendHealth(0);
  } catch (error) {
    console.error(
      `Exception starting backend: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    if (!windowCreated) {
      createWindow(false); // Create window anyway
    }
  }
}

// Use exponential backoff for health checks
function checkBackendHealth(attempts: number) {
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

  http
    .get("http://127.0.0.1:8000/health", (res) => {
      if (res.statusCode === 200) {
        console.log("Backend is healthy, creating window");
        createWindow(true);
      } else {
        currentDelay = Math.min(currentDelay * 1.5, 2000);
        setTimeout(() => checkBackendHealth(attempts + 1), currentDelay);
      }
    })
    .on("error", () => {
      currentDelay = Math.min(currentDelay * 1.5, 2000);
      setTimeout(() => checkBackendHealth(attempts + 1), currentDelay);
    });
}

function createWindow(backendReady: boolean = false) {
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
      contextIsolation: true,
    },
  });

  // Center the window
  win.center();

  // Remove the application menu bar
  Menu.setApplicationMenu(null);

  win.on("maximize", () => {
    win?.webContents.send("window-state-changed", { isMaximized: true });
  });

  win.on("unmaximize", () => {
    win?.webContents.send("window-state-changed", { isMaximized: false });
  });

  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
    win?.webContents.send("backend-ready", backendReady);
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

// Keep your existing IPC handlers
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
