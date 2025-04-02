from typing import Dict, List, Any
from .BaseSchedulingService import BaseSchedulingService

class SJFService(BaseSchedulingService):
    def schedule(self, processes: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Shortest Job First scheduling with multi-core support"""
        print("SJF received processes:", processes)  # Debug log
        
        if not processes:
            return {
                "timeline": {},
                "process_results": [],
                "metrics": self._calculate_average_metrics([])
            }

        # Create a copy of processes and add tracking fields
        processes_copy = [p.copy() for p in processes]
        for p in processes_copy:
            p['assigned'] = False
            p['core'] = None
            p['remaining_time'] = p['burst_time']  # Track remaining time for each process
        
        # Sort initially by arrival time and burst time
        processes_copy.sort(key=lambda p: (p['arrival_time'], p['burst_time']))
        print("Sorted processes:", processes_copy)  # Debug log
        
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
                         and p['id'] not in completed_ids
                         and not p['assigned']]
            
            # Find next arrival time
            next_arrival = float('inf')
            for p in processes_copy:
                if p['id'] not in completed_ids and p['arrival_time'] > current_time:
                    next_arrival = min(next_arrival, p['arrival_time'])
            
            if ready_queue:
                # Sort ready queue by burst time (shortest first)
                ready_queue.sort(key=lambda p: p['burst_time'])
                
                # Get available cores sorted by their current time
                available_cores = sorted([
                    core_id for core_id in core_times.keys()
                    if not any(p['assigned'] and p['core'] == core_id for p in processes_copy)
                ], key=lambda core: core_times[core])
                
                if available_cores:
                    # Get the next process to schedule
                    process = ready_queue[0]
                    core_id = available_cores[0]
                    
                    # Mark process as assigned and record its core
                    process['assigned'] = True
                    process['core'] = core_id
                    
                    # Calculate start time for this process
                    start_time = max(core_times[core_id], process['arrival_time'])
                    
                    # Add to timeline
                    timelines[core_id]["processes"].append({
                        "id": process["id"],
                        "start_time": start_time,
                        "end_time": start_time + process["burst_time"]
                    })
                    
                    # Update core time and mark process as completed
                    core_times[core_id] = start_time + process["burst_time"]
                    completed_ids.add(process["id"])
                    
                    # Remove the completed process from processes_copy
                    processes_copy = [p for p in processes_copy if p['id'] != process['id']]
            else:
                # No ready processes, find next arrival time
                unassigned = [p for p in processes_copy 
                            if p['id'] not in completed_ids 
                            and not p['assigned']]
                if unassigned:
                    next_arrival = min(p['arrival_time'] for p in unassigned)
                    # Update all idle cores to the next arrival time
                    for core_id in core_times:
                        if core_times[core_id] <= current_time:
                            core_times[core_id] = next_arrival
                    current_time = next_arrival
                else:
                    # No more processes to assign
                    break
            
            # Update current time to the next event
            next_completion = float('inf')
            for p in processes_copy:
                if p['assigned'] and p['id'] not in completed_ids:
                    completion_time = core_times[p['core']]
                    next_completion = min(next_completion, completion_time)
            
            if next_completion != float('inf') or next_arrival != float('inf'):
                current_time = min(filter(lambda x: x != float('inf'), [next_completion, next_arrival]))
            else:
                current_time += 1
        
        # Handle any remaining processes that might have been missed
        remaining_processes = [p for p in processes_copy if p['id'] not in completed_ids]
        if remaining_processes:
            print("Warning: Some processes were not completed:", remaining_processes)
            # Try to complete remaining processes
            for process in remaining_processes:
                # Find the core with earliest available time
                available_core = min(core_times, key=core_times.get)
                start_time = max(core_times[available_core], process['arrival_time'])
                
                # Add to timeline
                timelines[available_core]["processes"].append({
                    "id": process["id"],
                    "start_time": start_time,
                    "end_time": start_time + process["burst_time"]
                })
                
                # Update core time and mark as completed
                core_times[available_core] = start_time + process["burst_time"]
                completed_ids.add(process["id"])
        
        # Calculate metrics for each process
        process_results = []
        for core_id, timeline in timelines.items():
            process_results.extend(self._calculate_metrics(processes, timeline, int(core_id)))
        
        result = {
            "timeline": timelines,
            "process_results": process_results,
            "metrics": self._calculate_average_metrics(process_results)
        }
        print("SJF final result:", result)  # Debug log
        return result 