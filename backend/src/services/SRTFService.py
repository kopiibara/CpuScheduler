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

        # Initialize process states
        processes_copy = [p.copy() for p in processes]
        for p in processes_copy:
            p['remaining_time'] = float(p['burst_time'])  # Convert to float for precise calculations
            p['core'] = None
            p['last_start'] = None
            p['total_execution'] = 0.0  # Track total execution time as float
            p['last_core'] = None
            p['original_burst'] = float(p['burst_time'])  # Keep original burst time for reference

        # Initialize core states and timelines
        core_states = {str(i): None for i in range(self.cpu_cores)}
        timelines = {str(i): {"processes": []} for i in range(self.cpu_cores)}
        completed_ids = set()

        # Start from earliest arrival time
        current_time = float(min(p['arrival_time'] for p in processes_copy))
        
        while len(completed_ids) < len(processes):
            # Update running processes and check for completions
            for core_id, running_process in list(core_states.items()):
                if running_process:
                    # Check if process has completed its full burst time
                    if running_process['total_execution'] >= running_process['original_burst'] - 0.0001:
                        # Process has completed its full burst time
                        timelines[core_id]["processes"].append({
                            "id": running_process["id"],
                            "start_time": running_process['last_start'],
                            "end_time": current_time
                        })
                        completed_ids.add(running_process['id'])
                        core_states[core_id] = None

            # Get newly arrived and unfinished processes
            ready_queue = [p for p in processes_copy 
                         if p['arrival_time'] <= current_time 
                         and p['id'] not in completed_ids
                         and p['core'] is None]

            if ready_queue:
                # Sort by remaining time and arrival time
                ready_queue.sort(key=lambda p: (p['remaining_time'], p['arrival_time']))

                # Check each running process for potential preemption
                for core_id, running_process in list(core_states.items()):
                    if running_process and ready_queue:
                        shortest_waiting = ready_queue[0]
                        
                        # Preempt if waiting process is shorter than running process
                        if shortest_waiting['remaining_time'] < running_process['remaining_time']:
                            # Calculate exact execution time for this segment
                            execution_time = current_time - running_process['last_start']
                            running_process['total_execution'] += execution_time
                            running_process['remaining_time'] = running_process['original_burst'] - running_process['total_execution']
                            
                            # Record the execution in timeline if there was actual execution
                            if execution_time > 0.0001:  # Small epsilon for float comparison
                                timelines[core_id]["processes"].append({
                                    "id": running_process["id"],
                                    "start_time": running_process['last_start'],
                                    "end_time": current_time
                                })
                            
                            # Save core information and add back to ready queue if not completed
                            running_process['last_core'] = core_id
                            running_process['core'] = None
                            running_process['last_start'] = None
                            if running_process['total_execution'] < running_process['original_burst'] - 0.0001:
                                ready_queue.append(running_process)
                            else:
                                completed_ids.add(running_process['id'])
                            
                            # Assign shortest waiting process to this core
                            process = ready_queue.pop(0)
                            process['core'] = core_id
                            process['last_start'] = current_time
                            core_states[core_id] = process

                # After preemption checks, fill any available cores
                available_cores = [core_id for core_id, state in core_states.items() 
                                 if state is None]
                
                for core_id in available_cores:
                    if not ready_queue:
                        break
                    
                    # Try to find a process that previously ran on this core
                    previous_process = next(
                        (p for p in ready_queue if p['last_core'] == core_id),
                        None
                    )
                    
                    # Prioritize resuming a process on its previous core
                    if previous_process:
                        process = previous_process
                        ready_queue.remove(process)
                    else:
                        process = ready_queue.pop(0)
                    
                    process['core'] = core_id
                    process['last_start'] = current_time
                    core_states[core_id] = process

            # Calculate next event time
            next_completion = float('inf')
            for p in [p for p in processes_copy if p['core'] is not None]:
                remaining = p['original_burst'] - p['total_execution']
                if remaining > 0.0001:
                    completion_time = current_time + remaining
                    next_completion = min(next_completion, completion_time)

            next_arrival = float('inf')
            future_arrivals = [p['arrival_time'] for p in processes_copy 
                             if p['arrival_time'] > current_time 
                             and p['id'] not in completed_ids]
            if future_arrivals:
                next_arrival = min(future_arrivals)

            # Move to next event
            if next_completion == float('inf') and next_arrival == float('inf'):
                break

            # Update execution times for running processes
            time_to_next = min(t for t in [next_completion, next_arrival] 
                             if t != float('inf')) - current_time
            
            for p in [p for p in processes_copy if p['core'] is not None]:
                p['total_execution'] += time_to_next
                p['remaining_time'] = p['original_burst'] - p['total_execution']

            current_time += time_to_next

        # Record final executions and ensure processes complete their full burst time
        for core_id, process in core_states.items():
            if process and process['last_start'] is not None:
                remaining = process['original_burst'] - process['total_execution']
                if remaining > 0.0001:
                    # Add the remaining execution time to complete the burst time
                    end_time = current_time + remaining
                    timelines[core_id]["processes"].append({
                        "id": process["id"],
                        "start_time": process['last_start'],
                        "end_time": end_time
                    })
                    process['total_execution'] = process['original_burst']
                    current_time = end_time

        # Calculate final metrics
        process_results = []
        for core_id, timeline in timelines.items():
            process_results.extend(self._calculate_metrics(processes, timeline, int(core_id)))

        return {
            "timeline": timelines,
            "process_results": process_results,
            "metrics": self._calculate_average_metrics(process_results)
        }