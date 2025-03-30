import pandas as pd
import random
from typing import List, Dict
from fastapi import UploadFile

# Store processes in memory (temporary)
process_store = []

def submit_processes(processes: List[Dict]):
    """Saves submitted processes to memory"""
    global process_store
    process_store = processes
    return {"message": "Processes received", "data": processes}

async def upload_processes(file: UploadFile):
    """Parses process data from uploaded file"""
    global process_store
    if file.filename.endswith(".csv"):
        df = pd.read_csv(file.file)
    elif file.filename.endswith(".json"):
        df = pd.read_json(file.file)
    else:
        return {"error": "Unsupported file format"}
    
    process_store = df.to_dict(orient="records")
    return {"message": "File uploaded", "data": process_store}

def generate_processes():
    """Generates random process data for demonstration"""
    global process_store
    process_store = [
        {"id": i + 1, "arrivalTime": random.randint(0, 10), "burstTime": random.randint(1, 10), "priority": random.randint(1, 6)}
        for i in range(6)
    ]
    return process_store