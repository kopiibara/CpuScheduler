from fastapi import FastAPI
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