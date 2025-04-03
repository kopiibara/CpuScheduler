import { app as a, BrowserWindow as p, Menu as u, ipcMain as l } from "electron";
import { fileURLToPath as w } from "node:url";
import o from "node:path";
import { spawn as g } from "child_process";
import b from "node:http";
const x = o.dirname(w(import.meta.url));
process.env.APP_ROOT = o.join(x, "..");
const c = process.env.VITE_DEV_SERVER_URL, S = o.join(process.env.APP_ROOT, "dist-electron"), f = o.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = c ? o.join(process.env.APP_ROOT, "public") : f;
let e, n = null, r = !1;
a.whenReady().then(() => {
  k();
});
function k() {
  const i = o.join(
    a.getAppPath(),
    "public",
    "backend_server.exe"
  );
  console.log(`Starting backend at: ${i}`);
  try {
    n = g(i, [], {
      detached: !1,
      stdio: "pipe",
      windowsHide: !0
    }), n && n.stdout && n.stdout.on("data", (t) => {
      console.log(`Backend stdout: ${t.toString().trim()}`);
    }), n && n.stderr && n.stderr.on("data", (t) => {
      console.error(`Backend stderr: ${t.toString().trim()}`);
    }), n && n.on("error", (t) => {
      console.error(`Failed to start backend: ${t.message}`), r || d(!1);
    }), m(0);
  } catch (t) {
    console.error(
      `Exception starting backend: ${t instanceof Error ? t.message : String(t)}`
    ), r || d(!1);
  }
}
function m(i) {
  let s = 100;
  if (i >= 30) {
    console.error("Backend health check failed after 30 attempts"), r || d(!1);
    return;
  }
  b.get("http://127.0.0.1:8000/health", (h) => {
    h.statusCode === 200 ? (console.log("Backend is healthy, creating window"), d(!0)) : (s = Math.min(s * 1.5, 2e3), setTimeout(() => m(i + 1), s));
  }).on("error", () => {
    s = Math.min(s * 1.5, 2e3), setTimeout(() => m(i + 1), s);
  });
}
function d(i = !1) {
  if (r) {
    console.log("Window already created, skipping");
    return;
  }
  if (r = !0, e = new p({
    icon: o.join(a.getAppPath(), "public", "cpuScheduler-icon.ico"),
    title: "CpuScheduler",
    // Set window title
    width: 1400,
    // Default width of the window
    height: 800,
    minWidth: 1200,
    // Minimum width of the window
    minHeight: 800,
    // Minimum height of the window
    resizable: !1,
    // Allow window resizing
    frame: !1,
    // Remove default window frame
    webPreferences: {
      preload: o.join(a.getAppPath(), "dist-electron", "preload.mjs"),
      nodeIntegration: !1,
      contextIsolation: !0
    }
  }), e.center(), u.setApplicationMenu(null), e.on("maximize", () => {
    e == null || e.webContents.send("window-state-changed", { isMaximized: !0 });
  }), e.on("unmaximize", () => {
    e == null || e.webContents.send("window-state-changed", { isMaximized: !1 });
  }), e.webContents.on("did-finish-load", () => {
    e == null || e.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString()), e == null || e.webContents.send("backend-ready", i);
  }), c)
    e.loadURL(c);
  else {
    const t = o.join(f, "index.html");
    e.loadFile(t), e.webContents.on("did-start-loading", () => {
      e == null || e.webContents.executeJavaScript(`
        window.BASE_URL = './';
      `);
    });
  }
}
l.on("window-minimize", () => {
  e && e.minimize();
});
l.on("window-maximize", () => {
  e && (e.isMaximized() ? e.unmaximize() : e.maximize());
});
l.on("window-close", () => {
  e && e.close();
});
l.handle("window-is-maximized", () => e ? e.isMaximized() : !1);
a.on("window-all-closed", () => {
  n && (console.log("Terminating backend process..."), n.kill(), n = null), process.platform !== "darwin" && (a.quit(), e = null);
});
a.on("activate", () => {
  p.getAllWindows().length === 0 && d();
});
export {
  S as MAIN_DIST,
  f as RENDERER_DIST,
  c as VITE_DEV_SERVER_URL
};
