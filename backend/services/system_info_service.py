import os
import psutil
import platform

class SystemInfoService:
    @staticmethod
    def get_system_info():
        cpu_info = psutil.cpu_freq()
        return {
            'cores': psutil.cpu_count(logical=False),  # Physical cores only
            'logical_cores': psutil.cpu_count(),  # Including hyperthreading
            'architecture': platform.machine(),
            'platform': platform.system(),
            'total_memory': psutil.virtual_memory().total,
            'free_memory': psutil.virtual_memory().available,
            'cpu_model': platform.processor(),
            'cpu_speed': cpu_info.current if cpu_info else None,
            'load_average': psutil.getloadavg()
        } 