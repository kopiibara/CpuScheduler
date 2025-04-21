import psutil
import os
import base64
from io import BytesIO
import sys
import tempfile
import time
import threading
import queue
from threading import Lock

# Import Windows-specific modules only if on Windows
if sys.platform == 'win32':
    import win32api
    import win32gui
    import win32ui
    import win32con
    from PIL import Image

# Update these constants for better performance
_ICON_BATCH_SIZE = 50  # Reduced to focus on immediately visible processes
_MAX_ICON_EXTRACTION_TIME = 0.3  # Reduced timeout for more responsive updates
_PROCESS_CACHE_TTL = 1.5  # Slightly increased to reduce frequent full refreshes

# Add these global variables for caching
_process_cache = {}
_last_cache_time = 0
_icon_cache = {}  # Icon cache
_known_processes = set()  # Track known process paths to identify new ones

# Add these global variables
_icon_extraction_queue = queue.Queue()
_icon_extraction_thread = None
_is_extracting_icons = False

# Cache to store process objects and their last measurements
_process_monitors = {}
_process_metrics = {}
_monitor_lock = Lock()

def initialize_process_monitor():
    """Initialize the background process monitoring system"""
    def _monitor_background():
        while True:
            try:
                # Monitor the top processes by default
                top_processes = []
                for proc in psutil.process_iter(['pid', 'cpu_percent']):
                    proc.cpu_percent(interval=0)
                    top_processes.append(proc.info['pid'])
                    if len(top_processes) >= 50:  # Just monitor top 50 by default
                        break
                
                time.sleep(1)  # Wait to let measurements establish
                
                # Update their CPU percentages in our cache
                with _monitor_lock:
                    for pid in top_processes:
                        try:
                            proc = psutil.Process(pid)
                            cpu_percent = proc.cpu_percent(interval=0)
                            
                            if pid not in _process_monitors:
                                _process_monitors[pid] = {
                                    'process': proc,
                                    'last_check': time.time(),
                                    'last_cpu_percent': 0.0,
                                    'cpu_percent': cpu_percent,
                                    'samples': [cpu_percent]
                                }
                            else:
                                _process_monitors[pid]['cpu_percent'] = cpu_percent
                                _process_monitors[pid]['last_check'] = time.time()
                        except:
                            continue
            except:
                pass
                
            time.sleep(3)  # Sleep between monitoring cycles
    
    # Start background thread
    import threading
    monitor_thread = threading.Thread(target=_monitor_background, daemon=True)
    monitor_thread.start()

def _extract_icons_worker():
    """Background thread to extract icons without blocking the main thread"""
    global _is_extracting_icons, _icon_cache
    
    _is_extracting_icons = True
    while True:
        try:
            # Get the next item with a timeout
            exe_path, callback = _icon_extraction_queue.get(timeout=1)
            
            # Extract the icon
            try:
                icon = get_icon_base64(exe_path)
                if icon:
                    _icon_cache[exe_path] = icon
                    if callback:
                        callback(exe_path, icon)
            except Exception as e:
                print(f"Error extracting icon for {exe_path}: {str(e)}")
                
            # Mark task as done
            _icon_extraction_queue.task_done()
            
        except queue.Empty:
            # Queue is empty, check if we should exit
            if _icon_extraction_queue.empty():
                _is_extracting_icons = False
                break

def queue_icon_extraction(exe_path, callback=None):
    """
    Queue an icon for extraction in the background
    
    Args:
        exe_path (str): Path to executable
        callback (callable): Function to call when icon is extracted
    """
    global _icon_extraction_thread, _is_extracting_icons
    
    # Add to queue
    _icon_extraction_queue.put((exe_path, callback))
    
    # Start thread if not running
    if not _is_extracting_icons:
        _icon_extraction_thread = threading.Thread(target=_extract_icons_worker)
        _icon_extraction_thread.daemon = True
        _icon_extraction_thread.start()

