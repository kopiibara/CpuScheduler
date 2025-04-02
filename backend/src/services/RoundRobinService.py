from typing import Dict, List, Any
from .BaseSchedulingService import BaseSchedulingService

class RoundRobinService(BaseSchedulingService):
    def schedule(self, processes: List[Dict[str, Any]], time_quantum: int) -> Dict[str, Any]:
        """Round Robin scheduling algorithm with multi-core support"""
        # Create a copy of processes and add remaining_time field
        processes_copy = [p.copy() for p in processes]
        for p in processes_copy:
            p['remaining_time'] = p['burst_time']
        
        # Sort by arrival time
        processes_copy.sort(key=lambda p: p['arrival_time'])
        
        # Initialize timelines and ready queues for each core
        timelines = {str(i): {"processes": []} for i in range(self.cpu_cores)}
        core_times = {str(i): 0 for i in range(self.cpu_cores)}
        ready_queues = {str(i): [] for i in range(self.cpu_cores)}
        
        # Keep track of original processes data
        original_processes = {p['id']: p.copy() for p in processes}
        
        # Track which processes are completed
        completed_processes = set()
        
        # Keep processing until all processes are completed
        remaining_processes = processes_copy.copy()
        
        while len(completed_processes) < len(processes):
            # For each core
            for core_id in range(self.cpu_cores):
                core_id_str = str(core_id)
                current_time = core_times[core_id_str]
                
                # Add newly arrived processes to this core's queue
                arrived = [p for p in remaining_processes if p['arrival_time'] <= current_time and 
                          p['id'] not in completed_processes]
                
                for p in arrived:
                    if p in remaining_processes:
                        remaining_processes.remove(p)
                        ready_queues[core_id_str].append(p)
                
                # If no processes in ready queue, advance time to next arrival
                if not ready_queues[core_id_str]:
                    if remaining_processes:
                        # Move to next arrival time
                        next_arrival = min(p['arrival_time'] for p in remaining_processes)
                        core_times[core_id_str] = max(core_times[core_id_str], next_arrival)
                    continue
                
                # Get the next process from this core's queue
                process = ready_queues[core_id_str].pop(0)
                
                # Calculate execution time for this turn
                execution_time = min(time_quantum, process['remaining_time'])
                
                # Add to timeline
                timelines[core_id_str]["processes"].append({
                    "id": process["id"],
                    "start_time": current_time,
                    "end_time": current_time + execution_time
                })
                
                # Update current time and remaining time
                current_time += execution_time
                process['remaining_time'] -= execution_time
                core_times[core_id_str] = current_time
                
                # Check if process is completed
                if process['remaining_time'] > 0:
                    # Put back in queue if not finished, after newly arrived processes
                    ready_queues[core_id_str].append(process)
                else:
                    # Mark as completed
                    completed_processes.add(process['id'])
            
            # If all processes are complete, exit loop
            if len(completed_processes) == len(processes):
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