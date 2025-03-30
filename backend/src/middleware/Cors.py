from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

def setup_cors(app: FastAPI) -> FastAPI:
    """
    Configure CORS middleware for the FastAPI application
    
    Args:
        app: FastAPI application instance
    """
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # For development; restrict this in production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    return app