def get_file_description(exe_path):
    if sys.platform != 'win32':
        return None
        
    try:
        info = win32api.GetFileVersionInfo(exe_path, '\\')
        string_file_info = info['StringFileInfo']
        for key in string_file_info:
            if "FileDescription" in string_file_info[key]:
                return string_file_info[key]["FileDescription"]
    except:
        return None

def get_icon_base64(exe_path):
    """
    Extract an icon from an executable file and convert it to base64 string
    
    Args:
        exe_path (str): Path to the executable
        
    Returns:
        str: Base64 encoded string of the icon or None if extraction fails
    """
    if sys.platform != 'win32':
        return None
        
    try:
        # Check if file exists and is accessible
        if not os.path.isfile(exe_path) or not os.access(exe_path, os.R_OK):
            return None
            
        # Extract icons - correct argument count
        # ExtractIconEx(fileName, index, numIcons)
        large_icons, small_icons = win32gui.ExtractIconEx(exe_path, 0, 1)
        
        # Use the large icon if available, otherwise use small icon
        if not large_icons and not small_icons:
            return None
            
        icon_handle = large_icons[0] if large_icons else small_icons[0]
        
        try:
            # Get icon info to create bitmap
            icon_info = win32gui.GetIconInfo(icon_handle)
            hbmColor = icon_info[4]  # Color bitmap
            
            # Create device context
            hdc = win32ui.CreateDCFromHandle(win32gui.GetDC(0))
            hdc_mem = hdc.CreateCompatibleDC()
            
            # Get bitmap dimensions
            bm = win32gui.GetObject(hbmColor)
            width, height = bm.bmWidth, bm.bmHeight
            
            # Create bitmap to draw icon on
            hbmp = win32ui.CreateBitmap()
            hbmp.CreateCompatibleBitmap(hdc, width, height)
            hdc_mem.SelectObject(hbmp)
            
            # Draw icon onto bitmap
            hdc_mem.DrawIcon((0, 0), icon_handle)
            
            # Convert bitmap to a PIL Image
            bmpstr = hbmp.GetBitmapBits(True)
            img = Image.frombuffer(
                'RGBA', 
                (width, height),
                bmpstr, 
                'raw', 
                'BGRA', 
                0, 
                1
            )
            
            # Save to buffer as PNG
            buffer = BytesIO()
            img.save(buffer, format="PNG")
            buffer.seek(0)
            
            # Convert to base64
            return f"data:image/png;base64,{base64.b64encode(buffer.getvalue()).decode('utf-8')}"
            
        finally:
            # Clean up resources
            if 'hdc_mem' in locals() and hdc_mem:
                hdc_mem.DeleteDC()
            if 'hdc' in locals() and hdc:
                hdc.DeleteDC()
            if 'hbmp' in locals() and hbmp:
                win32gui.DeleteObject(hbmp.GetHandle())
            if 'hbmColor' in locals():
                win32gui.DeleteObject(hbmColor)
                
            # Release icon handles
            if large_icons:
                for icon in large_icons:
                    win32gui.DestroyIcon(icon)
            if small_icons:
                for icon in small_icons:
                    win32gui.DestroyIcon(icon)
                    
    except Exception as e:
        # Log the error but don't crash the application
        print(f"Icon extraction error: {str(e)}")
        return None

# Dynamic app name cache - will be populated during runtime
_app_name_cache = {}

