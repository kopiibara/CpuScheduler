import { app as s, BrowserWindow as m, Menu as h, ipcMain as d } from "electron";
import { fileURLToPath as w } from "node:url";
import o from "node:path";
import { spawn as k } from "child_process";
import b from "fs";
import u from "node:http";
const x = o.dirname(w(import.meta.url));
process.env.APP_ROOT = o.join(x, "..");
const c = process.env.VITE_DEV_SERVER_URL, C = o.join(process.env.APP_ROOT, "dist-electron"), p = o.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = c ? o.join(process.env.APP_ROOT, "public") : p;
let e, t = null, l = !1;
const R = s.requestSingleInstanceLock();
R ? (s.on("second-instance", () => {
  e && (e.isMinimized() && e.restore(), e.focus());
}), s.whenReady().then(() => {
  _();
})) : (console.log("Another instance is already running. Quitting..."), s.quit());
function P() {
  return new Promise((n) => {
    u.get("http://127.0.0.1:8000/health", (i) => {
      i.statusCode === 200 ? (console.log("Backend is already running"), n(!0)) : n(!1);
    }).on("error", () => {
      n(!1);
    });
  });
}
async function _() {
  let n;
  if (await P()) {
    console.log("Backend already running, skipping start"), r(!0);
    return;
  }
  if (c ? n = o.join(
    process.env.APP_ROOT,
    "public",
    "backend_server.exe"
  ) : n = o.join(process.resourcesPath, "backend_server.exe"), console.log(`Checking if backend exists at: ${n}`), !b.existsSync(n)) {
    console.error(`ERROR: Backend executable not found at ${n}`), r(!1);
    return;
  }
  console.log(`Starting backend at: ${n}`);
  try {
    t = k(n, [], {
      detached: !1,
      stdio: "pipe",
      // Changed from inherit to pipe
      windowsHide: !0,
      // Hide console window
      cwd: o.dirname(n)
      // Set working directory to the same folder as the exe
    }), t && t.stdout && t.stdout.on("data", (i) => {
      console.log(`Backend stdout: ${i.toString().trim()}`);
    }), t && t.stderr && t.stderr.on("data", (i) => {
      console.error(`Backend stderr: ${i.toString().trim()}`);
    }), t.on("error", (i) => {
      console.error(`Failed to start backend: ${i.message}`), l || r(!1);
    }), f(0);
  } catch (i) {
    console.error(
      `Exception starting backend: ${i instanceof Error ? i.message : String(i)}`
    ), l || r(!1);
  }
}
function f(n) {
  let a = 100;
  if (n >= 30) {
    console.error("Backend health check failed after 30 attempts"), l || r(!1);
    return;
  }
  u.get("http://127.0.0.1:8000/health", (g) => {
    g.statusCode === 200 ? (console.log("Backend is healthy, creating window"), r(!0)) : (a = Math.min(a * 1.5, 2e3), setTimeout(() => f(n + 1), a));
  }).on("error", () => {
    a = Math.min(a * 1.5, 2e3), setTimeout(() => f(n + 1), a);
  });
}
function r(n = !1) {
  if (l) {
    console.log("Window already created, skipping");
    return;
  }
  l = !0, e = new m({
    icon: o.join(s.getAppPath(), "public", "cpuScheduler-icon.ico"),
    title: "CpuScheduler",
    width: 1400,
    height: 800,
    minWidth: 1200,
    minHeight: 800,
    resizable: !1,
    frame: !1,
    webPreferences: {
      preload: o.join(s.getAppPath(), "dist-electron", "preload.mjs"),
      nodeIntegration: !1,
      contextIsolation: !0
    }
  }), e.center(), h.setApplicationMenu(null), e.on("maximize", () => {
    e == null || e.webContents.send("window-state-changed", { isMaximized: !0 });
  }), e.on("unmaximize", () => {
    e == null || e.webContents.send("window-state-changed", { isMaximized: !1 });
  }), e.webContents.on("did-finish-load", () => {
    e == null || e.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString()), e == null || e.webContents.send("backend-ready", n);
  }), c ? e.loadURL(c) : e.loadFile(o.join(p, "index.html"));
}
d.on("window-minimize", () => {
  e && e.minimize();
});
d.on("window-maximize", () => {
  e && (e.isMaximized() ? e.unmaximize() : e.maximize());
});
d.on("window-close", () => {
  e && e.close();
});
d.handle("window-is-maximized", () => e ? e.isMaximized() : !1);
s.on("window-all-closed", () => {
  t && (console.log("Terminating backend process..."), t.kill(), t = null), process.platform !== "darwin" && (s.quit(), e = null);
});
s.on("activate", () => {
  m.getAllWindows().length === 0 && r();
});
s.on("before-quit", () => {
  t && (console.log("Terminating backend process (before-quit)..."), t.kill(), t = null);
});
export {
  C as MAIN_DIST,
  p as RENDERER_DIST,
  c as VITE_DEV_SERVER_URL
};
