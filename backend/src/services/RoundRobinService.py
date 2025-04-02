from typing import Dict, List, Any
from .BaseSchedulingService import BaseSchedulingService

class RoundRobinService(BaseSchedulingService):
    def schedule(self, processes: List[Dict[str, Any]], time_quantum: int) -> Dict[str, Any]:
        """Round Robin scheduling algorithm with multi-core support and global queue"""
        # Create a copy of processes and add remaining_time field
        processes_copy = [p.copy() for p in processes]
        for p in processes_copy:
            p['remaining_time'] = p['burst_time']
        
        # Sort by arrival time
        processes_copy.sort(key=lambda p: p['arrival_time'])
        
        # Initialize timelines for each core
        timelines = {str(i): {"processes": []} for i in range(self.cpu_cores)}
        
        # Initialize a global queue
        global_queue = []
        
        # Track CPU availability and current time for each CPU
        cpu_availability = {str(i): 0 for i in range(self.cpu_cores)}  # Time when CPU becomes available
        
        # Track currently executing processes on each CPU
        currently_executing = {str(i): None for i in range(self.cpu_cores)}
        
        # Set of process IDs that are currently executing
        executing_process_ids = set()
        
        # Keep track of original processes data
        original_processes = {p['id']: p.copy() for p in processes}
        
        # Track which processes are completed
        completed_processes = set()
        
        # Keep track of processes yet to arrive
        remaining_processes = processes_copy.copy()
        
        # Global time tracker
        current_time = 0
        
        while len(completed_processes) < len(processes):
            # Add newly arrived processes to the global queue
            while remaining_processes and remaining_processes[0]['arrival_time'] <= current_time:
                process = remaining_processes.pop(0)
                global_queue.append(process)
            
            # If no processes in queue and no remaining processes, we're done
            if not global_queue and not remaining_processes:
                break
            
            # If no processes in queue but we have remaining processes, advance time
            if not global_queue and remaining_processes:
                current_time = remaining_processes[0]['arrival_time']
                continue
            
            # Check CPUs that have finished processing
            for cpu_id in currently_executing.keys():
                if currently_executing[cpu_id] is not None and cpu_availability[cpu_id] <= current_time:
                    completed_process = currently_executing[cpu_id]
                    # If process is not done, add it back to queue
                    if completed_process['remaining_time'] > 0:
                        global_queue.append(completed_process)
                    else:
                        # Mark as completed
                        completed_processes.add(completed_process['id'])
                    
                    # Remove from executing list
                    executing_process_ids.remove(completed_process['id'])
                    currently_executing[cpu_id] = None
            
            # Find available CPUs
            available_cpus = [cpu_id for cpu_id, process in currently_executing.items() 
                             if process is None]
            
            # If no CPUs available, advance time to the next CPU availability
            if not available_cpus:
                next_available_time = min(cpu_availability[cpu_id] for cpu_id, process 
                                        in currently_executing.items() 
                                        if process is not None)
                current_time = next_available_time
                continue
            
            # Assign processes to available CPUs
            for cpu_id in available_cpus:
                # Find processes in queue that aren't currently executing
                available_processes = [p for p in global_queue if p['id'] not in executing_process_ids]
                
                if not available_processes:
                    break
                
                # Get next non-executing process from queue
                process_index = next((i for i, p in enumerate(global_queue) 
                                    if p['id'] not in executing_process_ids), None)
                
                if process_index is None:
                    break
                    
                process = global_queue.pop(process_index)
                
                # Calculate execution time for this turn
                execution_time = min(time_quantum, process['remaining_time'])
                
                # Add to timeline
                timelines[cpu_id]["processes"].append({
                    "id": process["id"],
                    "start_time": current_time,
                    "end_time": current_time + execution_time
                })
                
                # Update CPU availability and currently executing
                cpu_availability[cpu_id] = current_time + execution_time
                currently_executing[cpu_id] = process
                executing_process_ids.add(process['id'])
                
                # Update remaining time for process
                process['remaining_time'] -= execution_time
            
            # Advance time to the next event (CPU availability or new process arrival)
            next_cpu_time = min([cpu_availability[cpu_id] for cpu_id, process 
                               in currently_executing.items() 
                               if process is not None], default=float('inf'))
            
            next_arrival_time = remaining_processes[0]['arrival_time'] if remaining_processes else float('inf')
            current_time = min(next_cpu_time, next_arrival_time)
        
        # Calculate metrics for each process
        process_results = []
        for core_id, timeline in timelines.items():
            process_results.extend(self._calculate_metrics(processes, timeline, int(core_id)))
        
        return {
            "timeline": timelines,
            "process_results": process_results,
            "metrics": self._calculate_average_metrics(process_results)
        } 