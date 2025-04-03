import { app, BrowserWindow, Menu, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { ChildProcess, spawn } from "child_process"; // Import spawn here
import http from "node:http"; // Import http module for health checks

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
process.env.APP_ROOT = path.join(__dirname, "..");

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;
let backendProcess: ChildProcess | null = null;

// Add a flag to prevent multiple windows
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
    // Using spawn instead of exec gives better control
    backendProcess = spawn(backendPath, [], {
      detached: false,
      stdio: "pipe",
      windowsHide: true,
    });

    if (backendProcess && backendProcess.stdout) {
      // Log all output for better debugging
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
        // Only create window if not already created
        if (!windowCreated) {
          createWindow(false); // Create window anyway with fallback UI
        }
      });
    }

    // Check if backend is ready
    checkBackendHealth(0);
  } catch (error) {
    console.error(
      `Exception starting backend: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    // Only create window if not already created
    if (!windowCreated) {
      createWindow(false); // Create window anyway
    }
  }
}

// Update checkBackendHealth to create window after maximum attempts
function checkBackendHealth(attempts: number) {
  const maxAttempts = 30;
  const initialDelay = 100;
  let currentDelay = initialDelay;

  if (attempts >= maxAttempts) {
    console.error(`Backend health check failed after ${maxAttempts} attempts`);
    // Only create window if not already created
    if (!windowCreated) {
      createWindow(false); // Pass false to indicate backend isn't ready
    }
    return;
  }

  http
    .get("http://127.0.0.1:8000/health", (res) => {
      if (res.statusCode === 200) {
        console.log("Backend is healthy, creating window");
        createWindow(true); // Backend is ready
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

// Update createWindow to accept backend status
function createWindow(backendReady: boolean = false) {
  // Don't create a window if one already exists
  if (windowCreated) {
    console.log("Window already created, skipping");
    return;
  }

  windowCreated = true;

  // Create the main window with initial settings
  win = new BrowserWindow({
    icon: path.join(app.getAppPath(), "public", "cpuScheduler-icon.ico"),
    title: "CpuScheduler", // Set window title
    width: 1400, // Default width of the window
    height: 800,
    minWidth: 1200, // Minimum width of the window
    minHeight: 800, // Minimum height of the window
    resizable: false, // Allow window resizing
    frame: false, // Remove default window frame
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

  // Listen for window maximize/unmaximize events
  win.on("maximize", () => {
    win?.webContents.send("window-state-changed", { isMaximized: true });
  });

  win.on("unmaximize", () => {
    win?.webContents.send("window-state-changed", { isMaximized: false });
  });

  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
    win?.webContents.send("backend-ready", backendReady); // Send actual status
  });

  // If VITE_DEV_SERVER_URL is set, load from the dev server
  if (VITE_DEV_SERVER_URL) {
    // In development, load from the Vite dev server
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // In production, load from the dist folder
    // Use file URL protocol format to avoid routing issues
    const indexPath = path.join(RENDERER_DIST, "index.html");
    win.loadFile(indexPath);

    // Add this to ensure proper base URL
    win.webContents.on("did-start-loading", () => {
      win?.webContents.executeJavaScript(`
        window.BASE_URL = './';
      `);
    });
  }
}

// Set up IPC handlers for window controls
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

// Quit when all windows are closed, except on macOS.
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
