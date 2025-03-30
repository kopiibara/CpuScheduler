from fastapi import APIRouter, UploadFile, File
from ..controllers.ProcessController import submit_processes, upload_processes, generate_processes

router = APIRouter()

@router.post("/submit_processes")
async def api_submit_processes(processes: list):
    return submit_processes(processes)

@router.post("/upload_processes")
async def api_upload_processes(file: UploadFile = File(...)):
    return await upload_processes(file)

@router.get("/generate_processes")
async def api_generate_processes():
    return generate_processes()
