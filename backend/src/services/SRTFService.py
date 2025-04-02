from typing import Dict, List, Any
from .BaseSchedulingService import BaseSchedulingService

class SRTFService(BaseSchedulingService):
    def schedule(self, processes: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Shortest Remaining Time First scheduling with multi-core support"""
        if not processes:
            return {
                "timeline": {},
                "process_results": [],
                "metrics": self._calculate_average_metrics([])
            }

        # Create a copy of processes and add tracking fields
        processes_copy = [p.copy() for p in processes]
        for p in processes_copy:
            p['remaining_time'] = p['burst_time']
            p['assigned'] = False
            p['core'] = None
            p['last_start'] = None
        
        # Initialize timelines for all CPU cores
        timelines = {str(i): {"processes": []} for i in range(self.cpu_cores)}
        core_times = {str(i): 0 for i in range(self.cpu_cores)}
        
        # Track completed processes by their IDs
        completed_ids = set()
        current_time = min(p['arrival_time'] for p in processes)
        
        # Calculate maximum possible simulation time to prevent infinite loops
        max_time = sum(p['burst_time'] for p in processes) + max(p['arrival_time'] for p in processes)
        
        while len(completed_ids) < len(processes) and current_time <= max_time:
            # Get all processes that have arrived by current time
            ready_queue = [p for p in processes_copy 
                         if p['arrival_time'] <= current_time 
                         and p['id'] not in completed_ids]
            
            # Find next arrival time
            next_arrival = float('inf')
            for p in processes_copy:
                if p['id'] not in completed_ids and p['arrival_time'] > current_time:
                    next_arrival = min(next_arrival, p['arrival_time'])
            
            # Get currently running processes
            running_processes = [p for p in processes_copy 
                              if p['assigned'] and p['remaining_time'] > 0]
            
            # Sort ready queue by remaining time and arrival time
            if ready_queue:
                ready_queue.sort(key=lambda p: (p['remaining_time'], p['arrival_time']))
                shortest_process = ready_queue[0]
                
                # Check for preemption
                for running_process in running_processes:
                    if running_process['remaining_time'] > shortest_process['remaining_time']:
                        # Preempt the running process
                        core_id = running_process['core']
                        execution_time = current_time - running_process['last_start']
                        
                        if execution_time > 0:
                            timelines[core_id]["processes"].append({
                                "id": running_process["id"],
                                "start_time": running_process['last_start'],
                                "end_time": current_time
                            })
                            running_process['remaining_time'] -= execution_time
                        
                        running_process['assigned'] = False
                        running_process['core'] = None
                        running_process['last_start'] = None
            
            # Get available cores
            available_cores = [
                core_id for core_id in core_times.keys()
                if not any(p['assigned'] and p['core'] == core_id for p in processes_copy)
            ]
            
            # Assign processes to available cores
            if ready_queue and available_cores:
                for core_id in available_cores:
                    unassigned_processes = [p for p in ready_queue 
                                         if not p['assigned'] 
                                         and p['id'] not in completed_ids]
                    
                    if not unassigned_processes:
                        break
                    
                    # Get shortest remaining time process
                    process = min(unassigned_processes, 
                                key=lambda p: (p['remaining_time'], p['arrival_time']))
                    
                    # Assign process to core
                    process['assigned'] = True
                    process['core'] = core_id
                    process['last_start'] = current_time
                    
                    # Calculate time until next event
                    time_to_next = next_arrival - current_time if next_arrival != float('inf') else process['remaining_time']
                    execution_time = min(process['remaining_time'], time_to_next)
                    
                    # Add to timeline
                    timelines[core_id]["processes"].append({
                        "id": process["id"],
                        "start_time": current_time,
                        "end_time": current_time + execution_time
                    })
                    
                    # Update process state
                    process['remaining_time'] -= execution_time
                    if process['remaining_time'] <= 0:
                        completed_ids.add(process["id"])
                        process['assigned'] = False
                        process['core'] = None
            
            # Find next event time
            next_completion = float('inf')
            for p in running_processes:
                if p['remaining_time'] > 0:
                    completion_time = current_time + p['remaining_time']
                    next_completion = min(next_completion, completion_time)
            
            # Update current time
            if next_completion != float('inf') or next_arrival != float('inf'):
                current_time = min(filter(lambda x: x != float('inf'), [next_completion, next_arrival]))
            else:
                current_time += 1
        
        # Handle any running processes at simulation end
        for process in processes_copy:
            if process['assigned'] and process['last_start'] is not None:
                core_id = process['core']
                execution_time = current_time - process['last_start']
                if execution_time > 0:
                    timelines[core_id]["processes"].append({
                        "id": process["id"],
                        "start_time": process['last_start'],
                        "end_time": current_time
                    })
        
        # Calculate metrics for each process
        process_results = []
        for core_id, timeline in timelines.items():
            process_results.extend(self._calculate_metrics(processes, timeline, int(core_id)))
        
        return {
            "timeline": timelines,
            "process_results": process_results,
            "metrics": self._calculate_average_metrics(process_results)
        } 