import { Stack, Box } from "@mui/material";
import DropDownMenu from "./DropdownMenu";
import { useState } from "react";

const ProcessGraph = () => {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState("fcfs");

  const cpuAlgorithms = [
    { value: "fcfs", label: "First Come First Serve (FCFS)" },
    { value: "sjf", label: "Shortest Job First (SJF)" },
    { value: "srtf", label: "Shortest Remaining Time First (SRTF)" },
    { value: "rr", label: "Round Robin (RR)" },
    { value: "priority", label: "Priority Scheduling" },
  ];

  const handleAlgorithmChange = (value: string | number) => {
    setSelectedAlgorithm(value.toString());
    // Add any additional logic you need when algorithm changes
  };

  return (
    <Stack spacing={3} className="py-5 px-10 w-full">
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

      {/* Placeholder for the process visualization */}
      <div className="h-[400px] bg-[#1A1D1F] rounded-lg flex items-center justify-center">
        <p className="text-[#7F8588]">Process visualization will appear here</p>
      </div>
    </Stack>
  );
};

export default ProcessGraph;
