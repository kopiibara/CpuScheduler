from fastapi import Request
from fastapi.responses import JSONResponse
from ..services.SchedulingService import SchedulingService

class SchedulingController:
    def __init__(self):
        self.scheduling_service = SchedulingService()

    async def simulate(self, request: Request):
        try:
            data = await request.json()
            print("Received request data:", data)  # Debug log
            
            # Check if the request has been cancelled
            if await request.is_disconnected():
                print("Request was cancelled by client")
                return JSONResponse(
                    status_code=499,
                    content={"error": "Request cancelled"}
                )
            
            processes = data.get('processes', [])
            algorithm = data.get('algorithm')
            time_quantum = data.get('timeQuantum')
            preemptive = data.get('preemptive', False)

            if not processes or not isinstance(processes, list):
                print("Invalid processes data:", processes)  # Debug log
                return JSONResponse(
                    status_code=400,
                    content={"error": "Invalid processes data"}
                )

            if not algorithm:
                print("Algorithm not specified")  # Debug log
                return JSONResponse(
                    status_code=400,
                    content={"error": "Algorithm not specified"}
                )

            print(f"Processing {len(processes)} processes with algorithm: {algorithm}")  # Debug log

            result = None
            algorithm = algorithm.lower()
            if algorithm == "fcfs":
                result = self.scheduling_service.fcfs(processes)
            elif algorithm == "sjf":
                result = self.scheduling_service.sjf(processes)
            elif algorithm == "srtf":
                result = self.scheduling_service.srtf(processes)
            elif algorithm == "priority":
                result = self.scheduling_service.priority(processes, preemptive)
            elif algorithm == "rr":
                if not time_quantum:
                    print("Time quantum not specified for Round Robin")  # Debug log
                    return JSONResponse(
                        status_code=400,
                        content={"error": "Time quantum not specified for Round Robin"}
                    )
                result = self.scheduling_service.round_robin(processes, time_quantum)
            else:
                print(f"Invalid algorithm specified: {algorithm}")  # Debug log
                return JSONResponse(
                    status_code=400,
                    content={"error": "Invalid algorithm specified"}
                )

            if not result:
                print("No result returned from scheduling service")  # Debug log
                return JSONResponse(
                    status_code=500,
                    content={"error": "No result returned from scheduling service"}
                )

            print("Successfully generated result:", result)  # Debug log
            return JSONResponse(content=result)
        except Exception as error:
            print("Scheduling simulation error:", error)
            import traceback
            print("Full traceback:", traceback.format_exc())  # Debug log
            return JSONResponse(
                status_code=500,
                content={"error": f"Internal server error: {str(error)}"}
            )