from .system_info_service import SystemInfoService

class SchedulingService:
    def __init__(self):
        self.system_info = SystemInfoService.get_system_info()
        self.cores = self.system_info['cores']  # Using physical cores for accurate simulation

    def _calculate_average_metrics(self, results):
        if not results:
            return {
                'waiting_time': 0,
                'response_time': 0,
                'turnaround_time': 0,
                'throughput': 0,
                'cpu_utilization': 0
            }

        total_processes = len(results)
        total_waiting_time = sum(p['waiting_time'] for p in results)
        total_response_time = sum(p['response_time'] for p in results)
        total_turnaround_time = sum(p['turnaround_time'] for p in results)
        max_completion_time = max(p['completion_time'] for p in results)

        return {
            'waiting_time': total_waiting_time / total_processes,
            'response_time': total_response_time / total_processes,
            'turnaround_time': total_turnaround_time / total_processes,
            'throughput': total_processes / max_completion_time if max_completion_time > 0 else 0,
            'cpu_utilization': (total_turnaround_time / (self.cores * max_completion_time) * 100) if max_completion_time > 0 else 0
        }

    def _create_timeline(self, results):
        timeline = {str(i): {'processes': []} for i in range(self.cores)}
        
        for process in results:
            core = str(process['cpu_core'])
            timeline[core]['processes'].append({
                'id': process['id'],
                'start_time': process['start_time'],
                'end_time': process['end_time']
            })
        
        return timeline

    def _format_result(self, algorithm, process_results):
        return {
            'algorithm': algorithm,
            'system_info': {
                'cores': self.system_info['cores'],
                'cpu_model': self.system_info['cpu_model'],
                'architecture': self.system_info['architecture']
            },
            'average_metrics': self._calculate_average_metrics(process_results),
            'process_results': process_results,
            'timeline': self._create_timeline(process_results)
        }

    def fcfs(self, processes):
        sorted_processes = sorted(processes, key=lambda x: x['arrival_time'])
        results = []
        core_times = [0] * self.cores

        for process in sorted_processes:
            # Find core with minimum current time
            min_core_index = core_times.index(min(core_times))
            start_time = max(core_times[min_core_index], process['arrival_time'])
            end_time = start_time + process['burst_time']

            results.append({
                'id': process['id'],
                'waiting_time': start_time - process['arrival_time'],
                'response_time': start_time - process['arrival_time'],
                'completion_time': end_time,
                'turnaround_time': end_time - process['arrival_time'],
                'cpu_core': min_core_index,
                'start_time': start_time,
                'end_time': end_time
            })

            core_times[min_core_index] = end_time

        return self._format_result('FCFS', results)

    def sjf(self, processes):
        results = []
        core_times = [0] * self.cores
        remaining_processes = processes.copy()
        current_time = min(p['arrival_time'] for p in processes)

        while remaining_processes:
            available_processes = [
                p for p in remaining_processes
                if p['arrival_time'] <= current_time
            ]

            if not available_processes:
                current_time = min(p['arrival_time'] for p in remaining_processes)
                continue

            # Find shortest job
            shortest_job = min(available_processes, key=lambda x: x['burst_time'])
            min_core_index = core_times.index(min(core_times))
            start_time = max(core_times[min_core_index], current_time)
            end_time = start_time + shortest_job['burst_time']

            results.append({
                'id': shortest_job['id'],
                'waiting_time': start_time - shortest_job['arrival_time'],
                'response_time': start_time - shortest_job['arrival_time'],
                'completion_time': end_time,
                'turnaround_time': end_time - shortest_job['arrival_time'],
                'cpu_core': min_core_index,
                'start_time': start_time,
                'end_time': end_time
            })

            core_times[min_core_index] = end_time
            current_time = min(core_times)
            remaining_processes.remove(shortest_job)

        return self._format_result('SJF', results)

    def priority(self, processes):
        results = []
        core_times = [0] * self.cores
        remaining_processes = processes.copy()
        current_time = min(p['arrival_time'] for p in processes)

        while remaining_processes:
            available_processes = [
                p for p in remaining_processes
                if p['arrival_time'] <= current_time
            ]

            if not available_processes:
                current_time = min(p['arrival_time'] for p in remaining_processes)
                continue

            # Find highest priority process (lower number = higher priority)
            highest_priority = min(available_processes, key=lambda x: x['priority'])
            min_core_index = core_times.index(min(core_times))
            start_time = max(core_times[min_core_index], current_time)
            end_time = start_time + highest_priority['burst_time']

            results.append({
                'id': highest_priority['id'],
                'waiting_time': start_time - highest_priority['arrival_time'],
                'response_time': start_time - highest_priority['arrival_time'],
                'completion_time': end_time,
                'turnaround_time': end_time - highest_priority['arrival_time'],
                'cpu_core': min_core_index,
                'start_time': start_time,
                'end_time': end_time
            })

            core_times[min_core_index] = end_time
            current_time = min(core_times)
            remaining_processes.remove(highest_priority)

        return self._format_result('Priority', results)

    def round_robin(self, processes, time_quantum=2):
        results = []
        core_times = [0] * self.cores
        remaining_processes = [{
            **p,
            'remaining_time': p['burst_time'],
            'first_response': -1
        } for p in processes]
        current_time = min(p['arrival_time'] for p in processes)

        while remaining_processes:
            available_processes = [
                p for p in remaining_processes
                if p['arrival_time'] <= current_time
            ]

            if not available_processes:
                current_time = min(p['arrival_time'] for p in remaining_processes)
                continue

            # Process each available process for the time quantum
            for process in available_processes:
                min_core_index = core_times.index(min(core_times))
                start_time = max(core_times[min_core_index], current_time)
                execution_time = min(time_quantum, process['remaining_time'])
                end_time = start_time + execution_time

                # Track first response time
                if process['first_response'] == -1:
                    process['first_response'] = start_time

                # If process is completing
                if process['remaining_time'] <= time_quantum:
                    results.append({
                        'id': process['id'],
                        'waiting_time': start_time - process['arrival_time'] - (process['burst_time'] - process['remaining_time']),
                        'response_time': process['first_response'] - process['arrival_time'],
                        'completion_time': end_time,
                        'turnaround_time': end_time - process['arrival_time'],
                        'cpu_core': min_core_index,
                        'start_time': start_time,
                        'end_time': end_time
                    })

                core_times[min_core_index] = end_time
                process['remaining_time'] -= execution_time

            current_time = min(core_times)
            remaining_processes = [p for p in remaining_processes if p['remaining_time'] > 0]

        return self._format_result('Round Robin', results) 