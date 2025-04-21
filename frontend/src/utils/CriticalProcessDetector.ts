export const criticalProcessPatterns = [
  // Browsers (highly multithreaded)
  { pattern: /chrome\.exe$/i, displayName: "Google Chrome" },
  { pattern: /msedge\.exe$/i, displayName: "Microsoft Edge" },
  { pattern: /firefox\.exe$/i, displayName: "Mozilla Firefox" },

  // Development tools
  { pattern: /code\.exe$/i, displayName: "Visual Studio Code" },
  { pattern: /devenv\.exe$/i, displayName: "Visual Studio" },
  { pattern: /node\.exe$/i, displayName: "Node.js" },

  // Media applications
  { pattern: /premiere\.exe$/i, displayName: "Adobe Premiere" },
  { pattern: /afterfx\.exe$/i, displayName: "Adobe After Effects" },
  { pattern: /blender\.exe$/i, displayName: "Blender" },

  // Games and game engines
  { pattern: /unreal/i, displayName: "Unreal Engine" },
  { pattern: /unity/i, displayName: "Unity" },
];

export function isCriticalMultithreadedProcess(process: any): boolean {
  // Check based on name patterns
  if (process.exe) {
    for (const entry of criticalProcessPatterns) {
      if (entry.pattern.test(process.exe)) {
        return true;
      }
    }
  }

  // Also check based on CPU usage history
  // A process consistently using >100% CPU is likely multithreaded
  if (process.cpu_percent && process.cpu_percent > 100) {
    return true;
  }

  return false;
}
