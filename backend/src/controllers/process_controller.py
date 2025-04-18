from src.services import process_service
import psutil

def get_all_processes():
    return process_service.fetch_process_list()

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


