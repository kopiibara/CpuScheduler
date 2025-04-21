import psutil
import time
from threading import Thread, Event
import queue
import random

class FCFSScheduler:
    def __init__(self):
        self.process_queue = []
        self.is_running = False
        self.stop_event = Event()
        self.scheduler_thread = None
        self.current_process = None
        self.time_slice = 2  # Time slice in seconds for each process
        self.completed_processes = []
        self.process_progress = {}  # Track progress for each process
        self.process_cpu_usage = {}  # Track CPU usage history
        self.process_start_times = {}  # Track when each process started execution
        self.process_end_times = {}  # Add this to track when processes finish
        self.process_actual_times = {}  # Add this to track actual processing time
    
    def start(self):
        """Start the FCFS scheduler"""
        if self.is_running:
            return False
        
        # Reset state
        self.process_queue = []
        self.completed_processes = []
        self.process_progress = {}
        self.process_cpu_usage = {}
        self.process_start_times = {}
        self.process_end_times = {}
        self.process_actual_times = {}
            
        self.is_running = True
        self.stop_event.clear()
        self.scheduler_thread = Thread(target=self._scheduler_loop)
        self.scheduler_thread.daemon = True
        self.scheduler_thread.start()
        return True
    
    def stop(self):
        """Stop the FCFS scheduler"""
        if not self.is_running:
            return False
            
        self.is_running = False
        self.stop_event.set()
        if self.scheduler_thread:
            self.scheduler_thread.join(timeout=1.0)
        self.current_process = None
        self.process_queue = []
        self.completed_processes = []
        self.process_progress = {}
        self.process_cpu_usage = {}
        self.process_start_times = {}
        self.process_end_times = {}
        self.process_actual_times = {}
        return True
    
    def add_application_processes(self, pids):
        """Add all processes of an application to the FCFS queue, sorted by PID"""
        if not self.is_running:
            return False
        
        # Filter valid PIDs
        valid_pids = []
        for pid in pids:
            if self._is_valid_pid(pid) and pid not in self.process_queue and pid not in self.completed_processes:
                valid_pids.append(pid)
        
        # Sort the PIDs in ascending order (FCFS by PID)
        valid_pids.sort()
        
        # Add to queue
        self.process_queue.extend(valid_pids)
        return True
    
    def add_process(self, pid):
        """Add a single process to the FCFS queue"""
        if not self._is_valid_pid(pid):
            return False
        
        # Don't add if already in queue or completed
        if pid in self.process_queue or pid in self.completed_processes:
            return False
            
        # Add to queue, keeping it sorted
        self.process_queue.append(pid)
        self.process_queue.sort()  # Keep queue sorted by PID
        return True
    
    def get_status(self):
        """Return the current queue status"""
        return {
            "is_running": self.is_running,
            "queue": self.process_queue,
            "current_process": self.current_process,
            "completed": self.completed_processes
        }
    
    def get_detailed_status(self):
        """Return detailed status information including progress"""
        return {
            "is_running": self.is_running,
            "queue": self.process_queue,
            "current_process": self.current_process,
            "completed": self.completed_processes,
            "progress": self.process_progress,
            "cpu_usage": self.process_cpu_usage,
            "start_times": self.process_start_times,
            "end_times": self.process_end_times,
            "processing_times": self.process_actual_times
        }
    
    def _scheduler_loop(self):
        """Main scheduler loop that implements FCFS"""
        while not self.stop_event.is_set():
            try:
                # Get the next process in the queue
                if self.process_queue:
                    pid = self.process_queue.pop(0)  # Get first PID (lowest)
                    
                    # Check if process still exists
                    if self._is_valid_pid(pid):
                        # Set as current process
                        self.current_process = pid
                        self.process_start_times[pid] = time.time()
                        
                        # Track progress from 0-100%
                        self.process_progress[pid] = 0
                        
                        # Store original priority to restore later
                        try:
                            process = psutil.Process(pid)
                            original_priority = process.nice()
                        except:
                            original_priority = None
                        
                        # Set to HIGH_PRIORITY_CLASS (128)
                        try:
                            process.nice(128)  # HIGH_PRIORITY_CLASS
                        except:
                            pass
                        
                        # Process with progress updates...
                        start_time = time.time()
                        slice_duration = self.time_slice
                        
                        # Add some randomness to processing time (1.5x - 2.5x)
                        process_complexity = random.uniform(1.5, 2.5)
                        adjusted_duration = slice_duration * process_complexity
                        
                        while time.time() - start_time < adjusted_duration:
                            if self.stop_event.is_set():
                                break
                                
                            # Calculate progress percentage
                            elapsed = time.time() - start_time
                            progress = min(100, int((elapsed / adjusted_duration) * 100))
                            self.process_progress[pid] = progress
                            
                            # Sample CPU usage periodically for charts
                            if time.time() % 0.5 < 0.1:  # Sample roughly every 0.5 seconds
                                try:
                                    proc = psutil.Process(pid)
                                    cpu = proc.cpu_percent(interval=0)
                                    self.process_cpu_usage[pid].append(cpu)
                                except:
                                    pass
                            
                            time.sleep(0.1)  # Small sleep for responsiveness
                        
                        # Record end time
                        end_time = time.time()
                        self.process_end_times[pid] = end_time
                        self.process_actual_times[pid] = end_time - self.process_start_times[pid]
                        
                        # Reset priority back to original value
                        try:
                            if original_priority is not None:
                                process = psutil.Process(pid)
                                process.nice(original_priority)
                        except:
                            pass
                        
                        # Mark as completed
                        self.completed_processes.append(pid)
                        self.process_progress[pid] = 100  # Ensure it shows as 100% complete
                    
                    self.current_process = None
                    
                else:
                    # No processes in queue, sleep briefly
                    time.sleep(0.1)
            except Exception as e:
                print(f"Error in scheduler loop: {str(e)}")
                time.sleep(0.5)  # Avoid tight loop on error
    
    def _is_valid_pid(self, pid):
        """Check if a PID exists and is accessible"""
        try:
            process = psutil.Process(pid)
            return process.is_running()
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            return False
        
    def _set_process_priority(self, pid, priority):
        """Set process priority"""
        try:
            process = psutil.Process(pid)
            process.nice(priority)
            return True
        except Exception as e:
            print(f"Error setting priority: {str(e)}")
            return False

    def _get_process_priority(self, pid):
        """Get the current priority of a process"""
        try:
            process = psutil.Process(pid)
            return process.nice()
        except:
            return None
        
    def _set_highest_possible_priority(self, pid):
        """Try to set a process to the highest possible priority"""
        try:
            process = psutil.Process(pid)
            
            # Try priorities in descending order of elevation
            priority_levels = [
                256,  # REALTIME_PRIORITY_CLASS - Try first but likely to fail
                128,  # HIGH_PRIORITY_CLASS
                32768,  # ABOVE_NORMAL_PRIORITY_CLASS + CUSTOM(Audio Priority) 
                64,   # High Performance
                32,   # NORMAL_PRIORITY_CLASS
            ]
            
            # Get the current priority as fallback
            current_priority = process.nice()
            
            # Try each priority level, starting with highest
            for priority in priority_levels:
                try:
                    # Skip if the priority would be a downgrade
                    if current_priority and priority < current_priority:
                        continue
                        
                    process.nice(priority)
                    print(f"Successfully set process {pid} to priority {priority}")
                    return priority
                except Exception as e:
                    # If permission error or other issue, try next level
                    continue
                    
            # If all attempts failed, just return the current priority
            return current_priority
        except Exception as e:
            print(f"Error setting highest priority: {str(e)}")
            return None

# Create a global instance that can be imported by other modules
fcfs_scheduler = FCFSScheduler()