from typing import Dict, List, Any
import psutil

class BaseSchedulingService:
    def __init__(self):
        # Get the actual number of CPU cores from the system
        self.cpu_cores = max(1, psutil.cpu_count(logical=False) or 1)
    
    def _calculate_metrics(self, processes, timeline, cpu_core=0):
        """Calculate waiting time, turnaround time, etc. for each process"""
        process_results = []
        
        # Create a map of process ID to start/end times from timeline
        process_times = {}
        for process_interval in timeline["processes"]:
            process_id = process_interval["id"]
            
            # A process may appear multiple times in the timeline (e.g., in Round Robin)
            if process_id not in process_times:
                process_times[process_id] = {
                    "first_start": process_interval["start_time"],
                    "last_end": process_interval["end_time"]
                }
            else:
                if process_interval["start_time"] < process_times[process_id]["first_start"]:
                    process_times[process_id]["first_start"] = process_interval["start_time"]
                if process_interval["end_time"] > process_times[process_id]["last_end"]:
                    process_times[process_id]["last_end"] = process_interval["end_time"]
        
        # Calculate metrics for each process
        for process in processes:
            process_id = process["id"]
            if process_id in process_times:
                arrival_time = process["arrival_time"]
                burst_time = process["burst_time"]
                completion_time = process_times[process_id]["last_end"]
                
                # Turnaround time = completion time - arrival time
                turnaround_time = completion_time - arrival_time
                
                # Response time = first time CPU - arrival time
                response_time = process_times[process_id]["first_start"] - arrival_time
                
                # Waiting time = turnaround time - burst time
                waiting_time = turnaround_time - burst_time
                
                process_results.append({
                    "id": process_id,
                    "arrival_time": arrival_time,
                    "burst_time": burst_time,
                    "completion_time": completion_time,
                    "turnaround_time": turnaround_time,
                    "response_time": response_time,
                    "waiting_time": waiting_time,
                    "cpu_core": cpu_core,
                    "start_time": process_times[process_id]["first_start"],
                    "end_time": process_times[process_id]["last_end"]
                })
        
        return process_results

    def _calculate_average_metrics(self, process_results):
        """Calculate average metrics across all processes"""
        if not process_results:
            return {
                "avg_turnaround_time": 0,
                "avg_response_time": 0,
                "avg_waiting_time": 0
            }
        
        total_turnaround = sum(p["turnaround_time"] for p in process_results)
        total_response = sum(p["response_time"] for p in process_results)
        total_waiting = sum(p["waiting_time"] for p in process_results)
        count = len(process_results)
        
        return {
            "avg_turnaround_time": total_turnaround / count,
            "avg_response_time": total_response / count,
            "avg_waiting_time": total_waiting / count
        } 