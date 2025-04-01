from fastapi import Request
from fastapi.responses import JSONResponse
from ..services.SchedulingService import SchedulingService

class SchedulingController:
    def __init__(self):
        self.scheduling_service = SchedulingService()

    async def simulate(self, request: Request):
        try:
            data = await request.json()
            processes = data.get('processes', [])
            algorithm = data.get('algorithm')
            time_quantum = data.get('timeQuantum')

            if not processes or not isinstance(processes, list):
                return JSONResponse(
                    status_code=400,
                    content={"error": "Invalid processes data"}
                )

            if not algorithm:
                return JSONResponse(
                    status_code=400,
                    content={"error": "Algorithm not specified"}
                )

            result = None
            algorithm = algorithm.lower()
            if algorithm == "fcfs":
                result = self.scheduling_service.fcfs(processes)
            elif algorithm == "sjf":
                result = self.scheduling_service.sjf(processes)
            elif algorithm == "priority":
                result = self.scheduling_service.priority(processes)
            elif algorithm == "rr":
                if not time_quantum:
                    return JSONResponse(
                        status_code=400,
                        content={"error": "Time quantum not specified for Round Robin"}
                    )
                result = self.scheduling_service.round_robin(processes, time_quantum)
            else:
                return JSONResponse(
                    status_code=400,
                    content={"error": "Invalid algorithm specified"}
                )

            return JSONResponse(content=result)
        except Exception as error:
            print("Scheduling simulation error:", error)
            return JSONResponse(
                status_code=500,
                content={"error": "Internal server error"}
            )