from src.services import process_service
import psutil
from fastapi import HTTPException
import time

def get_all_processes():
    return process_service.fetch_process_list()

def get_grouped_processes():
    """
    Get all processes grouped by application name and sorted by importance
    
    Returns:
        dict: Dictionary with application names as keys and lists of sorted process info
    """
    return process_service.fetch_grouped_processes()

def set_process_priority(pid, priority_level):
    """
    Set the scheduling priority of a process
    
    Args:
        pid (int): Process ID
        priority_level (str): One of 'idle', 'below_normal', 'normal', 'above_normal', 'high', 'realtime'
    """
    priority_map = {
        'idle': psutil.IDLE_PRIORITY_CLASS,
        'below_normal': psutil.BELOW_NORMAL_PRIORITY_CLASS,
        'normal': psutil.NORMAL_PRIORITY_CLASS,
        'above_normal': psutil.ABOVE_NORMAL_PRIORITY_CLASS,
        'high': psutil.HIGH_PRIORITY_CLASS,
        'realtime': psutil.REALTIME_PRIORITY_CLASS
    }
    
    return process_service.set_process_priority(pid, priority_map.get(priority_level, psutil.NORMAL_PRIORITY_CLASS))

def set_process_affinity(pid, cores):
    """
    Set which CPU cores a process can run on
    
    Args:
        pid (int): Process ID
        cores (list): List of core indices
    """
    return process_service.set_process_affinity(pid, cores)

def get_process_performance(pid: int):
    try:
        # Get the process by PID
        process = psutil.Process(pid)
        
        # Get current timestamp
        timestamp = time.time()
        
        # Get memory usage
        memory_percent = process.memory_percent()
        
        # Get CPU usage (overall and per core)
        cpu_percent = process.cpu_percent(interval=0.1)
        
        # Get CPU usage per core
        cpu_per_core = []
        if hasattr(process, 'cpu_num'):
            # Get the CPU this process is running on
            try:
                cpu_num = process.cpu_num()
                # Calculate per-core usage based on CPU affinity
                cpu_affinity = process.cpu_affinity()
                per_core_percent = psutil.cpu_percent(interval=0.1, percpu=True)
                cpu_per_core = [per_core_percent[i] if i in cpu_affinity else 0 for i in range(len(per_core_percent))]
            except:
                # Fallback to overall CPU percentage
                cpu_per_core = [0] * psutil.cpu_count()
        
        return {
            "timestamp": timestamp,
            "memory_percent": memory_percent,
            "cpu_percent": cpu_percent,
            "cpu_per_core": cpu_per_core
        }
    except psutil.NoSuchProcess:
        raise HTTPException(status_code=404, detail=f"Process with PID {pid} not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))