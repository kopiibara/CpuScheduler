import { Box } from "@mui/material";
import Header from "../../components/Header";
import ProcessInput from "../../components/ProcessInput";
import ProcessGraph from "../../components/ProcessGraph";
import { useState } from "react";
import "../../style/custom-scrollbar.css"; // Import global styles

interface SimulationResult {
  algorithm: string;
  system_info: {
    cores: number;
    cpu_model: string;
    architecture: string;
  };
  average_metrics: {
    waiting_time: number;
    response_time: number;
    turnaround_time: number;
    throughput: number;
    cpu_utilization: number;
  };
  process_results: Array<{
    id: number;
    waiting_time: number;
    response_time: number;
    completion_time: number;
    turnaround_time: number;
    cpu_core: number;
    start_time: number;
    end_time: number;
  }>;
  timeline: {
    [key: string]: {
      processes: Array<{
        id: number;
        start_time: number;
        end_time: number;
      }>;
    };
  };
}

const MainDashboard = () => {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState("fcfs");
  const [simulationResult, setSimulationResult] =
    useState<SimulationResult | null>(null);

  const handleSimulationResult = (result: SimulationResult) => {
    setSimulationResult(result);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        height: "100%",
        width: "100%",
        maxWidth: "100vw",
        overflow: "hidden",
      }}
    >
      {/* Header Section */}
      <Header />

      <Box
        className="custom-scrollbar"
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "column", md: "row" },
          alignItems: { xs: "stretch", md: "flex-start" },
          justifyContent: { xs: "flex-start", md: "flex-start" },
          overflowY: "auto",
          overflowX: "hidden",
          flex: 1,
          width: "100%",
        }}
      >
        <Box className="custom-scrollbar border-r-2 border-[#242A2D] h-screen">
          <ProcessInput
            onSimulationResult={handleSimulationResult}
            selectedAlgorithm={selectedAlgorithm}
          />
        </Box>
        <Box
          className="custom-scrollbar"
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            width: "100%",
          }}
        >
          <ProcessGraph
            selectedAlgorithm={selectedAlgorithm}
            onAlgorithmChange={setSelectedAlgorithm}
            simulationResult={simulationResult}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default MainDashboard;