def get_display_app_name(exe_name, exe_path=None):
    """
    Dynamically determine a user-friendly display name for a process
    
    Args:
        exe_name (str): Process executable filename
        exe_path (str, optional): Full path to executable for metadata extraction
    
    Returns:
        str: User-friendly application name
    """
    # Check if we already have this name cached
    if exe_name.lower() in _app_name_cache:
        return _app_name_cache[exe_name.lower()]
    
    # Try to get a better name from file description if path is available
    if exe_path:
        # First try to get the description from file metadata
        description = get_file_description(exe_path)
        if description:
            # Store normalized description in cache
            friendly_name = description.split(' -')[0].split(' (')[0].strip()
            _app_name_cache[exe_name.lower()] = friendly_name
            return friendly_name
    
    # Apply common naming conventions for well-known programs
    name_without_ext = os.path.splitext(exe_name)[0]
    
    # Handle common naming patterns
    if name_without_ext.lower() in ['chrome', 'msedge', 'firefox']:
        friendly_name = f"{name_without_ext.capitalize()} Browser"
    elif name_without_ext.lower() == 'explorer':
        friendly_name = "File Explorer"
    elif name_without_ext.lower() == 'code':
        friendly_name = "Visual Studio Code"
    elif name_without_ext.lower() == 'devenv':
        friendly_name = "Visual Studio"
    elif 'svchost' in name_without_ext.lower():
        friendly_name = "Windows Service Host"
    else:
        # Default: Capitalize the filename without extension
        friendly_name = name_without_ext.capitalize()
    
    # Cache the result for future lookups
    _app_name_cache[exe_name.lower()] = friendly_name
    return friendly_name

def fetch_process_list():
    processes = []
    for proc in psutil.process_iter(['pid', 'name', 'status']):
        try:
            info = proc.info
            info['cpu_affinity'] = proc.cpu_affinity()
            
            # Get executable path
            try:
                exe_path = proc.exe()
                info['exe'] = exe_path
                
                # Get description and icon
                info['icon'] = get_icon_base64(exe_path)
            except (psutil.AccessDenied, psutil.NoSuchProcess):
                info['exe'] = None
                info['description'] = None
                info['icon'] = None
                
            processes.append(info)
        except (psutil.AccessDenied, psutil.NoSuchProcess, psutil.ZombieProcess):
            continue
    return processes

