import psutil
import os
import base64
from io import BytesIO
import sys
import tempfile
import time

# Import Windows-specific modules only if on Windows
if sys.platform == 'win32':
    import win32api
    import win32gui
    import win32ui
    import win32con
    from PIL import Image

# Update these constants for better performance
_ICON_BATCH_SIZE = 100  # Increased from 20 to handle more icons
_MAX_ICON_EXTRACTION_TIME = 0.5  # Slightly increased timeout
_PROCESS_CACHE_TTL = 3  # Reduced cache time for more frequent updates

# Add these global variables for caching
_process_cache = {}
_last_cache_time = 0
_icon_cache = {}  # Icon cache
_known_processes = set()  # Track known process paths to identify new ones

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

def fetch_grouped_processes(skip_icons=False, limit=None):
    """
    Group processes by application name and rank them by importance
    
    Args:
        skip_icons (bool): If True, skip icon extraction to improve performance
        limit (int, optional): Limit the number of processes to fetch per app
        
    Returns:
        dict: Dictionary with application names as keys and lists of process info
    """
    global _process_cache, _last_cache_time, _icon_cache, _known_processes
    
    # Return cached data if recent enough
    if time.time() - _last_cache_time < _PROCESS_CACHE_TTL:
        return _process_cache

    grouped = {}
    current_processes = set()  # Track processes in this fetch cycle

    # Collect all process info
    for proc in psutil.process_iter(['pid', 'name', 'exe']):
        try:
            name = proc.info['name']
            exe_path = proc.info.get('exe')
            
            # Skip processes without valid exe paths
            if not exe_path or not os.path.exists(exe_path):
                continue
                
            # Track current processes
            current_processes.add(exe_path)
            
            display_name = get_display_app_name(name, exe_path)
            
            # Calculate importance metrics
            importance_score = 0
            
            try:
                with proc.oneshot():  # Efficiently get multiple info in one call
                    status = proc.status()
                    cpu_percent = proc.cpu_percent(interval=0.1)
                    memory_percent = proc.memory_percent()
                    importance_score = cpu_percent + (memory_percent * 0.5)
                    
                    # Add bonus for specific process types
                    if name.lower() in ['explorer.exe', 'system']:
                        importance_score += 10
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                status = "unknown"

            if display_name not in grouped:
                grouped[display_name] = []

            # Get process information
            proc_info = {
                'pid': proc.info['pid'],
                'name': name,
                'exe': exe_path,
                'status': status,
                'importance_score': importance_score,
                'description': None,  # Will be populated later if needed
                'icon': None,  # Initialize with None
                'cpu_percent': cpu_percent,
                'memory_percent': memory_percent
            }
            
            # Add CPU affinity if available
            try:
                proc_info['cpu_affinity'] = proc.cpu_affinity()
            except (psutil.NoSuchProcess, psutil.AccessDenied, AttributeError):
                proc_info['cpu_affinity'] = []
            
            # Add process priority if available
            try:
                proc_info['priority'] = proc.nice()
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                proc_info['priority'] = None
                
            grouped[display_name].append(proc_info)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

    # Sort processes within each group by importance
    for app_name in grouped:
        grouped[app_name].sort(key=lambda x: x['importance_score'], reverse=True)
        # Apply limit if specified
        if limit and len(grouped[app_name]) > limit:
            grouped[app_name] = grouped[app_name][:limit]
    
    # If skip_icons is True, return without icons
    if skip_icons:
        _process_cache = grouped.copy()
        _last_cache_time = time.time()
        return grouped
    
    # Identify new processes that weren't seen before
    new_processes = current_processes - _known_processes
    
    # Extract icons - prioritize new applications first
    icon_extraction_count = 0
    # First batch: Process new applications
    for app_name, processes in grouped.items():
        if not processes:
            continue
        
        # Get the most important process for this app
        main_process = processes[0]
        exe_path = main_process['exe']
        
        if not exe_path:
            continue
            
        # Prioritize new applications - extract their icons first
        if exe_path in new_processes and exe_path not in _icon_cache:
            if icon_extraction_count >= _ICON_BATCH_SIZE // 2:  # Use half the batch size for new apps
                break  # Reached new app extraction limit
                
            # Extract icon
            icon_start = time.time()
            icon = get_icon_base64(exe_path)
            
            # Check timeout
            icon_extraction_time = time.time() - icon_start
            if icon_extraction_time > _MAX_ICON_EXTRACTION_TIME:
                print(f"Icon extraction for {exe_path} took too long ({icon_extraction_time:.2f}s)")
                
            icon_extraction_count += 1
            
            # Cache the icon if valid
            if icon:
                _icon_cache[exe_path] = icon
                
                # Apply icon to all processes with same exe path
                for process in processes:
                    if process['exe'] == exe_path:
                        process['icon'] = icon
                        
                # Also get description for new applications
                description = get_file_description(exe_path)
                if description:
                    for process in processes:
                        if process['exe'] == exe_path:
                            process['description'] = description

    # Second batch: Process remaining applications that need icons
    remaining_batch = _ICON_BATCH_SIZE - icon_extraction_count
    if remaining_batch > 0:
        for app_name, processes in grouped.items():
            if not processes:
                continue
                
            main_process = processes[0]
            exe_path = main_process['exe']
            
            if not exe_path:
                continue
                
            # Skip if we already processed this in the first batch
            if exe_path in new_processes:
                continue
                
            # Get icon for this exe_path (use cache if available)
            if exe_path in _icon_cache:
                icon = _icon_cache[exe_path]
                # Apply cached icon to all processes with same exe path
                for process in processes:
                    if process['exe'] == exe_path:
                        process['icon'] = icon
            else:
                # Check batch limit
                if icon_extraction_count >= _ICON_BATCH_SIZE:
                    break
                    
                # Extract icon
                icon = get_icon_base64(exe_path)
                icon_extraction_count += 1
                
                # Cache the icon if valid
                if icon:
                    _icon_cache[exe_path] = icon
                    
                    # Apply icon to all processes with same exe path
                    for process in processes:
                        if process['exe'] == exe_path:
                            process['icon'] = icon
    
    # Update the known processes list with current processes
    _known_processes = current_processes
    
    # Update cache
    _process_cache = grouped
    _last_cache_time = time.time()
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
    Set CPU affinity for a process
    
    Args:
        pid (int): Process ID
        cores (list): List of CPU cores to use
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        process = psutil.Process(pid)
        process.cpu_affinity(cores)
        return True
    except (psutil.NoSuchProcess, psutil.AccessDenied, ValueError) as e:
        print(f"Error setting affinity: {e}")
        return False
