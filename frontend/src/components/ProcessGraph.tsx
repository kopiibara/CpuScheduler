import { Stack } from "@mui/material";
import DropDownMenu from "./DropdownMenu";
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
  const cpuAlgorithms = [
    { value: "fcfs", label: "First Come First Serve (FCFS)" },
    { value: "sjf", label: "Shortest Job First (SJF)" },
    { value: "srtf", label: "Shortest Remaining Time First (SRTF)" },
    { value: "rr", label: "Round Robin (RR)" },
    { value: "priority", label: "Priority Scheduling" },
  ];

  const handleAlgorithmChange = (value: string | number) => {
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

    // Create a mapping of process IDs to sequential indices
    // Add proper typing for the object
    const processIdToIndex: Record<number, number> = {};
    let nextIndex = 1;

    // Collect all unique process IDs from the timeline
    Object.values(simulationResult.timeline).forEach((timeline) => {
      timeline.processes.forEach((process) => {
        if (!processIdToIndex[process.id]) {
          processIdToIndex[process.id] = nextIndex++;
        }
      });
    });

    const data: { [key: string]: any[] } = {};
    Object.entries(simulationResult.timeline).forEach(([core, timeline]) => {
      data[`cpu${parseInt(core) + 1}`] = timeline.processes.map((process) => ({
        id: `p${process.id}-${core}`,
        name: `P${processIdToIndex[process.id]}`, // Use index instead of raw ID
        startTime: process.start_time,
        duration: process.end_time - process.start_time,
        color: getProcessColor(processIdToIndex[process.id]), // Use index for colors too
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

  return (
    <Stack
      spacing={3}
      className="py-6 px-10 w-full h-full overflow-y-auto custom-scrollbar"
    >
      <Stack
        direction={"row"}
        spacing={2}
        alignItems="center"
        justifyContent="space-between"
      >
        <Stack spacing={0.25}>
          <p className="text-[#FBFCFA] text-[16px] font-[600]">TIME GRAPH</p>
          <p className="text-[#7F8588] text-[13px] font-['Inter']">
            Visualize process execution timeline and scheduling sequence.
          </p>
        </Stack>
        <DropDownMenu
          menuItems={cpuAlgorithms}
          value={selectedAlgorithm}
          hoverOpen
          onChange={handleAlgorithmChange}
        />
      </Stack>

      {/* Time Graph Container */}
      <div className="bg-[#1A1D1F] rounded-[8px] p-6 mb-4">
        {simulationResult ? (
          <div className="space-y-4">
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
          </div>
        ) : (
          <div className="h-20 flex items-center justify-center">
            <p className="text-[#7F8588]">
              Add processes and start simulation to view result.{" "}
            </p>
          </div>
        )}
      </div>

      {/* Gantt Chart Title and Description */}
      <Stack spacing={1}>
        <p className="text-[#FBFCFA] text-[16px] font-medium">GANTT CHART</p>
        <p className="text-[#7F8588] text-[14px] font-['Inter']">
          Process execution timeline per CPU core.
        </p>
      </Stack>

      {/* Gantt Chart Container */}
      <div className="bg-[#1A1D1F] rounded-[8px] p-6">
        <div className="overflow-x-auto">
          <div className="space-y-6">
            {(() => {
              const ganttData = getGanttChartData();
              if (!simulationResult || !ganttData) {
                return (
                  <div className="h-20 flex items-center justify-center">
                    <p className="text-[#7F8588]">
                      Gantt chart will appear after simulation
                    </p>
                  </div>
                );
              }

              return Object.entries(ganttData).map(([cpuId, processes]) => (
                <GanttChart
                  key={cpuId}
                  processes={processes}
                  cpuId={cpuId.toUpperCase()}
                />
              ));
            })()}
          </div>
        </div>
      </div>
    </Stack>
  );
};

export default ProcessGraph;
