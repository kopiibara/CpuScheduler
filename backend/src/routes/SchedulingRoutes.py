from fastapi import APIRouter, Request
from ..controllers.SchedulingController import SchedulingController

router = APIRouter()

@router.post("/simulate")
async def simulate_scheduling(request: Request):
    controller = SchedulingController()
    return await controller.simulate(request)