from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.routes import process_routes  # import your router
from src.routes import system_info_routes  # import your router

app = FastAPI()

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(process_routes.router)
app.include_router(system_info_routes.router)

import uvicorn

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
