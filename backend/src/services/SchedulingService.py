from typing import Dict, List, Optional, Any
import psutil  # Import to get CPU core count dynamically

class SchedulingService:
    def __init__(self):
        # Get the actual number of CPU cores from the system
        self.cpu_cores = max(1, psutil.cpu_count(logical=False) or 1)
    
    def fcfs(self, processes: List[Dict[str, Any]]) -> Dict[str, Any]:
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

    def sjf(self, processes: List[Dict[str, Any]]) -> Dict[str, Any]:
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

    def priority(self, processes: List[Dict[str, Any]]) -> Dict[str, Any]:
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

    def round_robin(self, processes: List[Dict[str, Any]], time_quantum: int) -> Dict[str, Any]:
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

    def srtf(self, processes: List[Dict[str, Any]]) -> Dict[str, Any]:
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

    # Update _calculate_metrics to include core ID in results
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