def fetch_grouped_processes(skip_icons=False, limit=None, incremental_update=True):
    """
    Group processes by application name and rank them by importance with improved performance
    
    Args:
        skip_icons (bool): If True, skip icon extraction to improve performance
        limit (int, optional): Limit the number of processes to fetch per app
        incremental_update (bool): Only process new/changed processes if True
        
    Returns:
        dict: Dictionary with application names as keys and lists of process info
    """
    global _process_cache, _last_cache_time, _icon_cache, _known_processes
    
    # Return cached data if recent enough
    current_time = time.time()
    if current_time - _last_cache_time < _PROCESS_CACHE_TTL:
        return _process_cache

    # Track whether we need a full refresh or incremental update
    is_full_refresh = not incremental_update or not _process_cache
    
    # Use a more efficient way to collect process info - first pass to identify processes
    current_processes = {}
    current_process_paths = set()
    removed_processes = set()
    
    # Keep track of process PIDs by executable path for quick lookup
    if incremental_update and _process_cache:
        # Create a mapping of exe_path to PIDs from the previous cache
        previous_exe_to_pids = {}
        for app_name, processes in _process_cache.items():
            for proc in processes:
                if proc.get('exe'):
                    if proc['exe'] not in previous_exe_to_pids:
                        previous_exe_to_pids[proc['exe']] = []
                    previous_exe_to_pids[proc['exe']].append(proc['pid'])
    
    # First pass - collect basic process data and identify changes
    grouped = {}
    for proc in psutil.process_iter(['pid', 'name', 'exe']):
        try:
            pid = proc.info['pid']
            name = proc.info['name']
            exe_path = proc.info.get('exe')
            
            # Skip processes without valid exe paths
            if not exe_path or not os.path.exists(exe_path):
                continue
            
            # Track current processes
            current_process_paths.add(exe_path)
            current_processes[pid] = proc
            
            display_name = get_display_app_name(name, exe_path)
            
            if display_name not in grouped:
                grouped[display_name] = []
            
            # Create a lightweight process object initially
            proc_info = {
                'pid': pid,
                'name': name,
                'exe': exe_path,
                'status': 'unknown',  # Will be populated later
                'importance_score': 0,  # Will be calculated later
                'description': None,
                'icon': None
            }
            
            # For incremental updates, check if we already have this process cached
            if (is_full_refresh is False and _process_cache and 
                display_name in _process_cache):
                
                # Check if this exact process is in the cache
                cached_proc = next((p for p in _process_cache[display_name] 
                                   if p['pid'] == pid), None)
                
                if cached_proc:
                    # Reuse cached data
                    proc_info = cached_proc
                    # We'll still update status and importance later
            
            grouped[display_name].append(proc_info)
            
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    
    # Identify removed processes
    if incremental_update and _process_cache:
        for app_name, processes in _process_cache.items():
            for proc in processes:
                if proc['pid'] not in current_processes:
                    removed_processes.add(proc['pid'])
    
    # Define a set of new processes that need full processing
    new_processes = set()
    for app_name, processes in grouped.items():
        for proc_info in processes:
            pid = proc_info['pid']
            # Process is new if we don't have status info or it was just spawned
            if proc_info['status'] == 'unknown' or not _process_cache:
                new_processes.add(pid)
    
    # Second pass - update information only for new or changed processes
    processes_to_update = new_processes
    for pid in processes_to_update:
        if pid not in current_processes:
            continue  # Process may have terminated
            
        proc = current_processes[pid]
        for app_name, processes in grouped.items():
            for proc_info in processes:
                if proc_info['pid'] == pid:
                    try:
                        # Get one-shot status update for efficiency
                        with proc.oneshot():
                            proc_info['status'] = proc.status()
                            cpu_percent = proc.cpu_percent(interval=0.05)  # Reduced interval
                            memory_percent = proc.memory_percent()
                            proc_info['importance_score'] = cpu_percent + (memory_percent * 0.5)
                            proc_info['cpu_percent'] = cpu_percent
                            proc_info['memory_percent'] = memory_percent
                            
                            # Add CPU affinity and priority without individual calls
                            try:
                                proc_info['cpu_affinity'] = proc.cpu_affinity()
                            except (psutil.NoSuchProcess, psutil.AccessDenied, AttributeError):
                                proc_info['cpu_affinity'] = []
                            
                            try:
                                proc_info['priority'] = proc.nice()
                            except (psutil.NoSuchProcess, psutil.AccessDenied):
                                proc_info['priority'] = None
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        proc_info['status'] = "access_denied"
    
    # Sort processes within each group by importance
    for app_name in grouped:
        grouped[app_name].sort(key=lambda x: x['importance_score'], reverse=True)
        # Apply limit if specified
        if limit and len(grouped[app_name]) > limit:
            grouped[app_name] = grouped[app_name][:limit]
    
    # If skip_icons is True, return without icons
    if skip_icons:
        _process_cache = grouped.copy()
        _last_cache_time = current_time
        return grouped
    
    # Icon processing - do this in batches and prioritize
    new_exe_paths = current_process_paths - _known_processes
    
    # Only process icons for apps that are likely visible (first app/process of each group)
    visible_apps = set()
    for app_name, processes in grouped.items():
        if processes:  # Ensure the app has at least one process
            main_proc = processes[0]
            visible_apps.add(main_proc['exe'])
    
    # Prioritize which icons to process
    icon_priority_list = []
    
    # 1. First priority: New visible apps
    for exe_path in new_exe_paths:
        if exe_path in visible_apps:
            icon_priority_list.append(exe_path)
            
    # 2. Second priority: Visible apps without icons
    for exe_path in visible_apps:
        if exe_path not in _icon_cache and exe_path not in icon_priority_list:
            icon_priority_list.append(exe_path)
    
    # 3. Add remaining new apps (not visible) with lower priority
    for exe_path in new_exe_paths:
        if exe_path not in icon_priority_list:
            icon_priority_list.append(exe_path)
    
    # Extract icons for the priority list, limited by batch size
    icon_extraction_count = 0
    early_timeout = False
    
    # Time the icon extraction process
    icon_extraction_start = time.time()
    
    # Process icons in order of priority
    for exe_path in icon_priority_list:
        # Check if we've reached our batch limit
        if icon_extraction_count >= _ICON_BATCH_SIZE:
            break
            
        # Check if we've been extracting icons for too long
        if time.time() - icon_extraction_start > _MAX_ICON_EXTRACTION_TIME:
            early_timeout = True
            break
        
        # Extract icon
        queue_icon_extraction(exe_path)
        icon_extraction_count += 1
        
        # Also get description for new applications
        description = get_file_description(exe_path)
        if description:
            for app_name, processes in grouped.items():
                for process in processes:
                    if process['exe'] == exe_path:
                        process['description'] = description
    
    # Apply existing cached icons for processes without icons
    for app_name, processes in grouped.items():
        for process in processes:
            exe_path = process.get('exe')
            if exe_path and not process.get('icon') and exe_path in _icon_cache:
                process['icon'] = _icon_cache[exe_path]
    
    # Update the known processes list with current processes
    _known_processes = current_process_paths
    
    # Update cache
    _process_cache = grouped
    _last_cache_time = current_time
    
    return grouped

