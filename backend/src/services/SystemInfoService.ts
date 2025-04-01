import os from "os";

export interface SystemInfo {
  cores: number;
  architecture: string;
  platform: string;
  totalMemory: number;
  freeMemory: number;
  cpuModel: string;
  cpuSpeed: number;
  loadAverage: number[];
}

export class SystemInfoService {
  public static getSystemInfo(): SystemInfo {
    return {
      cores: os.cpus().length,
      architecture: os.arch(),
      platform: os.platform(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpuModel: os.cpus()[0].model,
      cpuSpeed: os.cpus()[0].speed,
      loadAverage: os.loadavg(),
    };
  }
}
