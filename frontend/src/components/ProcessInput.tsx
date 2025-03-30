import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  Input,
  Typography,
} from "@mui/material";
import { Process } from "../types/ProcessObject"; // Adjust the import path as necessary

const ProcessInput = () => {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [file, setFile] = useState<File | null>(null);

  // Add a new process row
  const addProcess = () => {
    setProcesses([
      ...processes,
      { id: processes.length + 1, arrivalTime: 0, burstTime: 0, priority: 0 },
    ]);
  };

  // Update process data
  const updateProcess = (index: number, key: keyof Process, value: number) => {
    const newProcesses = [...processes];
    newProcesses[index][key] = value;
    setProcesses(newProcesses);
  };

  // Handle file selection
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  // Upload file to backend
  const uploadFile = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/upload_processes`,
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();
      alert(result.message);
    } catch (error) {
      console.error("Error uploading file", error);
    }
  };

  // Submit processes to backend
  const submitProcesses = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/submit_processes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ processes }),
        }
      );

      const result = await response.json();
      alert(result.message);
    } catch (error) {
      console.error("Error submitting processes", error);
    }
  };

  // Generate random processes from backend
  const generateRandomProcesses = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/generate_processes`
      );
      const data = await response.json();
      setProcesses(data);
    } catch (error) {
      console.error("Error generating random processes", error);
    }
  };

  return (
    <div
      style={{
        padding: 2,
        maxWidth: "800px",
        margin: "auto",
        overflowY: "auto",
      }}
    >
      <Typography
        variant="h5"
        sx={{ color: "#191C20", mb: 3, fontWeight: 600 }}
      >
        Process Input
      </Typography>

      <TableContainer
        component={Paper}
        sx={{ maxHeight: 600, overflowY: "auto" }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Arrival Time</TableCell>
              <TableCell>Burst Time</TableCell>
              <TableCell>Priority</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {processes.map((process, index) => (
              <TableRow key={index}>
                <TableCell>{process.id}</TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={process.arrivalTime}
                    onChange={(e) =>
                      updateProcess(
                        index,
                        "arrivalTime",
                        Number(e.target.value)
                      )
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={process.burstTime}
                    onChange={(e) =>
                      updateProcess(index, "burstTime", Number(e.target.value))
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={process.priority || 0}
                    onChange={(e) =>
                      updateProcess(index, "priority", Number(e.target.value))
                    }
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
        <Button variant="contained" color="primary" onClick={addProcess}>
          Add Process
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={generateRandomProcesses}
        >
          Generate Random
        </Button>
        <Input type="file" onChange={handleFileUpload} />
        <Button variant="contained" color="warning" onClick={uploadFile}>
          Upload File
        </Button>
        <Button variant="contained" color="success" onClick={submitProcesses}>
          Submit
        </Button>
      </div>
    </div>
  );
};

export default ProcessInput;
