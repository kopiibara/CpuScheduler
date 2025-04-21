import React, { useState, useEffect } from "react";
import { Modal, Box, Typography, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import TableIcon from "@mui/icons-material/TableChart";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import axios from "axios";

interface PerformanceModalProps {
  open: boolean;
  onClose: () => void;
  pid: number;
  processName: string;
}

interface PerformanceData {
  timestamp: number;
  memory_percent: number;
  cpu_percent: number;
  cpu_per_core?: number[];
  cpu_change?: number;
  memory_change?: number;
}

const PerformanceModal: React.FC<PerformanceModalProps> = ({
  open,
  onClose,
  pid,
  processName,
}) => {
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [cpuChange, setCpuChange] = useState<number>(0); // 1 for up, -1 for down, 0 for stable
  const [memoryChange, setMemoryChange] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"graph" | "table">("graph");

  const toggleViewMode = () => {
    setViewMode((prev) => (prev === "graph" ? "table" : "graph"));
  };

  useEffect(() => {
    if (!open) {
      // Reset data when modal closes
      setPerformanceData([]);
      return;
    }

    setLoading(true);
    setError(null);

    // Function to fetch performance data - replace the existing function
    const fetchPerformanceData = async () => {
      try {
        // Use the same endpoint as the process table with the same format
        const response = await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/processes/metrics`,
          { pids: [pid] } // Send as array with just this single PID
        );

        if (!response.data || !response.data[pid]) {
          throw new Error("Process data not found");
        }

        // Extract this process's data from the response
        const metrics = response.data[pid];

        // Format the data in the structure expected by our charts
        const newData: PerformanceData = {
          timestamp: Math.floor(Date.now() / 1000),
          cpu_percent: metrics.cpu_percent || 0,
          memory_percent: metrics.memory_percent || 0,
          cpu_per_core: metrics.cpu_per_core || [],
        };

        if (performanceData.length > 0) {
          const lastData = performanceData[performanceData.length - 1];

          // Detect CPU change
          if (Math.abs(newData.cpu_percent - lastData.cpu_percent) > 0.5) {
            const newCpuChange =
              newData.cpu_percent > lastData.cpu_percent ? 1 : -1;
            setCpuChange(newCpuChange);
            newData.cpu_change = newCpuChange;

            // Reset the indicator after 3 seconds
            setTimeout(() => setCpuChange(0), 3000);
          }

          // Detect memory change
          if (
            Math.abs(newData.memory_percent - lastData.memory_percent) > 0.2
          ) {
            const newMemoryChange =
              newData.memory_percent > lastData.memory_percent ? 1 : -1;
            setMemoryChange(newMemoryChange);
            newData.memory_change = newMemoryChange;

            // Reset the indicator after 3 seconds
            setTimeout(() => setMemoryChange(0), 3000);
          }
        }

        // Keep the last 10 data points for the charts
        setPerformanceData((prev) => {
          const newDataArray = [...prev, newData];
          if (newDataArray.length > 10) {
            return newDataArray.slice(newDataArray.length - 10);
          }
          return newDataArray;
        });

        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch performance data:", err);
        setError("Failed to load performance data");
        setLoading(false);
      }
    };

    // Initial fetch
    fetchPerformanceData();

    // Also update the interval to use the same refresh rate as the table (every 2 seconds)
    const intervalId = setInterval(fetchPerformanceData, 3000);

    // Clean up
    return () => {
      clearInterval(intervalId);
    };
  }, [pid, open, performanceData.length]);

  // Get current values for display
  const currentCpu =
    performanceData.length > 0
      ? performanceData[performanceData.length - 1].cpu_percent
      : 0;

  const currentMemory =
    performanceData.length > 0
      ? performanceData[performanceData.length - 1].memory_percent
      : 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="performance-modal-title"
    >
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "80%",
          maxWidth: 900,
          maxHeight: "80vh",
          overflow: "auto",
          bgcolor: "#101619",
          border: "1px solid #242a2d",
          borderRadius: 2,
          boxShadow: 24,
          p: 4,
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Box>
            <Typography
              id="performance-modal-title"
              variant="h6"
              component="h2"
              sx={{ color: "#f0f0f0" }}
            >
              Performance Metrics for {processName} (PID: {pid})
            </Typography>

            <Box sx={{ display: "flex", mt: 1, gap: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Typography sx={{ color: "#a8a8a8", mr: 1 }}>CPU:</Typography>
                <Typography sx={{ color: "#60e2ae", fontWeight: "bold" }}>
                  {currentCpu.toFixed(1)}%
                  {cpuChange > 0 && (
                    <ArrowUpwardIcon
                      sx={{ color: "green", fontSize: 16, ml: 0.5 }}
                    />
                  )}
                  {cpuChange < 0 && (
                    <ArrowDownwardIcon
                      sx={{ color: "red", fontSize: 16, ml: 0.5 }}
                    />
                  )}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Typography sx={{ color: "#a8a8a8", mr: 1 }}>
                  Memory:
                </Typography>
                <Typography sx={{ color: "#8884d8", fontWeight: "bold" }}>
                  {currentMemory.toFixed(1)}%
                  {memoryChange > 0 && (
                    <ArrowUpwardIcon
                      sx={{ color: "green", fontSize: 16, ml: 0.5 }}
                    />
                  )}
                  {memoryChange < 0 && (
                    <ArrowDownwardIcon
                      sx={{ color: "amber", fontSize: 16, ml: 0.5 }}
                    />
                  )}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            <IconButton
              onClick={toggleViewMode}
              sx={{
                color: "#a8a8a8",
                bgcolor: "#242a2d33",
                "&:hover": { bgcolor: "#242a2d66" },
              }}
              title={
                viewMode === "graph"
                  ? "Switch to Table View"
                  : "Switch to Graph View"
              }
            >
              {viewMode === "graph" ? <TableIcon /> : <ShowChartIcon />}
            </IconButton>
            <IconButton onClick={onClose} sx={{ color: "#a8a8a8" }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {loading && performanceData.length === 0 ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <div
              className="loading-spinner"
              style={{ width: "30px", height: "30px" }}
            />
            <Typography sx={{ ml: 2, color: "#a8a8a8" }}>
              Loading performance data...
            </Typography>
          </Box>
        ) : error ? (
          <Typography sx={{ color: "#ff5555", textAlign: "center", p: 4 }}>
            {error}
          </Typography>
        ) : viewMode === "graph" ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {/* Memory Usage Graph */}
            <Box>
              <Typography variant="subtitle1" sx={{ color: "#60e2ae", mb: 1 }}>
                Memory Usage
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#242a2d" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(timestamp) =>
                      new Date(timestamp * 1000).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })
                    }
                    stroke="#a8a8a8"
                    minTickGap={30}
                  />
                  <YAxis
                    tickFormatter={(value) => `${value.toFixed(1)}%`}
                    domain={[
                      0,
                      (dataMax: number) => Math.max(5, dataMax * 1.1),
                    ]}
                    stroke="#a8a8a8"
                  />
                  <Tooltip
                    formatter={(value) => [
                      `${Number(value).toFixed(2)}%`,
                      "Memory",
                    ]}
                    labelFormatter={(timestamp) =>
                      new Date(timestamp * 1000).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })
                    }
                    contentStyle={{
                      backgroundColor: "#1A2023",
                      border: "1px solid #242a2d",
                      color: "#f0f0f0",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="memory_percent"
                    name="Memory Usage"
                    stroke="#8884d8"
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>

            {/* CPU Usage Graph */}
            <Box>
              <Typography variant="subtitle1" sx={{ color: "#60e2ae", mb: 1 }}>
                CPU Usage
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#242a2d" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(timestamp) =>
                      new Date(timestamp * 1000).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })
                    }
                    stroke="#a8a8a8"
                    minTickGap={30}
                  />
                  <YAxis
                    tickFormatter={(value) => `${value.toFixed(1)}%`}
                    // Change from fixed 100% to dynamic scale based on data
                    domain={[
                      0,
                      (dataMax: number) => Math.max(5, dataMax * 1.2),
                    ]}
                    stroke="#a8a8a8"
                  />
                  <Tooltip
                    formatter={(value) => [
                      `${Number(value).toFixed(2)}%`,
                      "CPU",
                    ]}
                    labelFormatter={(timestamp) =>
                      new Date(timestamp * 1000).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })
                    }
                    contentStyle={{
                      backgroundColor: "#1A2023",
                      border: "1px solid #242a2d",
                      color: "#f0f0f0",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cpu_percent"
                    name="Overall CPU"
                    stroke="#82ca9d"
                    activeDot={{ r: 6 }}
                    strokeWidth={2}
                  />
                  {performanceData.length > 0 &&
                    performanceData[0].cpu_per_core &&
                    performanceData[0].cpu_per_core.map((_, index) => (
                      <Line
                        key={`core-${index}`}
                        type="monotone"
                        dataKey={`cpu_per_core[${index}]`}
                        name={`Core ${index}`}
                        stroke={`hsl(${index * 30}, 70%, 50%)`}
                        dot={false}
                        strokeWidth={1}
                      />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        ) : (
          <Box sx={{ maxHeight: "400px", overflow: "auto" }}>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#1A2023] text-[#a8a8a8]">
                  <th className="p-2 text-left">Time</th>
                  <th className="p-2 text-left">CPU (%)</th>
                  <th className="p-2 text-left">Memory (%)</th>
                </tr>
              </thead>
              <tbody>
                {/* Display in reverse chronological order */}
                {[...performanceData].reverse().map((data, index) => (
                  <tr
                    key={index}
                    className={
                      index % 2 === 0 ? "bg-[#101619]" : "bg-[#131a1e]"
                    }
                  >
                    <td className="p-2 text-[#f0f0f0]">
                      {new Date(data.timestamp * 1000).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: true,
                      })}
                    </td>
                    <td className="p-2">
                      <div className="flex items-center">
                        <span className="text-[#82ca9d]">
                          {data.cpu_percent.toFixed(2)}%
                        </span>
                        {data.cpu_change && data.cpu_change > 0 && (
                          <ArrowUpwardIcon
                            sx={{ color: "green", fontSize: 16, ml: 0.5 }}
                          />
                        )}
                        {data.cpu_change && data.cpu_change < 0 && (
                          <ArrowDownwardIcon
                            sx={{ color: "red", fontSize: 16, ml: 0.5 }}
                          />
                        )}
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center">
                        <span className="text-[#8884d8]">
                          {data.memory_percent.toFixed(2)}%
                        </span>
                        {data.memory_change && data.memory_change > 0 && (
                          <ArrowUpwardIcon
                            sx={{ color: "green", fontSize: 16, ml: 0.5 }}
                          />
                        )}
                        {data.memory_change && data.memory_change < 0 && (
                          <ArrowDownwardIcon
                            sx={{ color: "amber", fontSize: 16, ml: 0.5 }}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        )}
      </Box>
    </Modal>
  );
};

export default PerformanceModal;
