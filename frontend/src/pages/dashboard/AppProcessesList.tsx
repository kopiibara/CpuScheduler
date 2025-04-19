import React, { useState, useEffect } from "react";
import { Stack, Tooltip, Checkbox, FormControlLabel, Box } from "@mui/material";
import NoIcon from "@mui/icons-material/InsertDriveFileRounded";
import { Process } from "../../types/ProcessObject";
import ArrowDownIcon from "@mui/icons-material/ArrowDropDownRounded";
import ArrowUpIcon from "@mui/icons-material/ArrowDropUpRounded";
import Selection from "../../components/Selection";
import PerformanceModal from "../../components/PerformanceModal";
import axios from "axios";
import { useProcessSettings } from "../../context/ProcessSettingsContext";

// Helper to format CPU affinity into a readable format
const formatCpuAffinity = (affinity?: number[]): string => {
  if (!affinity || affinity.length === 0) {
    return "All CPUs";
  }

  if (affinity.length === 1) {
    return `CPU ${affinity[0]}`;
  }

  if (affinity.length > 8) {
    return `CPUs ${affinity[0]}-${affinity[affinity.length - 1]}`;
  }

  return `CPUs ${affinity.join(", ")}`;
};

// Helper to format priority level
const formatPriority = (priority?: number): string => {
  // Map psutil priority class constants to readable names
  const priorityMap: Record<number, string> = {
    4: "Low",
    8: "Below Normal",
    16: "Normal",
    32: "Above Normal",
    128: "High",
  };

  // Check if priority is defined and a number
  if (typeof priority !== "number") {
    console.log("Invalid priority value:", priority);
    return "Normal";
  }

  // Check if the priority is in our map
  if (!priorityMap[priority]) {
    console.log("Unrecognized priority value:", priority);
    return `Priority ${priority}`;
  }

  return priorityMap[priority];
};

interface AppProcessesListProps {
  appName: string;
  processes: Process[];
  icon?: string;
}

