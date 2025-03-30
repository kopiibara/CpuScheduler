from fastapi import APIRouter
from ..controllers.SystemInfoController import get_system_info  # Use relative import

router = APIRouter()

@router.get("/system-info")
def system_info():
    return get_system_info()
