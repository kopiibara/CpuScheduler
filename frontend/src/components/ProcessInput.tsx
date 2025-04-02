import { Stack, Tooltip, Box } from "@mui/material";
import { useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloseIcon from "@mui/icons-material/CloseRounded";
import { schedulingService } from "../services/SchedulingService";
import ShuffleIcon from "@mui/icons-material/ShuffleRounded";
import "../style/custom-scrollbar.css";
import { useProcessSorting } from "../hooks/useProcessSorting";
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

// Use unique IDs that don't change when reindexing
let nextId = 2; // Start with 2 since we already have process 1

interface ProcessInputProps {
  onSimulationResult: (result: any) => void;
  selectedAlgorithm: string;
}

const ProcessInput: React.FC<ProcessInputProps> = ({
  onSimulationResult,
  selectedAlgorithm,
}) => {
  const [processes, setProcesses] = useState([
    { id: 1, index: 1, arrival: "0", burst: "0", priority: "0" },
  ]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const [quantumTime, setQuantumTime] = useState("2"); // Default quantum time for RR
  const [isPreemptive, setIsPreemptive] = useState(false); // State for preemptive mode

  const { sortedProcesses, sortState, toggleSort, resetSort } = useProcessSorting(processes);

  const addProcess = () => {
    const newId = nextId++;
    setProcesses([
      ...processes,
      {
        id: newId,
        index: processes.length + 1,
        arrival: "0",
        burst: "0",
        priority: "0",
      },
    ]);
  };

  const removeProcess = (id: number) => {
    // Don't remove if it's the last process
    if (processes.length <= 1) {
      return;
    }

    // Remove the process with the specific ID
    const filteredProcesses = processes.filter((process) => process.id !== id);

    // Reindex remaining processes to ensure sequential indexes (not IDs)
    const reindexedProcesses = filteredProcesses.map((process, idx) => ({
      ...process,
      index: idx + 1, // Update visual index
    }));

    setProcesses(reindexedProcesses);
  };

  const handleChange = (id: number, field: string, value: string) => {
    setProcesses(
      processes.map((process) =>
        process.id === id ? { ...process, [field]: value } : process
      )
    );
  };

  const stopSimulation = () => {
    if (abortController) {
      abortController.abort();
      setIsSimulating(false);
      setAbortController(null);
    }
  };

  const startSimulation = async () => {
    try {
      // Validate process values first
      const invalidProcess = processes.find(
        (p) => !p.burst || parseInt(p.burst) <= 0
      );

      if (invalidProcess) {
        setErrorMessage("All processes must have a burst time greater than 0");
        return;
      }

      // Validate quantum time for Round Robin
      if (selectedAlgorithm === "rr") {
        const quantum = parseInt(quantumTime);
        if (isNaN(quantum) || quantum <= 0) {
          setErrorMessage("Quantum time must be a positive number");
          return;
        }
      }

      // Create new AbortController for this simulation
      const controller = new AbortController();
      setAbortController(controller);
      setIsSimulating(true);
      setErrorMessage(null);

      // Format processes for the backend with sequential IDs
      const formattedProcesses = processes.map((p, index) => ({
        id: index + 1, // Reset IDs to be sequential 1, 2, 3...
        arrival_time: parseInt(p.arrival) || 0,
        burst_time: parseInt(p.burst) || 0,
        priority: parseInt(p.priority) || 0,
      }));

      console.log("Sending processes to backend:", formattedProcesses);
      console.log("Selected algorithm:", selectedAlgorithm);

      // Call backend API with abort signal and dynamic quantum time
      const result = await schedulingService.simulateScheduling(
        formattedProcesses,
        selectedAlgorithm,
        selectedAlgorithm === "rr" ? parseInt(quantumTime) : undefined,
        controller.signal,
        selectedAlgorithm === "priority" ? isPreemptive : undefined
      );

      console.log("Received result from backend:", result);

      if (!result || !result.timeline || !result.process_results) {
        throw new Error("Invalid response from backend");
      }

      // Pass results to parent component
      onSimulationResult(result);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Simulation stopped by user");
        return;
      }
      console.error("Simulation failed:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Simulation failed. Please try again."
      );
    } finally {
      setIsSimulating(false);
      setAbortController(null);
    }
  };

  const removeAllProcesses = () => {
    // Find the first process
    const firstProcess = processes.find((p) => p.index === 1) || processes[0];

    // Reset to only process 1 with zeros
    setProcesses([
      {
        id: firstProcess.id,
        index: 1,
        arrival: "0",
        burst: "0",
        priority: "0",
      },
    ]);
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

  const SortableColumnHeader = ({ field, label }: { field: 'arrival' | 'burst' | 'priority', label: string }) => (
    <div 
      className="text-[#FBFCFA] text-[13px] cursor-pointer hover:text-[#60E2AE] transition-colors duration-200 flex items-center gap-1"
      onClick={() => toggleSort(field)}
    >
      {label}
      {sortState.field === field && (
        sortState.direction === 'asc' ? 
          <ArrowUpwardIcon fontSize="small" /> : 
          <ArrowDownwardIcon fontSize="small" />
      )}
    </div>
  );

  const ProcessIdHeader = () => (
    <div 
      className="text-[#FBFCFA] text-[13px] cursor-pointer hover:text-[#60E2AE] transition-colors duration-200 flex items-center gap-1"
      onClick={resetSort}
    >
      {sortState.field ? (
        <Tooltip title="Click to reset sorting" arrow placement="bottom">
          <span>PROCESS ID</span>
        </Tooltip>
      ) : (
        "PROCESS ID"
      )}
    </div>
  );

  return (
    <Stack
      spacing={3}
      className="h-full flex flex-col overflow-hidden w-auto py-6 px-10"
    >
      {/* Header section */}
      <div>
        <Stack
          spacing={1}
          className="flex-shrink-0"
          direction={"row"}
          alignItems={"center"}
          justifyContent={"space-between"}
        >
          <Stack spacing={0.25}>
            <p className="text-[#FBFCFA] text-[16px] font-[600]">ADD PROCESS</p>
            <p className="text-[#7F8588] text-[13px] font-['Inter']">
              Input the following details to start simulation.
            </p>
          </Stack>
          <Stack direction={"row"} spacing={1}>
            <Tooltip
              title="Generate Random"
              arrow
              placement="bottom"
              componentsProps={{
                tooltip: {
                  sx: {
                    bgcolor: "#242A2D",
                    color: "#FBFCFA",
                    borderRadius: "8px",
                    padding: "0.5rem 1rem",
                    fontSize: "0.75rem",
                    "& .MuiTooltip-arrow": {
                      color: "#242A2D",
                    },
                  },
                },
              }}
            >
              <button
                onClick={generateRandomProcesses}
                className="bg-white w-8 h-8 rounded-lg font-semibold hover:bg-[#60E2AE] transition-all duration-200 flex items-center justify-center cursor-pointer"
              >
                <ShuffleIcon fontSize="small" />
              </button>
            </Tooltip>
            <Tooltip
              title="Add"
              arrow
              placement="bottom"
              componentsProps={{
                tooltip: {
                  sx: {
                    bgcolor: "#242A2D",
                    color: "#FBFCFA",
                    borderRadius: "8px",
                    padding: "0.5rem 1rem",
                    fontSize: "0.75rem",
                    "& .MuiTooltip-arrow": {
                      color: "#242A2D",
                    },
                  },
                },
              }}
            >
              <button
                onClick={addProcess}
                className="bg-white w-8 h-8 rounded-lg font-semibold hover:bg-[#60E2AE] transition-all duration-200 flex items-center justify-center cursor-pointer"
              >
                <AddRoundedIcon fontSize="medium" />
              </button>
            </Tooltip>
          </Stack>
        </Stack>
      </div>

      <body>
        {/* Table header row */}
        <div
          className="grid w-full flex-shrink-0 pb-4"
          style={{
            gridTemplateColumns: "90px 0.45fr 0.45fr 0.45fr 45px",
            gap: "10px",
          }}
        >
          <ProcessIdHeader />
          <SortableColumnHeader field="arrival" label="ARRIVAL TIME" />
          <SortableColumnHeader field="burst" label="BURST TIME" />
          <SortableColumnHeader field="priority" label="PRIORITY" />
          <div className="text-[#FBFCFA] text-[13px]">
            {processes.length > 2 && (
              <Tooltip
                title="Remove All"
                arrow
                placement="bottom"
                componentsProps={{
                  tooltip: {
                    sx: {
                      bgcolor: "#242A2D",
                      color: "#FBFCFA",
                      borderRadius: "8px",
                      padding: "0.5rem 1rem",
                      fontSize: "0.75rem",
                      "& .MuiTooltip-arrow": {
                        color: "#242A2D",
                      },
                    },
                  },
                }}
              >
                <button
                  onClick={removeAllProcesses}
                  className="rounded-[8px] p-2 h-fit w-fit cursor-pointer text-[#E26062] flex items-center justify-center hover:bg-[#1E1619] hover:scale-105 transition-all duration-200 ease-in"
                >
                  <img src="/trash.svg" alt="" className="w-5" />
                </button>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Scrollable process list - with max height to leave room for button */}
        <div
          className="overflow-y-auto custom-scrollbar overflow-x-hidden"
          style={{ maxHeight: "100%" }}
        >
          {sortedProcesses.map((process) => (
            <div
              key={process.id}
              className="grid items-center w-full mb-3"
              style={{
                gridTemplateColumns: "90px 0.45fr 0.45fr 0.45fr 45px",
                gap: "10px",
              }}
            >
              <span className="text-[#7F8588]">
                # {String(process.index).padStart(2, "0")}
              </span>
              <input
                type="number"
                value={process.arrival}
                onChange={(e) =>
                  handleChange(process.id, "arrival", e.target.value)
                }
                className="bg-[#242A2D] text-white p-2 rounded-[8px] w-full outline-none border-2 border-transparent hover:border-[#60E2AE] focus:border-[#60E2AE] transition-colors duration-200"
                placeholder="0"
              />
              <input
                type="number"
                value={process.burst}
                onChange={(e) =>
                  handleChange(process.id, "burst", e.target.value)
                }
                className="bg-[#242A2D] text-white p-2 rounded-[8px] w-full outline-none border-2 border-transparent hover:border-[#60E2AE] focus:border-[#60E2AE] transition-colors duration-200"
                placeholder="0"
              />
              <input
                type="number"
                value={process.priority}
                onChange={(e) =>
                  handleChange(process.id, "priority", e.target.value)
                }
                className="bg-[#242A2D] text-white p-2 rounded-[8px] w-full outline-none border-2 border-transparent hover:border-[#60E2AE] focus:border-[#60E2AE] transition-colors duration-200"
                placeholder="0"
              />
              {processes.length > 1 && (
                <button
                  onClick={() => removeProcess(process.id)}
                  className="rounded-[8px] p-2 h-fit w-fit cursor-pointer text-[#E26062] flex items-center justify-center hover:bg-[#1E1619] hover:scale-105 transition-all duration-200 ease-in"
                >
                  <CloseIcon />
                </button>
              )}
              {processes.length <= 1 && <div className="w-[45px]"></div>}
            </div>
          ))}
        </div>
      </body>

      {/* Error message */}
      {errorMessage && (
        <div className="text-red-500 text-sm mt-2 mb-2">{errorMessage}</div>
      )}

      <footer className="flex items-end">
        {/* Button to start simulation */}
        <Box flex={1} /> {/* Spacer to push button to the bottom */}
        <Stack direction="row" spacing={2} alignItems="center">
          {selectedAlgorithm === "rr" && (
            <div className="flex items-center gap-2">
              <label htmlFor="quantum-time" className="text-[#FBFCFA] text-[13px]">
                Quantum Time:
              </label>
              <input
                id="quantum-time"
                type="number"
                value={quantumTime}
                onChange={(e) => setQuantumTime(e.target.value)}
                className="bg-[#242A2D] text-white p-1 rounded-[8px] w-[60px] outline-none border-2 border-transparent hover:border-[#60E2AE] focus:border-[#60E2AE] transition-colors duration-200"
                min="1"
              />
            </div>
          )}
          {selectedAlgorithm === "priority" && (
            <div className="flex items-center gap-2">
              <label className="text-[#FBFCFA] text-[13px] font-medium">
                Scheduling Mode:
              </label>
              <div className="flex items-center gap-3 bg-[#242A2D] px-3 py-1.5 rounded-xl">
                <span 
                  onClick={() => setIsPreemptive(false)}
                  className={`text-[13px] font-medium px-2 py-1 rounded-lg cursor-pointer transition-all duration-300 ${
                    !isPreemptive 
                      ? "bg-[#60E2AE] text-[#242A2D] shadow-sm" 
                      : "text-[#7F8588] hover:text-[#FBFCFA]"
                  }`}
                >
                  Non-Preemptive
                </span>
                <span 
                  onClick={() => setIsPreemptive(true)}
                  className={`text-[13px] font-medium px-2 py-1 rounded-lg cursor-pointer transition-all duration-300 ${
                    isPreemptive 
                      ? "bg-[#60E2AE] text-[#242A2D] shadow-sm" 
                      : "text-[#7F8588] hover:text-[#FBFCFA]"
                  }`}
                >
                  Preemptive
                </span>
              </div>
            </div>
          )}
          {isSimulating && (
            <button
              onClick={stopSimulation}
              className="group flex items-center gap-2 text-[#242A2D] text-[14px] hover:text-[#E26062] cursor-pointer"
            >
              STOP SIMULATION
              <img
                src="/stop.svg"
                alt="stop"
                className="w-4 h-auto block group-hover:hidden transition-all duration-200"
              />
              <img
                src="/stop-light.svg"
                alt="stop"
                className="w-4 h-auto hidden group-hover:block transition-all duration-200"
              />
            </button>
          )}
          <button
            onClick={startSimulation}
            disabled={isSimulating}
            className="group flex items-center gap-2 text-[#242A2D] text-[14px] hover:text-[#60E2AE] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSimulating ? "SIMULATING..." : "START SIMULATION"}
            <img
              src="/arrow-right.svg"
              alt="arrow"
              className="w-4 h-auto block group-hover:hidden transition-all duration-200"
            />
            <img
              src="/arrow-right-light.svg"
              alt="arrow"
              className="w-4 h-auto hidden group-hover:block transition-all duration-200"
            />
          </button>
        </Stack>
      </footer>
    </Stack>
  );
};

export default ProcessInput;