const AppProcessesList: React.FC<AppProcessesListProps> = ({
  appName,
  processes: initialProcesses,
  icon,
}) => {
  // Get process settings from context
  const { getProcessSettings, updateProcessSettings } = useProcessSettings();

  // Keep a local copy of processes that we can update immediately
  const [processes, setProcesses] = useState<Process[]>(initialProcesses);
  // Add sorting state
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    null
  );

  // Update local processes when props change, but preserve user settings
  useEffect(() => {
    // Apply saved settings to the incoming processes
    const processesWithSettings = initialProcesses.map((process) => {
      const savedSettings = getProcessSettings(process.pid);

      return {
        ...process,
        // Use saved settings if they exist
        priority:
          savedSettings.priority !== undefined
            ? savedSettings.priority
            : process.priority,
        cpu_affinity: savedSettings.cpu_affinity || process.cpu_affinity,
      };
    });

    setProcesses(processesWithSettings);
    // Reset sort direction when processes change
    setSortDirection(null);
  }, [initialProcesses, getProcessSettings]);

  // Add active button state
  const [activeButton, setActiveButton] = useState<{
    pid: number;
    type: string;
  } | null>(null);

  // Selection component state
  const [selectionAnchor, setSelectionAnchor] = useState<HTMLElement | null>(
    null
  );
  const [selectionType, setSelectionType] = useState<
    "priority" | "cpu_affinity" | null
  >(null);
  const [selectedPid, setSelectedPid] = useState<number | null>(null);

  // FCFS state
  const [fcfsEnabled, setFcfsEnabled] = useState<boolean>(false);
  const [fcfsLoading, setFcfsLoading] = useState<boolean>(false);
  const [fcfsQueue, setFcfsQueue] = useState<number[]>([]);
  const [fcfsCurrentProcess, setFcfsCurrentProcess] = useState<number | null>(
    null
  );
  const [completedProcesses, setCompletedProcesses] = useState<number[]>([]);

  // Add a state for completion notification
  const [showCompletionNotice, setShowCompletionNotice] =
    useState<boolean>(false);

  // Add state for performance modal
  const [graphModalOpen, setGraphModalOpen] = useState<boolean>(false);
  const [selectedGraphPid, setSelectedGraphPid] = useState<number | null>(null);

  // Fetch FCFS status periodically
  useEffect(() => {
    const fetchFcfsStatus = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/scheduler/fcfs/status`
        );
        setFcfsEnabled(response.data.is_running);
        setFcfsQueue(response.data.queue || []);
        setFcfsCurrentProcess(response.data.current_process);
        setCompletedProcesses(response.data.completed || []);

        // Check if all processes have completed
        if (
          response.data.is_running &&
          response.data.completed &&
          response.data.completed.length > 0 &&
          processes.length > 0
        ) {
          // Get all PIDs for this application
          const appProcessPids = processes.map((process) => process.pid);

          // Check if all application processes have been completed
          const allCompleted = appProcessPids.every((pid) =>
            response.data.completed.includes(pid)
          );

          if (
            allCompleted &&
            response.data.queue.length === 0 &&
            !response.data.current_process
          ) {
            console.log("All processes completed, disabling FCFS");
            // Automatically disable FCFS
            setFcfsLoading(true);
            try {
              await axios.post(
                `${import.meta.env.VITE_BACKEND_URL}/scheduler/fcfs/stop`
              );
              setFcfsEnabled(false);
              // Show completion notification
              setShowCompletionNotice(true);
              // Hide notification after 5 seconds
              setTimeout(() => setShowCompletionNotice(false), 5000);
              // Restore original process order
              setProcesses(initialProcesses);
            } catch (error) {
              console.error("Failed to auto-disable FCFS:", error);
            } finally {
              setFcfsLoading(false);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch FCFS status:", error);
      }
    };

    if (fcfsEnabled) {
      fetchFcfsStatus(); // Initial fetch

      // Set up interval for fetching status
      const intervalId = setInterval(fetchFcfsStatus, 1000);

      // Cleanup interval on component unmount
      return () => clearInterval(intervalId);
    }
  }, [fcfsEnabled, processes, initialProcesses]); // Add processes and initialProcesses as dependencies

  // Toggle FCFS algorithm on/off
  const handleFcfsToggle = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const isChecked = event.target.checked;

    setFcfsLoading(true);
    try {
      if (isChecked) {
        // Start FCFS scheduler
        await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/scheduler/fcfs/start`
        );

        // Get all PIDs for this application
        const appProcessPids = processes.map((process) => process.pid);

        // Sort processes by PID (ascending order)
        const sortedProcesses = [...processes].sort((a, b) => a.pid - b.pid);
        setProcesses(sortedProcesses);

        // Add all processes to FCFS queue
        await axios.post(
          `${
            import.meta.env.VITE_BACKEND_URL
          }/scheduler/fcfs/add_app_processes`,
          { pids: appProcessPids }
        );
      } else {
        // Stop FCFS scheduler
        await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/scheduler/fcfs/stop`
        );

        // Restore original process order
        setProcesses(initialProcesses);
      }

      setFcfsEnabled(isChecked);
    } catch (error) {
      console.error("Failed to toggle FCFS:", error);
    } finally {
      setFcfsLoading(false);
    }
  };

  // Handle button clicks
  const handleButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    pid: number,
    type: "priority" | "cpu_affinity"
  ) => {
    const buttonType = type === "cpu_affinity" ? "cpu" : "priority";

    // Toggle the active state
    if (activeButton?.pid === pid && activeButton?.type === buttonType) {
      setActiveButton(null);
    } else {
      setActiveButton({ pid, type: buttonType });
    }

    setSelectionAnchor(event.currentTarget);
    setSelectionType(type);
    setSelectedPid(pid);
  };

  // Close selection popover
  const handleCloseSelection = () => {
    setSelectionAnchor(null);
    setSelectionType(null);
    setSelectedPid(null);
    setActiveButton(null); // Reset active button when selection is closed
  };

  // Handle successful selection
  const handleSelectionSuccess = (
    pid: number,
    type: "priority" | "cpu_affinity",
    newValue: number | number[]
  ) => {
    console.log(`Update ${type} for PID ${pid} with value:`, newValue);

    // Save the setting to context
    if (type === "priority") {
      updateProcessSettings(pid, { priority: newValue as number });
    } else {
      updateProcessSettings(pid, { cpu_affinity: newValue as number[] });
    }

    // Immediately update the local state for better UX
    setProcesses((prevProcesses) =>
      prevProcesses.map((process) => {
        if (process.pid === pid) {
          if (type === "priority") {
            // Store new priority value
            return { ...process, priority: newValue as number };
          } else {
            return { ...process, cpu_affinity: newValue as number[] };
          }
        }
        return process;
      })
    );

    // Don't immediately refresh - give the system time to apply changes
    // and to give the user feedback about their change
  };

  // Add sort function
  const handleSortByPid = () => {
    if (fcfsEnabled) return; // Don't allow sorting when FCFS is enabled

    if (sortDirection === null) {
      // First click - sort ascending
      setProcesses([...processes].sort((a, b) => a.pid - b.pid));
      setSortDirection("asc");
    } else if (sortDirection === "asc") {
      // Second click - sort descending
      setProcesses([...processes].sort((a, b) => b.pid - a.pid));
      setSortDirection("desc");
    } else {
      // Third click - reset to original order
      setProcesses([...initialProcesses]);
      setSortDirection(null);
    }
  };

  // Handle row click for performance modal
  const handleProcessRowClick = (pid: number) => {
    setSelectedGraphPid(pid);
    setGraphModalOpen(true);
  };

  // Find the currently selected process
  const selectedProcess = selectedPid
    ? processes.find((p) => p.pid === selectedPid)
    : null;

  const exePath = processes[0]?.exe || "Unknown path";

  return (
    <Stack
      spacing={2}
      className="h-full border-b-2 border-l-2 border-[#242a2d]"
    >
      <Stack spacing={1} className="w-full border-b-2 border-[#242a2d]">
        <Stack direction={"row"} spacing={2} paddingY={2} paddingLeft={2}>
          {/* App info section - show only when FCFS is disabled */}
          {!fcfsEnabled && (
            <>
              {icon ? (
                <img
                  src={icon}
                  alt=""
                  width="40"
                  height="40"
                  className="process-icon"
                />
              ) : (
                <NoIcon sx={{ fontSize: 48, color: "#aaaaaa" }} />
              )}
              <Stack>
                <p className="text-xl font-semibold">{appName}</p>
                <Tooltip
                  title={exePath}
                  arrow
                  componentsProps={{
                    tooltip: {
                      sx: {
                        fontSize: "0.8rem",
                        backgroundColor: "#242a2d",
                        color: "#fbfcfa",
                        borderRadius: "0.5rem",
                        padding: "0.5rem 1rem",
                        transition: "all 0.5s ease",
                        boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.25)",
                        maxWidth: "none",
                      },
                    },
                    arrow: {
                      sx: {
                        color: "#242a2d",
                      },
                    },
                  }}
                >
                  <p
                    className="text-sm text-[#a8a8a8] max-w-[350px] overflow-hidden text-ellipsis whitespace-nowrap"
                    title={exePath}
                  >
                    {exePath}
                  </p>
                </Tooltip>
              </Stack>
            </>
          )}

          {/* FCFS info section - show only when FCFS is enabled */}
          {fcfsEnabled && (
            <div className="bg-[#101619] p-3 rounded-md ml-2 max-w-[45vw]">
              <div className="text-sm text-[#a8a8a8] mb-2">
                <strong className="text-[#60e2ae]">FCFS Algorithm:</strong>{" "}
                Processes are scheduled in order of their PIDs.
              </div>

              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-400 rounded-full mr-1"></div>
                  <span className="text-xs text-[#f0f0f0]">Processing</span>
                </div>

                <div className="flex items-center">
                  <div className="w-3 h-3 bg-amber-400 rounded-full mr-1"></div>
                  <span className="text-xs text-[#f0f0f0]">Queued</span>
                </div>

                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-400 rounded-full mr-1"></div>
                  <span className="text-xs text-[#f0f0f0]">Completed</span>
                </div>
              </div>

              <div className="text-xs text-[#a8a8a8] flex flex-wrap gap-2">
                {fcfsCurrentProcess && (
                  <div>
                    <strong>Current:</strong>{" "}
                    {processes.find((p) => p.pid === fcfsCurrentProcess)
                      ?.name || fcfsCurrentProcess}{" "}
                    (PID: {fcfsCurrentProcess})
                  </div>
                )}

                <div>
                  <strong>Queue:</strong>{" "}
                  {fcfsQueue.length > 0
                    ? fcfsQueue
                        .map(
                          (pid) =>
                            `${
                              processes.find((p) => p.pid === pid)?.name || pid
                            } (${pid})`
                        )
                        .join(", ")
                    : "Empty"}
                </div>

                {completedProcesses.length > 0 && (
                  <div>
                    <strong>Completed:</strong> {completedProcesses.length}{" "}
                    processes
                  </div>
                )}
              </div>
            </div>
          )}

          {/* This spacing element pushes the checkbox to the right */}
          <Box flex={1} />

          {/* FCFS toggle checkbox - always visible */}
          <FormControlLabel
            control={
              <Checkbox
                sx={{
                  color: "#a8a8a8",
                  "&.Mui-checked": {
                    color: "#60e2ae",
                  },
                }}
                size="small"
                checked={fcfsEnabled}
                onChange={handleFcfsToggle}
                disabled={fcfsLoading}
              />
            }
            label={"First Come First Serve Algorithm"}
            sx={{
              "& .MuiFormControlLabel-label": {
                fontSize: "0.82rem",
                color: fcfsEnabled ? "#60e2ae" : "#a8a8a8",
              },
              paddingRight: 4,
            }}
          />

          {/* Completion notice */}
          {showCompletionNotice && (
            <div className="absolute right-4 top-22 bg-blue-500 bg-opacity-20 text-[#080e11] p-2 rounded-md">
              FCFS scheduling completed for all processes!
            </div>
          )}
        </Stack>
      </Stack>

      <div className="flex-1 overflow-hidden ">
        <p className="text-[#242a2d] text-md font-bold mx-5 mb-5">
          Processes ({processes.length}):
        </p>

        <div className="max-h-[calc(100%-60px)] overflow-auto custom-scrollbar ">
          <table className="w-full">
            <thead className="sticky top-0 bg-[#080e11] border-b-2 border-[#242a2d]">
              <tr>
                <th
                  className={`text-left py-2 px-6 cursor-pointer ${
                    !fcfsEnabled ? "hover:text-[#60e2ae]" : ""
                  }`}
                  onClick={handleSortByPid}
                  title={
                    fcfsEnabled
                      ? "Sorting disabled during FCFS"
                      : "Click to sort, double-click to reset"
                  }
                >
                  PID{" "}
                  {sortDirection === "asc"
                    ? "↑"
                    : sortDirection === "desc"
                    ? "↓"
                    : ""}
                </th>
                <th className="text-left py-2 px-1">Name</th>
                <th className="text-left py-2 px-1">Status</th>
                <th className="text-left py-2 px-1">Active CPU</th>
                <th className="text-left py-2 px-1">Priority</th>
                {fcfsEnabled && <th className="text-left py-2 px-1">FCFS</th>}
              </tr>
            </thead>
            <tbody>
              {processes.map((process) => (
                <tr
                  key={process.pid}
                  className="border-b-2 border-[#242a2d] text-[#a8a8a8] cursor-pointer hover:bg-[#101619]"
                  onClick={() => handleProcessRowClick(process.pid)}
                >
                  <td className="py-3 px-6">{process.pid}</td>
                  <td className="py-3 w-{175px} max-w-[350px] overflow-hidden">
                    {process.name}
                  </td>
                  <td className="py-3 capitalize">{process.status}</td>
                  <td className="py-3">
                    <button
                      className="cursor-pointer hover:text-[#60e2ae] hover:bg-[#60E2AE19] pl-2 py-1 rounded-[8px] flex items-center justify-between w-full transition-all duration-200 ease-in-out"
                      onClick={(e) => {
                        e.stopPropagation(); // Stop event from bubbling up to parent row
                        handleButtonClick(e, process.pid, "cpu_affinity");
                      }}
                    >
                      <span>{formatCpuAffinity(process.cpu_affinity)}</span>
                      {activeButton?.pid === process.pid &&
                      activeButton?.type === "cpu" ? (
                        <ArrowUpIcon />
                      ) : (
                        <ArrowDownIcon />
                      )}
                    </button>
                  </td>
                  <td className="py-3 pr-2">
                    <button
                      className="cursor-pointer hover:text-[#60e2ae] hover:bg-[#60E2AE19] pl-3 pr-1 py-1 rounded-[8px] flex items-center justify-between w-full transition-all duration-200 ease-in-out"
                      onClick={(e) => {
                        e.stopPropagation(); // Stop event from bubbling up to parent row
                        handleButtonClick(e, process.pid, "priority");
                      }}
                    >
                      <span>{formatPriority(process.priority as number)}</span>
                      {activeButton?.pid === process.pid &&
                      activeButton?.type === "priority" ? (
                        <ArrowUpIcon />
                      ) : (
                        <ArrowDownIcon />
                      )}
                    </button>
                  </td>
                  {fcfsEnabled && (
                    <td className="py-3 px-2">
                      {fcfsCurrentProcess === process.pid ? (
                        <span className="px-2 py-1 text-xs bg-green-500 bg-opacity-20 text-[#101619] rounded">
                          Processing
                        </span>
                      ) : fcfsQueue.includes(process.pid) ? (
                        <span className="px-2 py-1 text-xs bg-amber-500 bg-opacity-20 text-[#101619] rounded">
                          Queue #{fcfsQueue.indexOf(process.pid) + 1}
                        </span>
                      ) : completedProcesses.includes(process.pid) ? (
                        <span className="px-2 py-1 text-xs bg-blue-500 bg-opacity-20 text-[#101619] rounded">
                          Completed
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs text-gray-500">
                          Waiting
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selection Component */}
      {selectionType && selectedProcess && (
        <Selection
          type={selectionType}
          pid={selectedProcess.pid}
          currentValue={
            selectionType === "priority"
              ? (selectedProcess.priority as number)
              : (selectedProcess.cpu_affinity as number[])
          }
          anchorEl={selectionAnchor}
          open={Boolean(selectionAnchor)}
          onClose={handleCloseSelection}
          onSuccess={(newValue) =>
            handleSelectionSuccess(selectedProcess.pid, selectionType, newValue)
          }
        />
      )}

      {/* Performance Modal */}
      {selectedGraphPid && (
        <PerformanceModal
          open={graphModalOpen}
          onClose={() => setGraphModalOpen(false)}
          pid={selectedGraphPid}
          processName={
            processes.find((p) => p.pid === selectedGraphPid)?.name ||
            `Process ${selectedGraphPid}`
          }
        />
      )}
    </Stack>
  );
};

export default AppProcessesList;
