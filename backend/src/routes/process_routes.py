from fastapi import APIRouter, Body
from src.controllers import process_controller
from typing import List
import psutil

router = APIRouter()

@router.get("/processes")
def get_all_processes():
    return process_controller.get_all_processes()

@router.get("/processes/grouped")
def get_grouped_processes():
    """
    Get all processes grouped by application name and sorted by importance
    
    Returns:
        dict: Dictionary with application names as keys and lists of sorted process info
    """
    return process_controller.get_grouped_processes()

@router.post("/processes/{pid}/priority")
def set_process_priority(pid: int, data: dict = Body(...)):
    """
    Set the priority for a specific process
    """
    try:
        priority_level = data.get("priority", "normal")
        result = process_controller.set_process_priority(pid, priority_level)
        
        if result:
            return {"success": True, "message": f"Priority for process {pid} set to {priority_level}"}
        else:
            return {"success": False, "message": "Failed to set process priority"}, 400
    except Exception as e:
        print(f"Error in priority endpoint: {str(e)}")
        return {"success": False, "message": str(e)}, 500

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

@router.post("/processes/metrics")
def get_processes_metrics(data: dict = Body(...)):
    """
    Get updated CPU and memory metrics for specific processes
    
    Args:
        data: Dictionary with "pids" key containing list of process IDs
    """
    pids = data.get("pids", [])
    return process_controller.get_processes_metrics(pids)

@router.get("/{pid}/performance")
def get_process_performance(pid: int):
    """
    Get real-time performance metrics for a specific process.
    
    Returns:
        dict: Contains timestamp, memory usage percentage, CPU usage percentage,
              and per-core CPU usage data
    """
    return process_controller.get_process_performance(pid)

@router.delete("/processes/{pid}")
def terminate_process(pid: int):
    """
    Terminate a single process
    
    Args:
        pid (int): Process ID to terminate
    """
    return process_controller.terminate_process(pid)

@router.delete("/processes/{pid}/tree")
def terminate_process_tree(pid: int):
    """
    Terminate a process and all its child processes
    
    Args:
        pid (int): Process ID of the root process to terminate
    """
    return process_controller.terminate_process_tree(pid)