import sys  # Keep this import
from src.services import process_service
import psutil
from fastapi import HTTPException
import time
import traceback  # Add this for better error reporting
from fastapi import APIRouter

# Import Windows priority constants only if on Windows
if sys.platform == 'win32':
    import win32api
    import win32process
    import win32con  # Add this for checking admin rights
    
    # Use the actual Windows constants instead of hardcoded values
    PRIORITY_MAP = {
        'idle': win32process.IDLE_PRIORITY_CLASS,                # 64
        'below_normal': win32process.BELOW_NORMAL_PRIORITY_CLASS,  # 16384
        'normal': win32process.NORMAL_PRIORITY_CLASS,            # 32
        'above_normal': win32process.ABOVE_NORMAL_PRIORITY_CLASS,  # 32768
        'high': win32process.HIGH_PRIORITY_CLASS,                # 128
        'realtime': win32process.REALTIME_PRIORITY_CLASS         # 256
    }
    
    # Reverse map for debugging
    PRIORITY_NAME_MAP = {v: k for k, v in PRIORITY_MAP.items()}

def has_admin_rights():
    """Check if the application is running with administrator privileges"""
    if sys.platform == 'win32':
        try:
            return win32api.GetCurrentProcess().has_admin()
        except:
            return False
    return False

def get_windows_priority_class(process):
    """Safely get the Windows priority class"""
    if sys.platform != 'win32':
        return None
        
    try:
        # Use safer method to get priority
        import ctypes
        from ctypes import wintypes
        
        # Open process with minimal permissions
        handle = win32api.OpenProcess(
            win32con.PROCESS_QUERY_LIMITED_INFORMATION, 
            False, 
            process.pid
        )
        
        if not handle:
            return None
            
        # Get priority using direct Windows API
        value = ctypes.wintypes.DWORD()
        success = ctypes.windll.kernel32.GetPriorityClass(
            handle, 
            ctypes.byref(value)
        )
        win32api.CloseHandle(handle)
        
        if success:
            return value.value
            
        return None
    except Exception as e:
        print(f"Error getting priority class: {str(e)}")
        return None


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
    priority_value = PRIORITY_MAP.get(priority_level)
    
    if priority_value is None:
        print(f"Invalid priority level: {priority_level}")
        return {"success": False, "message": f"Invalid priority level: {priority_level}"}
    
    try:
  
        # Check if process exists
        if not psutil.pid_exists(pid):
            return {"success": False, "message": f"Process {pid} does not exist"}
        
        # For Windows platform, use the Windows-specific method
        if sys.platform == 'win32':
            handle = None
            try:
                handle = win32api.OpenProcess(win32con.PROCESS_SET_INFORMATION, False, pid)
                if not handle:
                    return {"success": False, "message": f"Failed to open process {pid}"}
                    
                win32process.SetPriorityClass(handle, priority_value)
                return {"success": True, "message": f"Priority set to {priority_level}"}
            except Exception as e:
                return {"success": False, "message": f"Error: {str(e)}"}
            finally:
                if handle:
                    win32api.CloseHandle(handle)
        else:
            # Use nice() for non-Windows platforms
            process = psutil.Process(pid)
            process.nice(priority_value)
            return {"success": True, "message": f"Priority set to {priority_level}"}
            
    except psutil.NoSuchProcess:
        return {"success": False, "message": f"Process {pid} no longer exists"}
    except psutil.AccessDenied:
        return {"success": False, "message": f"Access denied. Run as administrator to change process priority"}
    except Exception as e:
        print(f"Error setting process priority: {str(e)}")
        traceback.print_exc()
        return {"success": False, "message": f"Unexpected error: {str(e)}"}

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
        windows_priority = get_windows_priority_class(process)
        
        # Get process name for reference
        name = process.name()
        
        return {
            "pid": pid,
            "name": name,
            "nice_value": nice_value,
            "windows_priority_class": windows_priority,
            "priority_name": PRIORITY_NAME_MAP.get(windows_priority, "Unknown"),
        }
    except Exception as e:
        return {"error": str(e)}