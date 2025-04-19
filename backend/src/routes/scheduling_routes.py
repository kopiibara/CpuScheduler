from fastapi import APIRouter, Body
from src.controllers import scheduling_controller

router = APIRouter()

@router.post("/scheduler/fcfs/start")
def start_fcfs():
    """Start the First-Come-First-Serve scheduler"""
    result = scheduling_controller.start_fcfs()
    return {"success": result, "message": "FCFS scheduler started" if result else "FCFS scheduler already running"}

@router.post("/scheduler/fcfs/stop")
def stop_fcfs():
    """Stop the First-Come-First-Serve scheduler"""
    result = scheduling_controller.stop_fcfs()
    return {"success": result, "message": "FCFS scheduler stopped" if result else "FCFS scheduler not running"}

@router.post("/scheduler/fcfs/add_process")
def add_process_to_fcfs(data: dict = Body(...)):
    """Add a process to the FCFS queue"""
    pid = data.get("pid")
    if not pid:
        return {"success": False, "message": "No PID provided"}, 400
        
    result = scheduling_controller.add_process_to_fcfs(pid)
    return {"success": result, "message": f"Process {pid} added to FCFS queue" if result else f"Failed to add process {pid}"}

@router.post("/scheduler/fcfs/add_app_processes")
def add_app_processes_to_fcfs(data: dict = Body(...)):
    """Add all processes of an application to the FCFS queue"""
    pids = data.get("pids", [])
    if not pids:
        return {"success": False, "message": "No PIDs provided"}, 400
        
    result = scheduling_controller.add_app_processes_to_fcfs(pids)
    return {"success": result, "message": f"Added {len(pids)} processes to FCFS queue"}

@router.get("/scheduler/fcfs/status")
def get_fcfs_status():
    """Get the current status of the FCFS scheduler"""
    return scheduling_controller.get_fcfs_status()