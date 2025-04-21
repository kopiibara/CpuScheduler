from src.services.scheduling_service import fcfs_scheduler

def start_fcfs():
    """Start the FCFS scheduler"""
    return fcfs_scheduler.start()
    
def stop_fcfs():
    """Stop the FCFS scheduler"""
    return fcfs_scheduler.stop()
    
def add_process_to_fcfs(pid):
    """Add a process to the FCFS queue"""
    return fcfs_scheduler.add_process(pid)
    
def add_app_processes_to_fcfs(pids):
    """Add all processes of an application to the FCFS queue"""
    return fcfs_scheduler.add_application_processes(pids)
    
def get_fcfs_status():
    """Get the current status of the FCFS scheduler"""
    return fcfs_scheduler.get_status()

def get_fcfs_detailed_status():
    """Get detailed status of the FCFS scheduler"""
    return fcfs_scheduler.get_detailed_status()