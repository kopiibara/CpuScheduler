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
    # Generate between 1 and 8 random processes
    num_processes = random.randint(5, 20)  
    process_store = [
        {
            "id": i + 1, 
            "index": i + 1,
            "arrival": str(random.randint(0, 64)), 
            "burst": str(random.randint(1, 64)), 
            "priority": str(random.randint(1, 64))
        }
        for i in range(num_processes)
    ]
    return process_store