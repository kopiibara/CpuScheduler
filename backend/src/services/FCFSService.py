from typing import Dict, List, Any
from .BaseSchedulingService import BaseSchedulingService

class FCFSService(BaseSchedulingService):
    def schedule(self, processes: List[Dict[str, Any]]) -> Dict[str, Any]:
        """First Come First Serve scheduling algorithm with multi-core support"""
        # Sort processes by arrival time
        sorted_processes = sorted(processes, key=lambda p: p['arrival_time'])
        
        # Initialize timelines for all CPU cores
        timelines = {str(i): {"processes": []} for i in range(self.cpu_cores)}
        core_times = {str(i): 0 for i in range(self.cpu_cores)}
        process_results = []
        
        for process in sorted_processes:
            # Find the core with earliest available time
            available_core = min(core_times, key=core_times.get)
            
            # If there's a gap due to arrival time, adjust core time
            if process["arrival_time"] > core_times[available_core]:
                core_times[available_core] = process["arrival_time"]
                
            # Add process to timeline for this core
            timelines[available_core]["processes"].append({
                "id": process["id"],
                "start_time": core_times[available_core],
                "end_time": core_times[available_core] + process["burst_time"]
            })
            
            # Update core time
            core_times[available_core] += process["burst_time"]
        
        # Calculate metrics for each process
        for core_id, timeline in timelines.items():
            process_results.extend(self._calculate_metrics(sorted_processes, timeline, int(core_id)))
        
        return {
            "timeline": timelines,
            "process_results": process_results,
            "metrics": self._calculate_average_metrics(process_results)
        } 