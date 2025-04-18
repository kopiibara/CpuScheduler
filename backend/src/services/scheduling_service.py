import psutil
import time
from threading import Thread, Event
import queue

class FCFSScheduler:
    def __init__(self):
        self.process_queue = []  # Changed to list for sorting by PID
        self.is_running = False
        self.stop_event = Event()
        self.scheduler_thread = None
        self.current_process = None
        self.time_slice = 2  # Time slice in seconds for each process
        self.completed_processes = []  # Track processes that have been completed
    
    def start(self):
        """Start the FCFS scheduler"""
        if self.is_running:
            return False
        
        # Reset state
        self.process_queue = []
        self.completed_processes = []
            
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
                        
                        # Apply high priority to current process
                        self._set_process_priority(pid, psutil.HIGH_PRIORITY_CLASS)
                        
                        # Let it run for the time slice
                        time.sleep(self.time_slice)
                        
                        # Reset priority back to normal
                        self._set_process_priority(pid, psutil.NORMAL_PRIORITY_CLASS)
                        
                        # Add to completed list
                        self.completed_processes.append(pid)
                    
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

# Create a global instance that can be imported by other modules
fcfs_scheduler = FCFSScheduler()