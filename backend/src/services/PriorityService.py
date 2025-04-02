from typing import Dict, List, Any
from .BaseSchedulingService import BaseSchedulingService

class PriorityService(BaseSchedulingService):
    def schedule(self, processes: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Priority scheduling algorithm with multi-core support"""
        # Create a copy of the processes to avoid modifying the original
        processes_copy = [p.copy() for p in processes]
        
        # Sort initially by arrival time
        processes_copy.sort(key=lambda p: p['arrival_time'])
        
        # Initialize timelines for all CPU cores
        timelines = {str(i): {"processes": []} for i in range(self.cpu_cores)}
        core_times = {str(i): 0 for i in range(self.cpu_cores)}
        
        completed = []
        
        # Continue until all processes are completed
        while len(completed) < len(processes):
            # For each core, check if it can process something
            for core_id in range(self.cpu_cores):
                core_id_str = str(core_id)
                current_time = core_times[core_id_str]
                
                # Find processes that have arrived by this core's current time
                ready_queue = [p for p in processes_copy if p['arrival_time'] <= current_time and 
                               p not in completed]
                
                if ready_queue:
                    # Sort ready queue by priority (lower number = higher priority)
                    ready_queue.sort(key=lambda p: p['priority'])
                    
                    # Get the highest priority process
                    process = ready_queue[0]
                    processes_copy.remove(process)
                    
                    # Add to timeline
                    timelines[core_id_str]["processes"].append({
                        "id": process["id"],
                        "start_time": current_time,
                        "end_time": current_time + process["burst_time"]
                    })
                    
                    # Update current time for this core
                    core_times[core_id_str] += process["burst_time"]
                    completed.append(process)
                elif processes_copy and all(p in completed for p in processes_copy):
                    # All processes accounted for
                    break
                else:
                    # Find next arrival time for this core
                    remaining = [p for p in processes_copy if p not in completed]
                    if remaining:
                        next_arrival = min(p['arrival_time'] for p in remaining)
                        core_times[core_id_str] = max(core_times[core_id_str], next_arrival)
            
            # If we've processed all processes, break the loop
            if len(completed) == len(processes):
                break
        
        # Calculate metrics for each process
        process_results = []
        for core_id, timeline in timelines.items():
            process_results.extend(self._calculate_metrics(processes, timeline, int(core_id)))
        
        return {
            "timeline": timelines,
            "process_results": process_results,
            "metrics": self._calculate_average_metrics(process_results)
        } 