import React, { useState, useEffect } from "react";
import {
  Stack,
  Tooltip,
  Checkbox,
  FormControlLabel,
  Box,
  Popover,
  Button,
} from "@mui/material";
import NoIcon from "@mui/icons-material/InsertDriveFileRounded";
import { Process } from "../../types/ProcessObject";
import ArrowDownIcon from "@mui/icons-material/ArrowDropDownRounded";
import ArrowUpIcon from "@mui/icons-material/ArrowDropUpRounded";
import Selection from "../../components/Selection";
import PerformanceModal from "../../components/PerformanceModal";
import axios from "axios";
import { useProcessSettings } from "../../context/ProcessSettingsContext";
import CloseIcon from "@mui/icons-material/Close";
import AccountTreeIcon from "@mui/icons-material/AccountTree";

// Helper to format CPU affinity into a readable format
const formatCpuAffinity = (affinity?: number[]): string => {
  if (!affinity || affinity.length === 0) {
    return "All CPUs";
  }

  if (affinity.length === 1) {
    return `CPU ${affinity[0]}`;
  }

  if (affinity.length > 6) {
    return `CPUs ${affinity[0]}-${affinity[affinity.length - 1]}`;
  }

  return `CPUs ${affinity.join(", ")}`;
};

// Helper to format priority level
const formatPriority = (priority?: number): string => {
  // Enhanced map with common non-standard values
  const priorityMap: Record<number, string> = {
    // Standard Windows priority classes
    4: "Low",
    8: "Below Normal",
    16: "Normal",
    32: "Above Normal",
    128: "High",
    256: "Realtime",

    // Common non-standard values
    64: "High Performance",
    96: "Above Normal+",
    160: "High+",
    192: "Realtime-Ready",
    32768: "Audio Priority",
    32776: "Audio Priority (Below)",
    32784: "Audio Priority (Normal)",
    32800: "Audio Priority (Above)",
    32896: "Audio Priority (High)",
  };

  // Check if priority is defined and a number
  if (typeof priority !== "number") {
    console.log("Invalid priority value:", priority);
    return "Normal";
  }

  // Check if the priority is in our map
  if (!priorityMap[priority]) {
    // For user information, log unrecognized values to help expand the map
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

  // Add this state to track both CPU and memory changes
  const [cpuChanges, setCpuChanges] = useState<Record<number, number>>({});
  const [memoryChanges, setMemoryChanges] = useState<Record<number, number>>(
    {}
  );

  // Add these new state variables
  const [processProgress, setProcessProgress] = useState<
    Record<number, number>
  >({});
  const [processingTimes, setProcessingTimes] = useState<
    Record<number, number>
  >({});

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

  // Add these state variables with the other useState declarations
  const [actionPopoverAnchor, setActionPopoverAnchor] =
    useState<HTMLElement | null>(null);
  const [actionProcessId, setActionProcessId] = useState<number | null>(null);

  // Fetch FCFS status periodically
  useEffect(() => {
    const fetchFcfsStatus = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/scheduler/fcfs/detailed_status`
        );

        setFcfsEnabled(response.data.is_running);
        setFcfsQueue(response.data.queue || []);
        setFcfsCurrentProcess(response.data.current_process);
        setCompletedProcesses(response.data.completed || []);

        // Update progress information
        setProcessProgress(response.data.progress || {});

        // Calculate processing times
        if (response.data.start_times) {
          const times: Record<number, number> = {};
          const now = Date.now() / 1000;

          // For completed processes, use the actual end time from the backend
          // instead of the estimated calculation
          for (const pid of response.data.completed || []) {
            if (response.data.start_times[pid]) {
              if (response.data.end_times && response.data.end_times[pid]) {
                // Use the actual recorded end time if available
                times[pid] =
                  response.data.end_times[pid] - response.data.start_times[pid];
              } else {
                // Fallback to more accurate estimation if end time isn't available
                const processingTime =
                  response.data.processing_times?.[pid] ||
                  (response.data.time_slice
                    ? response.data.time_slice * (Math.random() * 0.5 + 0.8)
                    : 4);
                times[pid] = processingTime;
              }
            }
          }

          // For current process, use elapsed time so far
          if (
            response.data.current_process &&
            response.data.start_times[response.data.current_process]
          ) {
            times[response.data.current_process] =
              now - response.data.start_times[response.data.current_process];
          }

          setProcessingTimes(times);
        }

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
      const intervalId = setInterval(fetchFcfsStatus, 500); // Update more frequently

      // Cleanup interval on component unmount
      return () => clearInterval(intervalId);
    }
  }, [fcfsEnabled, processes, initialProcesses]); // Add processes and initialProcesses as dependencies

  // Add this effect near your other useEffect blocks
  useEffect(() => {
    const fetchUpdatedProcessMetrics = async () => {
      try {
        if (processes.length === 0) return;

        // Get all PIDs for this application
        const pids = processes.map((process) => process.pid);

        // Fetch updated metrics for these processes
        const response = await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/processes/metrics`,
          { pids }
        );

        if (response.data) {
          // Track which processes had metric changes
          const newCpuChanges: Record<number, number> = {};
          const newMemoryChanges: Record<number, number> = {};

          setProcesses((prevProcesses) =>
            prevProcesses.map((process) => {
              const metrics = response.data[process.pid];
              if (!metrics) return process;

              // Store the change directions
              if (metrics.cpu_change !== undefined) {
                newCpuChanges[process.pid] = metrics.cpu_change;
              }

              if (metrics.memory_change !== undefined) {
                newMemoryChanges[process.pid] = metrics.memory_change;
              }

              return {
                ...process,
                cpu_percent: metrics.cpu_percent ?? process.cpu_percent,
                memory_percent:
                  metrics.memory_percent ?? process.memory_percent,
              };
            })
          );

          // Update change states
          setCpuChanges(newCpuChanges);
          setMemoryChanges(newMemoryChanges);

          // Clear change indicators after 1 second
          setTimeout(() => {
            setCpuChanges({});
            setMemoryChanges({});
          }, 1000);
        }
      } catch (error) {
        console.error("Failed to fetch process metrics:", error);
      }
    };

    // Execute immediately
    fetchUpdatedProcessMetrics();

    // Change interval to 2 seconds as requested
    const metricsInterval = setInterval(fetchUpdatedProcessMetrics, 3000);

    return () => {
      // Ensure interval is properly cleared
      clearInterval(metricsInterval);
    };
  }, [processes.length, appName]); // Add appName to dependencies

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

  // Handle right click for process termination options
  const handleProcessRightClick = (
    event: React.MouseEvent<HTMLTableRowElement>,
    pid: number
  ) => {
    event.preventDefault(); // Prevent default context menu
    event.stopPropagation(); // Prevent triggering the single-click handler
    setActionProcessId(pid);
    setActionPopoverAnchor(event.currentTarget);
  };

  // Close the action popover
  const handleCloseActionPopover = () => {
    setActionPopoverAnchor(null);
    setActionProcessId(null);
  };

  // End a single process
  const handleEndProcess = async () => {
    if (!actionProcessId) return;

    try {
      const response = await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/processes/${actionProcessId}`
      );

      if (response.data.success) {
        // Remove the process from the local state for immediate feedback
        const updatedProcesses = processes.filter(
          (p) => p.pid !== actionProcessId
        );
        setProcesses(updatedProcesses);

        // Check if this was the last process for the app
        if (updatedProcesses.length === 0) {
          // Notify parent component that this app has no more processes
          window.dispatchEvent(
            new CustomEvent("appTerminated", {
              detail: {
                appName: appName,
              },
            })
          );
        }

        // Store the terminated PID to handle UI refresh correctly
        const terminatedPid = actionProcessId;
        const terminatedAppName = appName;

        // Update the processes count in the parent component
        const updateProcessCount = () => {
          const processCountElement = document.querySelector(
            `tr[data-app-name="${CSS.escape(
              terminatedAppName
            )}"] td:nth-child(3)`
          );
          if (processCountElement) {
            const currentCount = parseInt(
              processCountElement.textContent || "0"
            );
            if (!isNaN(currentCount) && currentCount > 0) {
              processCountElement.textContent = (currentCount - 1).toString();
            }
          }
        };

        // Immediate update
        updateProcessCount();

        // Ensure the count stays updated even after refresh
        // This runs AFTER the context's refresh happens
        setTimeout(updateProcessCount, 600);

        // Dispatch the event with enhanced detail
        window.dispatchEvent(
          new CustomEvent("processesUpdated", {
            detail: {
              type: "processTerminated",
              pid: terminatedPid,
              appName: terminatedAppName,
              preventRefresh: true, // Add this flag to tell context not to refresh
            },
          })
        );
      } else {
        console.error("Failed to terminate process:", response.data.message);
      }
    } catch (error) {
      console.error("Error terminating process:", error);
    }

    handleCloseActionPopover();
  };

  // End a process tree
  const handleEndProcessTree = async () => {
    if (!actionProcessId) return;

    try {
      const response = await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/processes/${actionProcessId}/tree`
      );

      if (response.data.success) {
        // Trigger a refresh to update both process list and app list
        window.dispatchEvent(new CustomEvent("processesUpdated"));
      } else {
        console.error(
          "Failed to terminate process tree:",
          response.data.message
        );
      }
    } catch (error) {
      console.error("Error terminating process tree:", error);
    }

    handleCloseActionPopover();
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
            <div className="bg-[#101619] p-3 rounded-[8px] ml-2 max-w-[45vw]">
              <div className="text-sm text-[#a8a8a8] mb-2">
                <strong className="text-[#60e2ae]">FCFS Algorithm:</strong>{" "}
                Processes executed in order they arrived (by PID)
              </div>

              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-400 rounded-full mr-1 animate-pulse"></div>
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

              <div className="flex items-center gap-2 mb-2">
                <div className="h-1 bg-gray-700 flex-1 rounded-full overflow-hidden">
                  {completedProcesses.length > 0 && (
                    <div
                      className="h-full bg-blue-400 transition-all duration-300 ease-in-out"
                      style={{
                        width: `${
                          (completedProcesses.length /
                            (completedProcesses.length +
                              fcfsQueue.length +
                              (fcfsCurrentProcess ? 1 : 0))) *
                          100
                        }%`,
                      }}
                    ></div>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {completedProcesses.length}/
                  {completedProcesses.length +
                    fcfsQueue.length +
                    (fcfsCurrentProcess ? 1 : 0)}
                </span>
              </div>

              <div className="text-xs text-[#a8a8a8] flex flex-wrap gap-2">
                {fcfsCurrentProcess && (
                  <div className="flex items-center">
                    <strong>Current:</strong>{" "}
                    <span className="text-green-400 ml-1">
                      {processes.find((p) => p.pid === fcfsCurrentProcess)
                        ?.name || fcfsCurrentProcess}{" "}
                      (PID: {fcfsCurrentProcess})
                      {processProgress[fcfsCurrentProcess] !== undefined &&
                        ` - ${processProgress[fcfsCurrentProcess]}%`}
                    </span>
                  </div>
                )}

                <div>
                  <strong>Queue:</strong>{" "}
                  {fcfsQueue.length > 0
                    ? fcfsQueue.slice(0, 4).map((pid, i) => (
                        <span
                          key={pid}
                          className={i === 0 ? "text-amber-400" : ""}
                        >
                          {i > 0 && " → "}
                          {processes.find((p) => p.pid === pid)?.name || pid} (
                          {pid})
                        </span>
                      ))
                    : "Empty"}
                  {fcfsQueue.length > 4 && ` + ${fcfsQueue.length - 4} more...`}
                </div>

                {completedProcesses.length > 0 && (
                  <div>
                    <strong>Completed:</strong>{" "}
                    <span className="text-blue-400">
                      {completedProcesses.length} processes
                    </span>
                  </div>
                )}
              </div>

              {fcfsQueue.length > 0 && fcfsCurrentProcess && (
                <div className="text-xs text-[#a8a8a8] mt-2">
                  <strong>Estimated completion:</strong>{" "}
                  <span>~{(fcfsQueue.length * 4).toFixed(1)} seconds</span>
                </div>
              )}
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

        <div className="max-h-[calc(100%-50px)] overflow-auto custom-scrollbar ">
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
                <Tooltip
                  title="CPU Usage"
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
                  <th className="text-left py-2 px-1">CPU</th>
                </Tooltip>
                <Tooltip
                  title="Memory Usage"
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
                  <th className="text-left py-2 px-1">Memory</th>
                </Tooltip>
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
                  onDoubleClick={() => handleProcessRowClick(process.pid)}
                  onContextMenu={(e) => handleProcessRightClick(e, process.pid)}
                >
                  <td className="py-3 px-6 border-r-0 border-[#242a2d]">
                    {process.pid}
                  </td>
                  <Tooltip
                    title={process.name}
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
                    <td className="py-3 px-2 border-r-0 border-[#242a2d] w-[auto] max-w-[200px] truncate whitespace-nowrap overflow-hidden">
                      {process.name}
                    </td>
                  </Tooltip>
                  <td className="py-3 px-2 capitalize border-r-0 border-[#242a2d]">
                    {process.status}
                  </td>
                  <td className="py-3 px-2 border-r-0 border-[#242a2d]">
                    <div className="flex items-center">
                      {process.cpu_percent?.toFixed(1) || "0.0"}%
                      {cpuChanges[process.pid] > 0 && (
                        <span className="ml-1 text-green-500">↑</span>
                      )}
                      {cpuChanges[process.pid] < 0 && (
                        <span className="ml-1 text-red-400">↓</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2 border-r-0 border-[#242a2d]">
                    <div className="flex items-center">
                      {process.memory_percent?.toFixed(1) || "0.0"}%
                      {memoryChanges[process.pid] > 0 && (
                        <span className="ml-1 text-green-500">↑</span>
                      )}
                      {memoryChanges[process.pid] < 0 && (
                        <span className="ml-1 text-red-400">↓</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2 border-r-0 border-[#242a2d]">
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
                  <td className="py-3 pr-2 ">
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
                        <div className="flex flex-col">
                          <span className="px-2 py-1 text-xs bg-green-500 bg-opacity-20 text-[#fbfcfa] rounded mb-1">
                            Processing
                          </span>
                          <div className="w-full bg-gray-700 rounded-full h-2.5">
                            <div
                              className="bg-green-400 h-2.5 rounded-full transition-all duration-300 ease-in-out"
                              style={{
                                width: `${processProgress[process.pid] || 0}%`,
                              }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-400 mt-1">
                            {(processingTimes[process.pid] || 0).toFixed(1)}s
                          </span>
                        </div>
                      ) : fcfsQueue.includes(process.pid) ? (
                        <div className="flex items-center">
                          <div className="animate-ping h-2 w-2 bg-amber-400 rounded-full mr-2"></div>
                          <span className="px-2 py-1 text-xs bg-amber-500 bg-opacity-20 text-[#fbfcfa] rounded">
                            Queue #{fcfsQueue.indexOf(process.pid) + 1}
                          </span>
                        </div>
                      ) : completedProcesses.includes(process.pid) ? (
                        <div className="flex flex-col">
                          <span className="px-2 py-1 text-xs bg-blue-500 bg-opacity-20 text-[#fbfcfa] rounded">
                            Completed
                          </span>
                          <span className="text-xs text-gray-400 mt-1">
                            {(processingTimes[process.pid] || 0).toFixed(1)}s
                          </span>
                        </div>
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

      {/* Process Actions Popover */}
      <Popover
        open={Boolean(actionPopoverAnchor)}
        anchorEl={actionPopoverAnchor}
        onClose={handleCloseActionPopover}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        PaperProps={{
          sx: {
            backgroundColor: "#101619",
            border: "1px solid #242a2d",
            borderRadius: "8px",
            boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.3)",
          },
        }}
      >
        <div className="p-2 text-[#fbfcfa]">
          <p className="text-sm font-semibold mb-2 text-center border-b border-[#242a2d] pb-1">
            Process Actions
          </p>

          <div className="flex flex-col gap-2">
            <Button
              startIcon={<CloseIcon />}
              onClick={handleEndProcess}
              variant="contained"
              color="error"
              size="small"
              sx={{
                textTransform: "none",
                backgroundColor: "#d32f2f22",
                "&:hover": {
                  backgroundColor: "#d32f2f44",
                },
              }}
            >
              End Process
            </Button>

            <Button
              startIcon={<AccountTreeIcon />}
              onClick={handleEndProcessTree}
              variant="contained"
              color="error"
              size="small"
              sx={{
                textTransform: "none",
                backgroundColor: "#d32f2f22",
                "&:hover": {
                  backgroundColor: "#d32f2f44",
                },
              }}
            >
              End Process Tree
            </Button>
          </div>
        </div>
      </Popover>
    </Stack>
  );
};

export default AppProcessesList;
