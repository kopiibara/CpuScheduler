import psutil
import os
import base64
from io import BytesIO
import sys

# Import Windows-specific modules only if on Windows
if sys.platform == 'win32':
    import win32api
    import win32gui
    import win32ui
    import win32con
    from PIL import Image

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
    if sys.platform != 'win32':
        return None
        
    try:
        large, small = win32gui.ExtractIconEx(exe_path, 0)
        if large:
            hicon = large[0]
            hdc = win32ui.CreateDCFromHandle(win32gui.GetDC(0))
            hbmp = win32ui.CreateBitmap()
            hbmp.CreateCompatibleBitmap(hdc, 32, 32)
            hdc = hdc.CreateCompatibleDC()
            hdc.SelectObject(hbmp)
            win32gui.DrawIconEx(hdc.GetHandleOutput(), 0, 0, hicon, 32, 32, 0, None, win32con.DI_NORMAL)

            bmpinfo = hbmp.GetInfo()
            bmpstr = hbmp.GetBitmapBits(True)

            im = Image.frombuffer(
                'RGB',
                (bmpinfo['bmWidth'], bmpinfo['bmHeight']),
                bmpstr, 'raw', 'BGRX', 0, 1)

            buffered = BytesIO()
            im.save(buffered, format="PNG")
            img_str = base64.b64encode(buffered.getvalue()).decode()
            
            # Clean up resources
            win32gui.DestroyIcon(hicon)
            for icon in large:
                if icon != hicon:
                    win32gui.DestroyIcon(icon)
            for icon in small:
                win32gui.DestroyIcon(icon)
                
            return f"data:image/png;base64,{img_str}"
    except Exception as e:
        print(f"Icon error: {e}")
        return None

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

def set_process_priority(pid, priority_class):
    """
    Set the priority class for a process
    
    Args:
        pid (int): Process ID
        priority_class (int): One of psutil priority constants
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        process = psutil.Process(pid)
        process.nice(priority_class)
        return True
    except (psutil.NoSuchProcess, psutil.AccessDenied, ValueError) as e:
        print(f"Error setting priority: {e}")
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
