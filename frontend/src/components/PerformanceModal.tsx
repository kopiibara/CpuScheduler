import React, { useState, useEffect } from "react";
import { Modal, Box, Typography, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
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
  cpu_per_core: number[];
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

  useEffect(() => {
    if (!open) {
      // Reset data when modal closes
      setPerformanceData([]);
      return;
    }

    setLoading(true);
    setError(null);

    // Function to fetch performance data
    const fetchPerformanceData = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/${pid}/performance`
        );

        // Keep last 60 data points (5 minutes of data with 5s intervals)
        setPerformanceData((prev) => {
          const newData = [...prev, response.data];
          if (newData.length > 10) {
            return newData.slice(newData.length - 10);
          }
          return newData;
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

    // Set up polling interval for real-time updates (every 5 seconds)
    const intervalId = setInterval(fetchPerformanceData, 5000);

    // Clean up
    return () => {
      clearInterval(intervalId);
    };
  }, [pid, open]);

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
          <Typography
            id="performance-modal-title"
            variant="h6"
            component="h2"
            sx={{ color: "#f0f0f0" }}
          >
            Performance Metrics for {processName} (PID: {pid})
          </Typography>
          <IconButton onClick={onClose} sx={{ color: "#a8a8a8" }}>
            <CloseIcon />
          </IconButton>
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
        ) : (
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
                      new Date(timestamp * 1000).toLocaleTimeString()
                    }
                    stroke="#a8a8a8"
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
                      new Date(timestamp * 1000).toLocaleTimeString()
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
                    activeDot={{ r: 8 }}
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
                      new Date(timestamp * 1000).toLocaleTimeString()
                    }
                    stroke="#a8a8a8"
                  />
                  <YAxis
                    tickFormatter={(value) => `${value.toFixed(1)}%`}
                    domain={[0, 100]}
                    stroke="#a8a8a8"
                  />
                  <Tooltip
                    formatter={(value) => [
                      `${Number(value).toFixed(2)}%`,
                      "CPU",
                    ]}
                    labelFormatter={(timestamp) =>
                      new Date(timestamp * 1000).toLocaleTimeString()
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
                    dataKey="cpu_percent"
                    name="Overall CPU"
                    stroke="#82ca9d"
                    activeDot={{ r: 8 }}
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
        )}
      </Box>
    </Modal>
  );
};

export default PerformanceModal;
