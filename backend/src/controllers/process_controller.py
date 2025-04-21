import sys  # Add this import at the top
from src.services import process_service
import psutil
from fastapi import HTTPException
import time
from fastapi import APIRouter

router = APIRouter()

def get_all_processes():
    return process_service.fetch_process_list()

def get_grouped_processes(incremental=True):
    """
    Get all processes grouped by application name and sorted by importance
    
    Args:
        incremental (bool): If True, use incremental updates for better performance
    
    Returns:
        dict: Dictionary with application names as keys and lists of sorted process info
    """
    return process_service.fetch_grouped_processes(incremental_update=incremental)

def set_process_priority(pid, priority_level):
    """
    Set the scheduling priority of a process
    
    Args:
        pid (int): Process ID
        priority_level (str): One of 'idle', 'below_normal', 'normal', 'above_normal', 'high', 'realtime'
    """
    priority_map = {
        'idle': 4,  # IDLE_PRIORITY_CLASS
        'below_normal': 8,  # BELOW_NORMAL_PRIORITY_CLASS
        'normal': 32,  # NORMAL_PRIORITY_CLASS
        'above_normal': 64,  # ABOVE_NORMAL_PRIORITY_CLASS
        'high': 128,  # HIGH_PRIORITY_CLASS
        'realtime': 256  # REALTIME_PRIORITY_CLASS
    }
    
    # Get Windows priority class value
    priority_value = priority_map.get(priority_level, psutil.NORMAL_PRIORITY_CLASS)
    
    try:
        process = psutil.Process(pid)
        
        # For Windows platform, use the Windows-specific method
        if sys.platform == 'win32':
            import win32process
            import win32api
            handle = win32api.OpenProcess(win32process.PROCESS_SET_INFORMATION, False, pid)
            win32process.SetPriorityClass(handle, priority_value)
            win32api.CloseHandle(handle)
        else:
            # Use nice() for non-Windows platforms
            process.nice(priority_value)
        
        return True
    except Exception as e:
        print(f"Error setting process priority: {str(e)}")
        return False

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

def terminate_process(pid):
    """
    Terminate a single process
    
    Args:
        pid (int): Process ID
        
    Returns:
        dict: Result of the termination attempt
    """
    success, error = process_service.end_process(pid)
    if success:
        return {"success": True, "message": f"Process {pid} terminated successfully"}
    else:
        return {"success": False, "message": error}

def terminate_process_tree(pid):
    """
    Terminate a process and all its child processes
    
    Args:
        pid (int): Process ID
        
    Returns:
        dict: Result of the termination attempt
    """
    success, error = process_service.end_process_tree(pid)
    if success:
        return {"success": True, "message": f"Process tree with root {pid} terminated successfully"}
    else:
        return {"success": False, "message": error}

def get_processes_metrics(pids):
    """
    Get current metrics for specific processes
    
    Args:
        pids: List of process IDs
    
    Returns:
        dict: Dictionary mapping PIDs to their current metrics
    """
    try:
        return process_service.fetch_process_metrics(pids)
    except Exception as e:
        # Properly handle errors to prevent 500 responses
        print(f"Error fetching process metrics: {e}")
        return {}

# Add this debug endpoint to help diagnose the issue
@router.get("/processes/{pid}/debug_priority")
def debug_process_priority(pid: int):
    """Debug endpoint to compare different priority values"""
    try:
        process = psutil.Process(pid)
        
        # Get nice() value
        nice_value = process.nice()
        
        # Get Windows priority class value
        windows_priority = process_service.get_windows_priority_class(process)
        
        # Get process name for reference
        name = process.name()
        
        return {
            "pid": pid,
            "name": name,
            "nice_value": nice_value,
            "windows_priority_class": windows_priority,
            "priority_name": process_service.get_priority_name(windows_priority),
        }
    except Exception as e:
        return {"error": str(e)}