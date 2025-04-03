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

import uvicorn

# Add a health endpoint for the Electron app to check
@app.get("/health")
def health():
    return {"status": "ok"}

# This block is important for running the server when the file is executed directly
if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)