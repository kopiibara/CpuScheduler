import { Stack, Box } from "@mui/material";
import DropDownMenu from "./DropdownMenu";
import { useEffect, useState } from "react";
import GanttChart from "./GanttChart";
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
import BarChartIcon from "@mui/icons-material/BarChart";
import TableChartIcon from "@mui/icons-material/TableChart";
import TimelineIcon from "@mui/icons-material/Timeline";
import { SimulationResult } from "../types/SimulationObject";

import "../style/custom-scrollbar.css";

interface ProcessGraphProps {
  selectedAlgorithm: string;
  onAlgorithmChange: (algorithm: string) => void;
  simulationResult: SimulationResult | null;
}

const ProcessGraph: React.FC<ProcessGraphProps> = ({
  selectedAlgorithm,
  onAlgorithmChange,
  simulationResult,
}) => {
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
  const [ganttViewMode, setGanttViewMode] = useState<"chart" | "table">(
    "chart"
  );
  const [chartKey, setChartKey] = useState(0);
  const cpuAlgorithms = [
    { value: "fcfs", label: "First Come First Serve (FCFS)" },
    { value: "sjf", label: "Shortest Job First (SJF)" },
    { value: "srtf", label: "Shortest Remaining Time First (SRTF)" },
    { value: "rr", label: "Round Robin (RR)" },
    { value: "priority", label: "Priority Scheduling" },
  ];

  const handleAlgorithmChange = (value: string | number) => {
    // Force remount of chart components by updating key
    setChartKey((prev) => prev + 1);

    // Call the parent component's change handler
    onAlgorithmChange(value.toString());
  };

  // Get color for process (you can customize this)
  const getProcessColor = (id: number) => {
    const colors = ["#4A72B2", "#DB5E88", "#8B4FB2", "#60E2AE", "#FFB661"];
    return colors[id % colors.length];
  };

  // Convert simulation results to Gantt chart data format
  const getGanttChartData = () => {
    if (!simulationResult) return null;

    // Create a completely new object
    const data: { [key: string]: any[] } = {};

    Object.entries(simulationResult.timeline).forEach(([core, timeline]) => {
      // Logic to transform timeline processes to Gantt chart format
      data[`Core ${core}`] = timeline.processes.map((p) => ({
        id: `${selectedAlgorithm}-${p.id}`, // Add algorithm to ID
        name: `P${p.id}`,
        startTime: p.start_time,
        duration: p.end_time - p.start_time,
        color: getProcessColor(p.id),
      }));
    });

    return data;
  };

  // Prepare data for line chart
  const getLineChartData = () => {
    if (!simulationResult) return [];

    return simulationResult.process_results.map((process) => ({
      name: `P${process.id}`,
      waitingTime: process.waiting_time,
      responseTime: process.response_time,
      turnaroundTime: process.turnaround_time,
    }));
  };

  // Log system information to console
  useEffect(() => {
    if (simulationResult) {
      console.log("System Information:", simulationResult.system_info);
    }
  }, [simulationResult]);

  return (
    <Stack
      spacing={3}
      className="py-6 px-10 w-full h-max-x[100vh] custom-scrollbar overflow-y-auto"
    >
      <Stack
        direction={"row"}
        spacing={2}
        alignItems="center"
        justifyContent="space-between"
      >
        <Stack spacing={0.5}>
          <Stack direction="row" spacing={2} alignItems="center">
            <p className="text-[#FBFCFA] text-[16px] font-[600]">TIME GRAPH</p>
            <Stack direction="row" spacing={1}>
              <button
                onClick={() => setViewMode("chart")}
                className={`p-1 rounded-[8px] cursor-pointer transition-all duration-200 ease-in ${
                  viewMode === "chart"
                    ? "bg-[#242A2D] text-[#FBFCFA]"
                    : "text-[#7F8588] hover:text-[#FBFCFA]"
                }`}
              >
                <TimelineIcon />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-1 rounded-[8px] cursor-pointer transition-all duration-200 ease-in ${
                  viewMode === "table"
                    ? "bg-[#242A2D] text-[#FBFCFA]"
                    : "text-[#7F8588] hover:text-[#FBFCFA]"
                }`}
              >
                <TableChartIcon />
              </button>
            </Stack>
          </Stack>
          <p className="text-[#7F8588] text-[13px] font-['Inter']">
            Visualize process execution timeline and scheduling sequence.
          </p>
        </Stack>
        <Box className="absolute right-13 top-26">
          {" "}
          <DropDownMenu
            menuItems={cpuAlgorithms}
            value={selectedAlgorithm}
            hoverOpen
            onChange={handleAlgorithmChange}
          />
        </Box>
      </Stack>

      {/* Time Graph Container */}
      <div className="bg-[#1A1D1F] rounded-lg p-6 mb-4">
        {simulationResult ? (
          <div className="space-y-4">
            {viewMode === "chart" ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={getLineChartData()}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#242A2D" />
                    <XAxis
                      dataKey="name"
                      stroke="#7F8588"
                      tick={{ fill: "#7F8588" }}
                    />
                    <YAxis stroke="#7F8588" tick={{ fill: "#7F8588" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1A1D1F",
                        border: "1px solid #242A2D",
                        borderRadius: "4px",
                      }}
                      labelStyle={{ color: "#FBFCFA" }}
                    />
                    <Legend
                      wrapperStyle={{
                        color: "#FBFCFA",
                        paddingTop: "20px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="waitingTime"
                      stroke="#4A72B2"
                      name="Waiting Time"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="responseTime"
                      stroke="#DB5E88"
                      name="Response Time"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="turnaroundTime"
                      stroke="#60E2AE"
                      name="Turnaround Time"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#242A2D]">
                      <th className="text-left py-3 px-4 text-[#FBFCFA] text-[14px] font-medium">
                        Process
                      </th>
                      <th className="text-left py-3 px-4 text-[#FBFCFA] text-[14px] font-medium">
                        Waiting Time
                      </th>
                      <th className="text-left py-3 px-4 text-[#FBFCFA] text-[14px] font-medium">
                        Response Time
                      </th>
                      <th className="text-left py-3 px-4 text-[#FBFCFA] text-[14px] font-medium">
                        Turnaround Time
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {simulationResult.process_results.map((process) => (
                      <tr
                        key={process.id}
                        className="border-b border-[#242A2D] hover:bg-[#242A2D]"
                      >
                        <td className="py-3 px-4 text-[#FBFCFA] text-[13px]">
                          P{process.id}
                        </td>
                        <td className="py-3 px-4 text-[#7F8588] text-[13px]">
                          {process.waiting_time.toFixed(2)}ms
                        </td>
                        <td className="py-3 px-4 text-[#7F8588] text-[13px]">
                          {process.response_time.toFixed(2)}ms
                        </td>
                        <td className="py-3 px-4 text-[#7F8588] text-[13px]">
                          {process.turnaround_time.toFixed(2)}ms
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-[#7F8588]">
              Add processes and start simulation to view results
            </p>
          </div>
        )}
      </div>

      {/* Gantt Chart Title and Description */}
      <Stack spacing={0.5}>
        <Stack direction="row" spacing={2} alignItems="center">
          <p className="text-[#FBFCFA] text-[16px] font-medium">GANTT CHART</p>
          <Stack direction="row" spacing={1}>
            <button
              onClick={() => setGanttViewMode("chart")}
              className={`p-1 rounded-[8px] cursor-pointer transition-all duration-200 ease-in ${
                ganttViewMode === "chart"
                  ? "bg-[#242A2D] text-[#FBFCFA]"
                  : "text-[#7F8588] hover:text-[#FBFCFA]"
              }`}
            >
              <BarChartIcon />
            </button>
            <button
              onClick={() => setGanttViewMode("table")}
              className={`p-1 rounded-[8px] cursor-pointer transition-all duration-200 ease-in ${
                ganttViewMode === "table"
                  ? "bg-[#242A2D] text-[#FBFCFA]"
                  : "text-[#7F8588] hover:text-[#FBFCFA]"
              }`}
            >
              <TableChartIcon />
            </button>
          </Stack>
        </Stack>
        <p className="text-[#7F8588] text-[13px] font-['Inter']">
          Process execution timeline per CPU core.
        </p>
      </Stack>

      {/* Gantt Chart Container */}
      <div
        key={`chart-container-${chartKey}`}
        className="bg-[#1A1D1F] rounded-lg p-6"
      >
        <div className="space-y-6">
          {simulationResult ? (
            ganttViewMode === "chart" ? (
              getGanttChartData() ? (
                Object.entries(getGanttChartData() || {}).map(
                  ([cpuId, processes]) => (
                    <GanttChart
                      key={`${selectedAlgorithm}-${cpuId}-${chartKey}`}
                      cpuId={cpuId}
                      processes={processes}
                    />
                  )
                )
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-[#7F8588]">
                    Gantt chart will appear after simulation
                  </p>
                </div>
              )
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#242A2D]">
                      <th className="text-left py-3 px-4 text-[#FBFCFA] text-[14px] font-medium">
                        CPU Core
                      </th>
                      <th className="text-left py-3 px-4 text-[#FBFCFA] text-[14px] font-medium">
                        Process
                      </th>
                      <th className="text-left py-3 px-4 text-[#FBFCFA] text-[14px] font-medium">
                        Start Time
                      </th>
                      <th className="text-left py-3 px-4 text-[#FBFCFA] text-[14px] font-medium">
                        End Time
                      </th>
                      <th className="text-left py-3 px-4 text-[#FBFCFA] text-[14px] font-medium">
                        Duration
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(simulationResult.timeline).map(
                      ([core, timeline]) =>
                        timeline.processes.map((process) => (
                          <tr
                            key={`${core}-${process.id}`}
                            className="border-b border-[#242A2D] hover:bg-[#242A2D]"
                          >
                            <td className="py-3 px-4 text-[#FBFCFA] text-[13px]">
                              CPU{parseInt(core) + 1}
                            </td>
                            <td className="py-3 px-4 text-[#FBFCFA] text-[13px]">
                              P{process.id}
                            </td>
                            <td className="py-3 px-4 text-[#7F8588] text-[13px]">
                              {process.start_time}ms
                            </td>
                            <td className="py-3 px-4 text-[#7F8588] text-[13px]">
                              {process.end_time}ms
                            </td>
                            <td className="py-3 px-4 text-[#7F8588] text-[13px]">
                              {process.end_time - process.start_time}ms
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-[#7F8588]">
                Gantt chat will appear after simulation
              </p>
            </div>
          )}
        </div>
      </div>
    </Stack>
  );
};

export default ProcessGraph;
