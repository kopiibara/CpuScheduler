from fastapi import APIRouter, Body
from src.controllers import process_controller
from typing import List

router = APIRouter()

@router.get("/processes")
def get_all_processes():
    return process_controller.get_all_processes()

@router.post("/processes/{pid}/priority")
def set_process_priority(pid: int, data: dict = Body(...)):
    """
    Set the priority for a specific process
    
    Args:
        pid: The process ID
        data: Dictionary containing the priority level
              {"priority": "idle"|"below_normal"|"normal"|"above_normal"|"high"|"realtime"}
    """
    priority_level = data.get("priority", "normal")
    result = process_controller.set_process_priority(pid, priority_level)
    return {"success": result, "message": f"Priority for process {pid} set to {priority_level}"}

@router.post("/processes/{pid}/affinity")
def set_process_affinity(pid: int, data: dict = Body(...)):
    """
    Set the CPU affinity for a specific process
    
    Args:
        pid: The process ID
        data: Dictionary containing the CPU cores list
              {"cores": [0, 1, 2, ...]}
    """
    cores = data.get("cores", [])
    result = process_controller.set_process_affinity(pid, cores)
    return {"success": result, "message": f"CPU affinity for process {pid} set to cores {cores}"}