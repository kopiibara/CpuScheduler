import os
import platform
import psutil  # You'll need to install this: pip install psutil

class SystemInfo:
    def __init__(self, cores, architecture, platform_name, total_memory, free_memory, cpu_model, cpu_speed, load_average):
        self.cores = cores
        self.architecture = architecture
        self.platform = platform_name
        self.totalMemory = total_memory
        self.freeMemory = free_memory
        self.cpuModel = cpu_model
        self.cpuSpeed = cpu_speed
        self.loadAverage = load_average

class SystemInfoService:
    @staticmethod
    def get_system_info():
        try:
            cpu_info = platform.processor() or "Unknown CPU"
            
            return SystemInfo(
                cores=os.cpu_count() or 1,
                architecture=platform.machine(),
                platform_name=platform.system(),
                total_memory=psutil.virtual_memory().total,
                free_memory=psutil.virtual_memory().available,
                cpu_model=cpu_info,
                cpu_speed=psutil.cpu_freq().current if psutil.cpu_freq() else 0,
                load_average=psutil.getloadavg() if hasattr(psutil, 'getloadavg') else [0, 0, 0]
            )
        except Exception as e:
            print(f"Error getting system info: {e}")
            # Return fallback values
            return SystemInfo(1, "unknown", "unknown", 0, 0, "unknown", 0, [0, 0, 0])