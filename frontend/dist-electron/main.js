import { app as r, BrowserWindow as f, Menu as h, ipcMain as d } from "electron";
import { fileURLToPath as w } from "node:url";
import o from "node:path";
import { spawn as g } from "child_process";
import b from "fs";
import k from "node:http";
const x = o.dirname(w(import.meta.url));
process.env.APP_ROOT = o.join(x, "..");
const c = process.env.VITE_DEV_SERVER_URL, C = o.join(process.env.APP_ROOT, "dist-electron"), p = o.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = c ? o.join(process.env.APP_ROOT, "public") : p;
let e, t = null, l = !1;
r.whenReady().then(() => {
  R();
});
function R() {
  let n;
  if (c ? n = o.join(
    process.env.APP_ROOT,
    "public",
    "backend_server.exe"
  ) : n = o.join(process.resourcesPath, "backend_server.exe"), console.log(`Checking if backend exists at: ${n}`), !b.existsSync(n)) {
    console.error(`ERROR: Backend executable not found at ${n}`), a(!1);
    return;
  }
  console.log(`Starting backend at: ${n}`);
  try {
    t = g(n, [], {
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
      console.error(`Failed to start backend: ${i.message}`), l || a(!1);
    }), m(0);
  } catch (i) {
    console.error(
      `Exception starting backend: ${i instanceof Error ? i.message : String(i)}`
    ), l || a(!1);
  }
}
function m(n) {
  let s = 100;
  if (n >= 30) {
    console.error("Backend health check failed after 30 attempts"), l || a(!1);
    return;
  }
  k.get("http://127.0.0.1:8000/health", (u) => {
    u.statusCode === 200 ? (console.log("Backend is healthy, creating window"), a(!0)) : (s = Math.min(s * 1.5, 2e3), setTimeout(() => m(n + 1), s));
  }).on("error", () => {
    s = Math.min(s * 1.5, 2e3), setTimeout(() => m(n + 1), s);
  });
}
function a(n = !1) {
  if (l) {
    console.log("Window already created, skipping");
    return;
  }
  l = !0, e = new f({
    icon: o.join(r.getAppPath(), "public", "cpuScheduler-icon.ico"),
    title: "CpuScheduler",
    width: 1400,
    height: 800,
    minWidth: 1200,
    minHeight: 800,
    resizable: !1,
    frame: !1,
    webPreferences: {
      preload: o.join(r.getAppPath(), "dist-electron", "preload.mjs"),
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
r.on("window-all-closed", () => {
  t && (console.log("Terminating backend process..."), t.kill(), t = null), process.platform !== "darwin" && (r.quit(), e = null);
});
r.on("activate", () => {
  f.getAllWindows().length === 0 && a();
});
r.on("before-quit", () => {
  t && (console.log("Terminating backend process (before-quit)..."), t.kill(), t = null);
});
export {
  C as MAIN_DIST,
  p as RENDERER_DIST,
  c as VITE_DEV_SERVER_URL
};
