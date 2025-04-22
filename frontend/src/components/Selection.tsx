import React, { useState, useEffect } from "react";
import {
  Popover,
  Stack,
  Checkbox,
  FormControlLabel,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";
import axios from "axios";
import { isCriticalMultithreadedProcess } from "../utils/CriticalProcessDetector";

type SelectionType = "priority" | "cpu_affinity";

interface SelectionProps {
  type: SelectionType;
  pid: number;
  currentValue: number | number[];
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: (newValue: number | number[]) => void;
}

const systemProcesses = [
  "system",
  "svchost",
  "csrss",
  "wininit",
  "services",
  "lsass",
];

const Selection: React.FC<SelectionProps> = ({
  type,
  pid,
  currentValue,
  anchorEl,
  open,
  onClose,
  onSuccess,
}) => {
  // Local state to track selections before submitting
  const [selectedPriority, setSelectedPriority] = useState<number | null>(null);
  const [selectedCores, setSelectedCores] = useState<number[]>([]);
  const [cpuCount, setCpuCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedProcess, setSelectedProcess] = useState<any>(null);
  const [isMultithreadedProcess, setIsMultithreadedProcess] =
    useState<boolean>(false);

  // Fetch the actual CPU count from the system
  useEffect(() => {
    const fetchCpuCount = async () => {
      try {
        // First try to get CPU count from the system-info endpoint
        const systemInfoResponse = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/system-info`
        );

        // Check if we can get the thread count from system info
        if (systemInfoResponse.data && systemInfoResponse.data.threads) {
          // Parse thread count from the format like "16 Threads"
          const threadsString = systemInfoResponse.data.threads;
          const threadCount = parseInt(threadsString.split(" ")[0]);

          if (!isNaN(threadCount) && threadCount > 0) {
            setCpuCount(threadCount);
            return;
          }
        }

        // Fall back to processes method if system-info doesn't provide thread count
        const response = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/processes`
        );

        // Find the process with the highest CPU core count
        if (response.data && response.data.length > 0) {
          let maxCpuCount = 0;

          // Check all processes to find the maximum CPU affinity length
          response.data.forEach((process: any) => {
            if (
              process.cpu_affinity &&
              Array.isArray(process.cpu_affinity) &&
              process.cpu_affinity.length > maxCpuCount
            ) {
              maxCpuCount = process.cpu_affinity.length;
            }
          });

          if (maxCpuCount > 0) {
            setCpuCount(maxCpuCount);
            return;
          }
        }

        // Final fallback to browser API or default value
        setCpuCount(navigator.hardwareConcurrency || 8);
      } catch (error) {
        console.error("Failed to fetch CPU count:", error);
        // Fallback to browser API or default
        setCpuCount(navigator.hardwareConcurrency || 8);
      }
    };

    if (open) {
      fetchCpuCount();
    }
  }, [open]);

  // Add this function to check if a process is a system process
  const fetchProcessInfo = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/processes`
      );

      // Find the process with the given PID
      const process = response.data.find((p: any) => p.pid === pid);
      if (process) {
        setSelectedProcess(process);
      }
    } catch (error) {
      console.error("Error fetching process info:", error);
    }
  };

  // Add this effect to fetch process info when opened
  useEffect(() => {
    if (open) {
      fetchProcessInfo();
    }
  }, [open, pid]);

  // Add this effect to check if it's a critical process
  useEffect(() => {
    if (open && selectedProcess && type === "cpu_affinity") {
      setIsMultithreadedProcess(
        isCriticalMultithreadedProcess(selectedProcess)
      );
    }
  }, [open, selectedProcess, type]);

  // Initialize selection state when the component opens
  useEffect(() => {
    if (type === "priority") {
      setSelectedPriority(currentValue as number);
    } else {
      // If currentValue is an empty array, select all cores
      if (Array.isArray(currentValue) && currentValue.length === 0) {
        // Select all available cores
        setSelectedCores(Array.from({ length: cpuCount }, (_, i) => i));
      } else {
        setSelectedCores(Array.isArray(currentValue) ? currentValue : []);
      }
    }

    // Clear any previous error/success messages
    setError(null);
    setSuccess(null);
  }, [currentValue, type, open, cpuCount]);

  // Priority options mapping
  const getPriorityOptions = (currentPriority: number) => {
    // Standard Windows priority classes
    const standardOptions = [
      { value: 128, label: "High" },
      { value: 32768, label: "Above Normal" },
      { value: 32, label: "Normal" },
      { value: 16384, label: "Below Normal" },
      { value: 64, label: "Idle" },
    ];

    // Check if current priority is non-standard
    const isNonStandard = !standardOptions.some(
      (option) => option.value === currentPriority
    );

    // If non-standard, add it to the options
    if (isNonStandard && typeof currentPriority === "number") {
      // Create a friendly label if possible
      let customLabel = "Custom";
      if (currentPriority === 256) customLabel = "Realtime";
      else if (currentPriority === 32768) customLabel = "Audio Priority";
      else customLabel = `Custom (${currentPriority})`;

      // Add the custom option at the top
      return [
        { value: currentPriority, label: customLabel },
        ...standardOptions,
      ];
    }

    return standardOptions;
  };

  // Priority option mapping to API values
  const priorityApiMap: Record<number, string> = {
    64: "idle",
    16384: "below_normal",
    32: "normal",
    32768: "above_normal",
    128: "high",
    256: "realtime",
  };

  // Update the handleApplyPriority function
  const handleApplyPriority = async () => {
    if (!selectedPriority) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/processes/${pid}/priority`,
        {
          priority: priorityApiMap[selectedPriority],
        }
      );

      // Check if the API returned success
      if (response.data && response.data.success === false) {
        setError(response.data.message || "Failed to update priority");
        return;
      }

      setSuccess("Priority updated successfully");

      // Store the numeric priority value to pass back
      const numericPriority = selectedPriority;

      // Pass back the new value to parent component
      setTimeout(() => {
        onSuccess?.(numericPriority);
        onClose();
      }, 1000);
    } catch (error) {
      console.error("Failed to set process priority:", error);
      setError("Failed to update priority");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle applying CPU affinity selection
  const handleApplyAffinity = async () => {
    // Prevent empty core selection
    if (selectedCores.length === 0) {
      setError("You must select at least one CPU core");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/processes/${pid}/affinity`,
        {
          cores: selectedCores,
        }
      );
      setSuccess("CPU affinity updated successfully");
      setTimeout(() => {
        // Pass back the new value to parent component
        onSuccess?.(selectedCores);
        onClose();
      }, 1000);
    } catch (error) {
      console.error("Failed to set CPU affinity:", error);
      setError("Failed to update CPU affinity");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle core selection toggle
  const handleCoreToggle = (core: number) => {
    setSelectedCores((prev) =>
      prev.includes(core) ? prev.filter((c) => c !== core) : [...prev, core]
    );
  };

  // Use the actual CPU count from the system
  const cpuCores = Array.from({ length: cpuCount }, (_, i) => i);

  // Select all cores
  const selectAllCores = () => {
    setSelectedCores(cpuCores);
  };

  // Clear all cores
  const clearAllCores = () => {
    setSelectedCores([]);
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "left",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "left",
      }}
      PaperProps={{
        sx: {
          p: 2,
          backgroundColor: "#080e11",
          border: "1px solid #242a2d",
          borderRadius: "8px",
          maxWidth: type === "cpu_affinity" ? "320px" : "220px",
        },
      }}
    >
      {type === "priority" ? (
        <Stack spacing={2}>
          <h3 className="text-sm font-semibold text-[#f0f0f0]">
            Select Priority
          </h3>

          {error && (
            <Alert
              severity="error"
              sx={{ backgroundColor: "#2c1c1c", color: "#f08080" }}
            >
              {error}
            </Alert>
          )}

          {success && (
            <Alert
              severity="success"
              sx={{ backgroundColor: "#1c2c1c", color: "#80f080" }}
            >
              {success}
            </Alert>
          )}

          {selectedProcess &&
            systemProcesses.some((name) =>
              selectedProcess.name.toLowerCase().includes(name)
            ) && (
              <Alert
                severity="warning"
                sx={{
                  backgroundColor: "#2c241c",
                  color: "#f0c080",
                  fontSize: "0.75rem",
                }}
              >
                System processes may automatically reset priority changes.
              </Alert>
            )}

          <Stack spacing={1}>
            {getPriorityOptions(currentValue as number).map((option) => (
              <button
                key={option.value}
                className={`py-1.5 px-3 text-left rounded hover:bg-[#60E2AE19] hover:text-[#60e2ae] transition-all ${
                  selectedPriority === option.value
                    ? "bg-[#60E2AE19] text-[#60e2ae] font-medium"
                    : "text-[#a8a8a8]"
                }`}
                onClick={() => setSelectedPriority(option.value)}
                disabled={isLoading}
              >
                {option.label}
                {selectedPriority === option.value && (
                  <span className="ml-2">✓</span>
                )}
              </button>
            ))}
          </Stack>

          <Stack direction="row" spacing={1} justifyContent="flex-end" mt={1}>
            <Button
              size="small"
              sx={{ color: "#a8a8a8" }}
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              size="small"
              sx={{
                backgroundColor: "#60e2ae22",
                color: "#60e2ae",
                "&:hover": { backgroundColor: "#60e2ae33" },
                minWidth: "64px",
              }}
              onClick={handleApplyPriority}
              disabled={isLoading}
              startIcon={
                isLoading ? (
                  <CircularProgress size={16} color="inherit" />
                ) : null
              }
            >
              {isLoading ? "Applying" : "Apply"}
            </Button>
          </Stack>
        </Stack>
      ) : (
        <Stack spacing={2}>
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-[#f0f0f0]">
              Select CPU Cores
            </h3>
            <div className="flex gap-2">
              <button
                className="text-xs text-[#60e2ae] hover:underline"
                onClick={selectAllCores}
                disabled={isLoading}
              >
                All
              </button>
              <button
                className="text-xs text-[#60e2ae] hover:underline"
                onClick={clearAllCores}
                disabled={isLoading}
              >
                None
              </button>
            </div>
          </div>

          {error && (
            <Alert
              severity="error"
              sx={{ backgroundColor: "#2c1c1c", color: "#f08080" }}
            >
              {error}
            </Alert>
          )}

          {success && (
            <Alert
              severity="success"
              sx={{ backgroundColor: "#1c2c1c", color: "#80f080" }}
            >
              {success}
            </Alert>
          )}

          {isMultithreadedProcess && selectedCores.length === 1 && (
            <Alert
              severity="warning"
              sx={{
                backgroundColor: "#2c241c",
                color: "#f0c080",
                fontSize: "0.75rem",
              }}
            >
              This application uses multiple CPU cores for optimal performance.
              Limiting it to a single core may cause reduced performance or
              instability.
            </Alert>
          )}

          <div className="grid grid-cols-3 gap-1">
            {cpuCores.map((core) => (
              <FormControlLabel
                key={core}
                control={
                  <Checkbox
                    checked={selectedCores.includes(core)}
                    onChange={() => handleCoreToggle(core)}
                    sx={{
                      color: "#a8a8a8",
                      "&.Mui-checked": {
                        color: "#60e2ae",
                      },
                    }}
                    size="small"
                    disabled={isLoading}
                  />
                }
                label={`CPU ${core}`}
                sx={{
                  "& .MuiFormControlLabel-label": {
                    fontSize: "0.8rem",
                    color: selectedCores.includes(core) ? "#f0f0f0" : "#a8a8a8",
                  },
                }}
              />
            ))}
          </div>

          <Stack direction="row" spacing={1} justifyContent="flex-end" mt={1}>
            <Button
              size="small"
              sx={{ color: "#a8a8a8" }}
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              size="small"
              sx={{
                backgroundColor: "#60e2ae22",
                color: "#60e2ae",
                "&:hover": { backgroundColor: "#60e2ae33" },
                minWidth: "64px",
              }}
              onClick={handleApplyAffinity}
              disabled={isLoading}
              startIcon={
                isLoading ? (
                  <CircularProgress size={16} color="inherit" />
                ) : null
              }
            >
              {isLoading ? "Applying" : "Apply"}
            </Button>
          </Stack>
        </Stack>
      )}
    </Popover>
  );
};

export default Selection;
