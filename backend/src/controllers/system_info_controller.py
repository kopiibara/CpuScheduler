import psutil
import platform
import re
import subprocess
import os

def get_system_info():
    """Fetches system specifications"""
    # Get processor information
    processor = platform.processor()

    # Get cpu architecture
    cpu_architecture = platform.architecture()[0]
    
    # Clean up processor name to be more user-friendly
    # On Windows, this might show something like "AMD64 Family 25 Model 80 Stepping 0, AuthenticAMD"
    if platform.system() == "Windows":
        try:
            import winreg
            key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"HARDWARE\DESCRIPTION\System\CentralProcessor\0")
            processor = winreg.QueryValueEx(key, "ProcessorNameString")[0].strip()
        except:
            # Fallback to a simple processor name pattern extraction
            match = re.search(r'(Intel|AMD|ARM).*', processor)
            if match:
                processor = match.group(0)
    
    

    # Convert frequency from MHz to GHz
    cpu_freq = psutil.cpu_freq()
    frequency_mhz = cpu_freq.max if cpu_freq else 0
    frequency_ghz = round(frequency_mhz / 1000, 2) if frequency_mhz else "Unknown"

    architecture = platform.architecture()[0]
    
    # Format threads with "Threads" suffix
    threads = psutil.cpu_count(logical=True)
    threads_formatted = f"{threads} Threads" if threads else "Unknown"
    
    # Format cores with "cores" suffix
    cores = psutil.cpu_count(logical=False)
    cores_formatted = f"{cores} cores" if cores else "Unknown"

    # Get CPU scheduling policy
    scheduling_policy = get_cpu_scheduling_policy()

    # Get properly formatted OS information
    os_info = get_os_info()
    
    return {
        "manufacturer": processor,
        "cpu_architecture": cpu_architecture,  
        "cores": cores_formatted,
        "architecture": architecture,
        "threads": threads_formatted,
        "frequency": f"{frequency_ghz} GHz" if isinstance(frequency_ghz, float) else frequency_ghz,
        "ram": f"{round(psutil.virtual_memory().total / (1024 ** 3), 1)} GB",  
        "os": os_info,
        "schedulingPolicy": scheduling_policy
    }

def get_os_info():
    """Gets detailed OS information including edition for Windows"""
    system = platform.system()
    
    if system == "Windows":
        try:
            import winreg
            # Get Windows edition from registry
            key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, 
                                "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion")
            
            # Check if it's Windows 11 by build number
            build_number = int(winreg.QueryValueEx(key, "CurrentBuildNumber")[0])
            major_version = 0
            try:
                # This exists in Windows 10 and 11
                major_version = int(winreg.QueryValueEx(key, "CurrentMajorVersionNumber")[0])
            except:
                pass
            
            # Get product name (includes edition like "Pro")
            product_name = winreg.QueryValueEx(key, "ProductName")[0]
            
            # Check if this is actually Windows 11 (build 22000 or higher)
            if build_number >= 22000:
                # Extract edition from product name (like "Pro" from "Windows 10 Pro")
                edition = product_name.split(" ")[-1] if " " in product_name else ""
                return f"Windows 11 {edition}".strip()
            else:
                # It's Windows 10 or earlier
                return product_name
            
        except Exception as e:
            # Fallback to basic platform information
            return f"{system} {platform.release()}"
    else:
        # For non-Windows systems, use the original approach
        return f"{system} {platform.release()}"

def get_cpu_scheduling_policy():
    """Gets the current CPU scheduling policy of the system"""
    try:
        if platform.system() == "Windows":
            # On Windows, we can get scheduling information using the powercfg command
            result = subprocess.run(
                ["powercfg", "/getactivescheme"], 
                capture_output=True, 
                text=True,
                shell=True
            )
            if result.returncode == 0:
                # Extract the power scheme name which includes scheduling policy
                match = re.search(r'Power Scheme GUID:.*\((.*)\)', result.stdout)
                if match:
                    power_scheme = match.group(1)
                    
                    # Map power schemes to common scheduling policies
                    if "Balanced" in power_scheme:
                        return "Balanced (Windows default scheduler)"
                    elif "High performance" in power_scheme:
                        return "High Performance"
                    elif "Power saver" in power_scheme:
                        return "Power Saver"
                    else:
                        return power_scheme
            
            # Alternative approach: get processor performance boost policy
            result = subprocess.run(
                ["powercfg", "/query", "SCHEME_CURRENT", "SUB_PROCESSOR", "PERFBOOSTMODE"], 
                capture_output=True, 
                text=True,
                shell=True
            )
            if result.returncode == 0:
                if "Aggressive" in result.stdout:
                    return "Aggressive (Performance oriented)"
                elif "Efficient" in result.stdout:
                    return "Efficient (Energy saving)"
                
            return "Windows default scheduler"
            
        elif platform.system() == "Linux":
            # On Linux, we can use the chrt command
            result = subprocess.run(
                ["chrt", "-p", str(os.getpid())], 
                capture_output=True, 
                text=True
            )
            if result.returncode == 0:
                if "SCHED_OTHER" in result.stdout:
                    return "SCHED_OTHER (Standard round-robin time-sharing policy)"
                elif "SCHED_FIFO" in result.stdout:
                    return "SCHED_FIFO (First In-First Out real-time policy)"
                elif "SCHED_RR" in result.stdout:
                    return "SCHED_RR (Round-Robin real-time policy)"
                elif "SCHED_BATCH" in result.stdout:
                    return "SCHED_BATCH (Batch scheduling policy)"
                elif "SCHED_IDLE" in result.stdout:
                    return "SCHED_IDLE (Low priority background tasks)"
                elif "SCHED_DEADLINE" in result.stdout:
                    return "SCHED_DEADLINE (Deadline scheduling policy)"
            
            # Try alternative approach
            result = subprocess.run(
                ["cat", "/sys/block/sda/queue/scheduler"], 
                capture_output=True, 
                text=True
            )
            if result.returncode == 0:
                return f"I/O Scheduler: {result.stdout.strip()}"
                
            return "Standard Linux scheduler"
            
        elif platform.system() == "Darwin":  # macOS
            return "Grand Central Dispatch (macOS)"
            
        else:
            return "Unknown scheduling policy"
            
    except Exception as e:
        return f"Unavailable ({str(e)})"