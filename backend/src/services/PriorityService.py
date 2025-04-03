from typing import Dict, List, Any
from .BaseSchedulingService import BaseSchedulingService

class PriorityService(BaseSchedulingService):
    def schedule(self, processes: List[Dict[str, Any]], preemptive: bool = False) -> Dict[str, Any]:
        """Priority scheduling algorithm with multi-core support
        
        Parameters:
        - processes: List of processes to schedule
        - preemptive: Whether to use preemptive scheduling (default: False)
        """
        if preemptive:
            return self._schedule_preemptive(processes)
        else:
            return self._schedule_non_preemptive(processes)
    
    def _schedule_non_preemptive(self, processes: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Non-preemptive Priority scheduling algorithm with multi-core support"""
        # Create a copy of the processes to avoid modifying the original
        processes_copy = [p.copy() for p in processes]
        
        # Sort initially by arrival time
        processes_copy.sort(key=lambda p: p['arrival_time'])
        
        # Initialize timelines for all CPU cores
        cpu_count = 4  # Force 4 cores for better visualization
        timelines = {str(i): {"processes": []} for i in range(cpu_count)}
        core_times = {str(i): 0 for i in range(cpu_count)}
        
        # Print debug info
        print(f"Initializing scheduler with {cpu_count} cores")
        print(f"Input processes: {[(p['id'], p['burst_time']) for p in processes]}")
        
        completed = []
        
        # Continue until all processes are completed
        while len(completed) < len(processes):
            # For each core, check if it can process something
            for core_id in range(cpu_count):
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
                    
                    # Ensure burst time is correctly used from original process data
                    original_process = next((p for p in processes if p['id'] == process['id']), None)
                    burst_time = original_process['burst_time'] if original_process else process['burst_time']
                    
                    # Add to timeline
                    timelines[core_id_str]["processes"].append({
                        "id": process["id"],
                        "start_time": current_time,
                        "end_time": current_time + burst_time
                    })
                    
                    # Update current time for this core
                    core_times[core_id_str] += burst_time
                    completed.append(process)
                    
                    # Print debug info
                    print(f"Assigned process {process['id']} to core {core_id} (time: {current_time}-{current_time + burst_time}, burst: {burst_time})")
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
    
    def _schedule_preemptive(self, processes: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Preemptive Priority scheduling algorithm with multi-core support (optimized)"""
        if not processes:
            return {
                "timeline": {},
                "process_results": [],
                "metrics": self._calculate_average_metrics([])
            }

        # Create a copy of processes and add tracking fields
        processes_copy = [p.copy() for p in processes]
        
        # Store original burst times for reference 
        original_burst_times = {p['id']: p['burst_time'] for p in processes}
        
        # Track which processes need preemption checking based on priorities
        priority_map = {p['id']: p['priority'] for p in processes}
        
        for p in processes_copy:
            p['remaining_time'] = p['burst_time']
            p['assigned'] = False
            p['core'] = None
            p['last_start'] = None
        
        # Initialize timelines for all CPU cores
        cpu_count = 4  # Force 4 cores for better visualization
        timelines = {str(i): {"processes": []} for i in range(cpu_count)}
        
        # Track core availability and current time more efficiently
        core_availability = {str(i): 0 for i in range(cpu_count)}  # Time when core becomes available
        
        # Track which process is running on each core
        core_to_process = {str(i): None for i in range(cpu_count)}
        
        # Debug info
        print(f"Input processes: {[(p['id'], p['priority'], p['burst_time']) for p in processes]}")
        
        # Track completed processes by their IDs
        completed_ids = set()
        
        # Start at the earliest arrival time
        current_time = min(p['arrival_time'] for p in processes)
        
        # Track upcoming events (process arrivals and completions)
        events = []
        
        # Add initial arrival events
        for p in processes_copy:
            events.append((p['arrival_time'], 'arrival', p['id']))
        
        # Sort events by time
        events.sort()
        
        # Process events until all processes are complete
        while len(completed_ids) < len(processes) and events:
            # Get next event
            event_time, event_type, process_id = events.pop(0)
            current_time = event_time
            
            print(f"Time {current_time}: Processing {event_type} event for process {process_id}")
            
            # Update active processes based on current time
            for p in processes_copy:
                if p['assigned'] and p['last_start'] is not None and p['id'] not in completed_ids:
                    core_id = p['core']
                    core_str = str(core_id)
                    
                    # If this process should complete before or at current time
                    if p['last_start'] + p['remaining_time'] <= current_time:
                        # Add to timeline
                        execution_time = p['remaining_time']
                        timelines[core_str]["processes"].append({
                            "id": p["id"],
                            "start_time": p['last_start'],
                            "end_time": p['last_start'] + execution_time
                        })
                        
                        print(f"Process P{p['id']} completed on core {core_str}")
                        
                        # Update core availability
                        core_availability[core_str] = p['last_start'] + execution_time
                        core_to_process[core_str] = None
                        
                        # Mark process as completed
                        completed_ids.add(p['id'])
                        p['assigned'] = False
                        p['core'] = None
                        p['remaining_time'] = 0
                        p['last_start'] = None
            
            # Get all processes that have arrived by current time and are not completed
            ready_queue = [p for p in processes_copy 
                          if p['arrival_time'] <= current_time 
                          and p['id'] not in completed_ids]
            
            # Sort by priority (lower number = higher priority)
            ready_queue.sort(key=lambda p: (p['priority'], p['arrival_time']))
            
            # STEP 1: First check for completely free cores and assign highest priority processes
            # Get available cores at current time
            available_cores = [
                core_id for core_id, avail_time in core_availability.items()
                if avail_time <= current_time and core_to_process[core_id] is None
            ]
            
            print(f"Time {current_time}: Available cores: {available_cores}")
            
            if ready_queue and available_cores:
                # Sort cores by availability time (earliest first)
                available_cores.sort(key=lambda c: core_availability[c])
                
                for core_id in available_cores:
                    # Get unassigned processes from ready queue
                    unassigned_processes = [p for p in ready_queue 
                                          if not p['assigned'] 
                                          and p['id'] not in completed_ids]
                    
                    if not unassigned_processes:
                        break
                    
                    # Get highest priority process (lowest priority number)
                    process = min(unassigned_processes, key=lambda p: (p['priority'], p['arrival_time']))
                    
                    print(f"Assigning process P{process['id']} (priority {process['priority']}) to free core {core_id}")
                    
                    # Assign process to core
                    process['assigned'] = True
                    process['core'] = core_id
                    process['last_start'] = current_time
                    core_to_process[core_id] = process['id']
                    
                    # Find next arrival time that could preempt this process
                    possible_preemption = False
                    next_preemption_time = float('inf')
                    
                    for future_p in processes_copy:
                        if (future_p['id'] not in completed_ids and 
                            not future_p['assigned'] and 
                            future_p['arrival_time'] > current_time and
                            future_p['priority'] < process['priority']):
                            next_preemption_time = min(next_preemption_time, future_p['arrival_time'])
                            possible_preemption = True
                    
                    # Calculate execution time until next event
                    if possible_preemption:
                        execution_time = min(process['remaining_time'], next_preemption_time - current_time)
                    else:
                        execution_time = process['remaining_time']
                    
                    # Validate execution time is reasonable
                    execution_time = min(execution_time, original_burst_times[process['id']])
                    execution_time = max(0.1, execution_time)  # Ensure positive execution time
                    
                    # Add process execution to timeline
                    timelines[core_id]["processes"].append({
                        "id": process["id"],
                        "start_time": current_time,
                        "end_time": current_time + execution_time
                    })
                    
                    # Update process state
                    process['remaining_time'] -= execution_time
                    
                    # Schedule completion event
                    if process['remaining_time'] <= 0:
                        completed_ids.add(process["id"])
                        process['assigned'] = False
                        process['core'] = None
                        core_to_process[core_id] = None
                    else:
                        # Schedule potential completion event
                        completion_time = current_time + execution_time
                        events.append((completion_time, 'completion', process['id']))
                        events.sort()
            
            # STEP 2: Only after assigning to free cores, check for preemption if needed
            # Get remaining unassigned processes
            remaining_unassigned = [p for p in ready_queue 
                                   if not p['assigned'] and p['id'] not in completed_ids]
            
            if remaining_unassigned:
                # Find all running processes
                running_processes = [p for p in processes_copy 
                                   if p['assigned'] and p['remaining_time'] > 0]
                
                # If there are running processes and unassigned processes, check for preemption
                if running_processes and remaining_unassigned:
                    # Get highest priority unassigned process
                    highest_priority_process = min(remaining_unassigned, key=lambda p: (p['priority'], p['arrival_time']))
                    
                    # Find running processes with lower priority
                    preemption_candidates = []
                    for running_process in running_processes:
                        if running_process['priority'] > highest_priority_process['priority']:
                            preemption_candidates.append(running_process)
                    
                    # If we found candidates for preemption
                    if preemption_candidates:
                        # Choose the lowest priority running process to preempt
                        process_to_preempt = max(preemption_candidates, key=lambda p: p['priority'])
                        
                        # Critical: Get the core this process is running on
                        core_id = process_to_preempt['core']
                        
                        print(f"Preempting P{process_to_preempt['id']} (priority {process_to_preempt['priority']}) on core {core_id} with P{highest_priority_process['id']} (priority {highest_priority_process['priority']})")
                        
                        # Calculate execution time so far
                        execution_time = current_time - process_to_preempt['last_start']
                        
                        # Only preempt if the process has actually run for some time
                        if execution_time > 0:
                            # Add executed portion to timeline
                            timelines[core_id]["processes"].append({
                                "id": process_to_preempt["id"],
                                "start_time": process_to_preempt['last_start'],
                                "end_time": current_time
                            })
                            
                            # Update remaining time
                            process_to_preempt['remaining_time'] -= execution_time
                        
                        # Mark process as unassigned
                        process_to_preempt['assigned'] = False
                        process_to_preempt['core'] = None
                        process_to_preempt['last_start'] = None
                        
                        # Assign high priority process to this same core
                        highest_priority_process['assigned'] = True
                        highest_priority_process['core'] = core_id  # Use the same core!
                        highest_priority_process['last_start'] = current_time
                        core_to_process[core_id] = highest_priority_process['id']
                        
                        # Find next potential preemption time
                        possible_preemption = False
                        next_preemption_time = float('inf')
                        
                        for future_p in processes_copy:
                            if (future_p['id'] not in completed_ids and 
                                not future_p['assigned'] and 
                                future_p['arrival_time'] > current_time and
                                future_p['priority'] < highest_priority_process['priority']):
                                next_preemption_time = min(next_preemption_time, future_p['arrival_time'])
                                possible_preemption = True
                        
                        # Calculate execution time
                        if possible_preemption:
                            execution_time = min(highest_priority_process['remaining_time'], 
                                               next_preemption_time - current_time)
                        else:
                            execution_time = highest_priority_process['remaining_time']
                        
                        # Validate execution time is reasonable
                        execution_time = min(execution_time, original_burst_times[highest_priority_process['id']])
                        execution_time = max(0.1, execution_time)  # Ensure positive execution time
                        
                        # Add to timeline
                        timelines[core_id]["processes"].append({
                            "id": highest_priority_process["id"],
                            "start_time": current_time,
                            "end_time": current_time + execution_time
                        })
                        
                        # Update process state
                        highest_priority_process['remaining_time'] -= execution_time
                        
                        # Schedule completion event
                        if highest_priority_process['remaining_time'] <= 0:
                            completed_ids.add(highest_priority_process["id"])
                            highest_priority_process['assigned'] = False
                            highest_priority_process['core'] = None
                            core_to_process[core_id] = None
                        else:
                            # Schedule potential completion event
                            completion_time = current_time + execution_time
                            events.append((completion_time, 'completion', highest_priority_process['id']))
                            events.sort()
                        
                        # Add preempted process back to event queue if it still has time left
                        if process_to_preempt['remaining_time'] > 0:
                            # It will be picked up naturally in the next iteration - no need to do anything
                            pass
            
            # If no more events but still processes to complete, find the next event time
            if not events and len(completed_ids) < len(processes):
                # Check for any remaining process arrivals
                remaining_arrivals = [
                    p['arrival_time'] for p in processes_copy 
                    if p['arrival_time'] > current_time and p['id'] not in completed_ids
                ]
                
                if remaining_arrivals:
                    next_arrival = min(remaining_arrivals)
                    events.append((next_arrival, 'arrival', None))
                    events.sort()
        
        # Handle any running processes at simulation end
        for process in processes_copy:
            if process['assigned'] and process['last_start'] is not None and process['remaining_time'] > 0:
                core_id = process['core']
                timelines[core_id]["processes"].append({
                    "id": process["id"],
                    "start_time": process['last_start'],
                    "end_time": process['last_start'] + process['remaining_time']
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