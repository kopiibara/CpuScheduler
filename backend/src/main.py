from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.routes import process_routes, system_info_routes, scheduling_routes
import uvicorn
import sys
import os

app = FastAPI()

# Middleware for CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For Electron or web frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Route registration
app.include_router(process_routes.router)
app.include_router(system_info_routes.router)
app.include_router(scheduling_routes.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}

# This part allows both:
# - Running with `uvicorn src.main:app --reload`
# - Compiling with PyInstaller and running `backend_server.exe`
if __name__ == "__main__":
    # Set up uvicorn config with log level that works in both modes
    log_config = uvicorn.config.LOGGING_CONFIG
    # Modify log config to work in both windowed and console modes
    for handler in log_config["handlers"].values():
        if "stream" in handler:
            handler.pop("stream", None)
    
    # Check if we're running as a bundled exe
    if getattr(sys, 'frozen', False):
        # If inside PyInstaller bundle
        import importlib.util
        # Get the path to the application root
        application_path = os.path.dirname(sys.executable) if getattr(sys, 'frozen', False) else os.path.dirname(os.path.abspath(__file__))
        
        # When packaged, use a different import strategy
        uvicorn.run(app, host="127.0.0.1", port=8000, log_config=log_config)
    else:
        # Normal development mode
        uvicorn.run("src.main:app", host="127.0.0.1", port=8000, log_config=log_config)
