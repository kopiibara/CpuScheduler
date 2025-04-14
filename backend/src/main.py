from fastapi import FastAPI
from fastapi.responses import JSONResponse
import psutil  # You'll need to install this: pip install psutil
from src.middleware.Cors import setup_cors  # Use correct import path
from src.routes import SystemInfoRoutes     # Use correct import path
from src.routes import ProcessRoutes       # Use correct import path
from src.routes import SchedulingRoutes    # Use correct import path

app = FastAPI()

# Apply CORS middleware
app = setup_cors(app)

# Register routes explicitly
app.include_router(SystemInfoRoutes.router)
app.include_router(ProcessRoutes.router)
app.include_router(SchedulingRoutes.router)

@app.get("/")
def home():
    return {"message": "Welcome to the CPU Scheduling API"}

# Add a health endpoint for the Electron app to check
@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/system_processes")
def get_system_processes():
    try:
        system_processes = []
        # Get running processes
        for i, proc in enumerate(psutil.process_iter(['pid', 'name', 'cpu_percent']), 1):
            info = proc.info
            if info['cpu_percent'] > 0:  # Only include processes using CPU
                system_processes.append({
                    "id": i,
                    "index": i,
                    "arrival": "0",  # Default arrival time
                    "burst": str(max(1, round(info['cpu_percent']))),  # Use CPU percent as burst time
                    "priority": str(i % 10)  # Assign a pseudo-priority
                })
                
                # Limit to max 10 processes
                if i >= 10:
                    break
                    
        return JSONResponse(content=system_processes[:10])  # Return at most 10 processes
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

import uvicorn

# This block is important for running the server when the file is executed directly
if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)