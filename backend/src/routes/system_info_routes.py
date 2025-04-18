from fastapi import APIRouter
from ..controllers.system_info_controller import get_system_info  

router = APIRouter()

@router.get("/system-info")
def system_info():
    return get_system_info()