def set_process_priority(pid, priority_class):
    """
    Set the priority class of a process
    
    Args:
        pid (int): Process ID
        priority_class (int): Priority class constant from psutil
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        process = psutil.Process(pid)
        
        # Set the priority
        process.nice(priority_class)
        
        # Return True immediately - don't try to verify the change
        return True
    except Exception as e:
        print(f"Error setting process priority: {str(e)}")
        return False

def set_process_affinity(pid, cores):
    """
    Set CPU affinity for a process with protection for critical processes
    
    Args:
        pid (int): Process ID
        cores (list): List of CPU cores to use
    
    Returns:
        dict: Result of operation including success status and message
    """
    try:
        process = psutil.Process(pid)
        
        # Get process name for protection check
        process_name = process.name().lower()
        
        # List of critical system processes that shouldn't be restricted to one core
        critical_system_processes = [
            "system", "svchost", "lsass", "csrss", "winlogon", "services", "explorer"
        ]
        
        # If this is a system process and being limited to one core, prevent it
        if process_name in critical_system_processes and len(cores) == 1:
            return {
                "success": False,
                "message": f"Restricting {process_name} to a single core is not allowed for system stability"
            }
            
        # If this is heavily using CPU (>150%) and being limited to one core, warn but allow
        cpu_percent = process.cpu_percent(interval=0.1)
        if cpu_percent > 150 and len(cores) == 1:
            # Set affinity but return warning
            process.cpu_affinity(cores)
            return {
                "success": True,
                "warning": f"This process was using {cpu_percent:.1f}% CPU. Performance may be reduced."
            }
            
        # Normal case - set affinity
        process.cpu_affinity(cores)
        return {"success": True}
    except (psutil.NoSuchProcess, psutil.AccessDenied, ValueError) as e:
        return {"success": False, "message": f"Error setting affinity: {e}"}

def end_process(pid):
    """
    Terminate a single process
    
    Args:
        pid (int): Process ID to terminate
        
    Returns:
        tuple: (success, error_message)
    """
    try:
        process = psutil.Process(pid)
        process.terminate()
        
        # Wait briefly to see if the process exits
        gone, alive = psutil.wait_procs([process], timeout=3)
        
        # If still alive, try to kill it
        if process in alive:
            process.kill()
            
        return True, None
    except psutil.AccessDenied:
        return False, "Access denied: insufficient permissions to terminate this process"
    except psutil.NoSuchProcess:
        return False, "Process no longer exists"
    except Exception as e:
        return False, f"Error terminating process: {str(e)}"

def end_process_tree(pid):
    """
    Terminate a process and all its children
    
    Args:
        pid (int): Process ID of the parent process to terminate
        
    Returns:
        tuple: (success, error_message)
    """
    try:
        parent = psutil.Process(pid)
        
        # Get all child processes
        children = parent.children(recursive=True)
        
        # Add the parent to the list
        processes = children + [parent]
        
        # Try to terminate all processes
        for p in processes:
            try:
                p.terminate()
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        
        # Wait for processes to terminate and force kill any that remain
        gone, alive = psutil.wait_procs(processes, timeout=3)
        for p in alive:
            try:
                p.kill()
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
                
        return True, None
    except psutil.AccessDenied:
        return False, "Access denied: insufficient permissions to terminate this process tree"
    except psutil.NoSuchProcess:
        return False, "Process no longer exists"
    except Exception as e:
        return False, f"Error terminating process tree: {str(e)}"

def fetch_process_metrics(pids):
    """
    Fetch current CPU and memory usage metrics with enhanced real-time monitoring
    """
    result = {}
    
    # Convert string PIDs to integers if needed
    if pids and isinstance(pids[0], str):
        pids = [int(pid) for pid in pids]
    
    with _monitor_lock:
        current_time = time.time()
        
        # Initialize monitoring for new processes
        for pid in pids:
            try:
                if pid not in _process_monitors:
                    proc = psutil.Process(pid)
                    # Initialize CPU measurement
                    cpu_percent = proc.cpu_percent(interval=0)
                    # Get initial memory info
                    memory_percent = proc.memory_percent()
                    
                    _process_monitors[pid] = {
                        'process': proc,
                        'last_check': current_time,
                        'last_cpu_percent': 0.0,
                        'cpu_percent': cpu_percent,
                        'last_memory_percent': 0.0,
                        'memory_percent': memory_percent,
                        'cpu_samples': [],
                        'memory_samples': []
                    }
                    
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        
        # Short delay to allow measurements to register
        time.sleep(0.05)
        
        # Get updated measurements
        for pid in list(_process_monitors.keys()):
            if pid not in pids:
                continue
                
            try:
                monitor = _process_monitors[pid]
                proc = monitor['process']
                
                # Get fresh readings
                new_cpu_percent = proc.cpu_percent(interval=0)
                new_memory_percent = proc.memory_percent()
                memory_info = proc.memory_info()
                
                # Record previous values before updating
                monitor['last_cpu_percent'] = monitor['cpu_percent']
                monitor['last_memory_percent'] = monitor['memory_percent']
                
                # Add to rolling averages for stability
                monitor['cpu_samples'].append(new_cpu_percent)
                monitor['memory_samples'].append(new_memory_percent)
                
                if len(monitor['cpu_samples']) > 3:
                    monitor['cpu_samples'].pop(0)
                if len(monitor['memory_samples']) > 3:
                    monitor['memory_samples'].pop(0)
                
                # Calculate smooth metrics (average of samples)
                if monitor['cpu_samples']:
                    monitor['cpu_percent'] = sum(monitor['cpu_samples']) / len(monitor['cpu_samples'])
                else:
                    monitor['cpu_percent'] = new_cpu_percent
                    
                if monitor['memory_samples']:
                    monitor['memory_percent'] = sum(monitor['memory_samples']) / len(monitor['memory_samples'])
                else:
                    monitor['memory_percent'] = new_memory_percent
                
                monitor['last_check'] = current_time
                
                # Calculate direction of changes for UI indicators
                cpu_change = 0
                if abs(monitor['cpu_percent'] - monitor['last_cpu_percent']) > 0.5:
                    cpu_change = 1 if monitor['cpu_percent'] > monitor['last_cpu_percent'] else -1
                
                memory_change = 0
                if abs(monitor['memory_percent'] - monitor['last_memory_percent']) > 0.2:
                    memory_change = 1 if monitor['memory_percent'] > monitor['last_memory_percent'] else -1
                
                result[pid] = {
                    "cpu_percent": monitor['cpu_percent'],
                    "cpu_change": cpu_change,  # 1=increasing, 0=stable, -1=decreasing
                    "memory_percent": monitor['memory_percent'],
                    "memory_change": memory_change,  # 1=increasing, 0=stable, -1=decreasing
                    "memory_rss": memory_info.rss,
                    "memory_vms": memory_info.vms,
                    "status": str(proc.status())
                }
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                if pid in _process_monitors:
                    del _process_monitors[pid]
                continue
                
        # Cleanup old processes
        for pid in list(_process_monitors.keys()):
            if current_time - _process_monitors[pid]['last_check'] > 60:
                del _process_monitors[pid]
    
    return result
