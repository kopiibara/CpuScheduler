import { Box } from "@mui/material";
import Header from "../../components/Header";
import ProcessInput from "../../components/ProcessInput";
import ProcessGraph from "../../components/ProcessGraph";
import { useState, useRef } from "react";
import "../../style/custom-scrollbar.css"; // Import global styles
import { SimulationResult } from "../../types/SimulationObject";
import { useEffect } from "react";

const MainDashboard = () => {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState("fcfs");
  const [simulationResult, setSimulationResult] =
    useState<SimulationResult | null>(null);
  const processInputRef = useRef<{ triggerSimulation: () => void } | null>(
    null
  );

  const handleSimulationResult = (result: SimulationResult) => {
    setSimulationResult(result);
  };

  const handleAlgorithmChange = (algorithm: string) => {
    // First update the algorithm state
    setSelectedAlgorithm(algorithm);

    // Only trigger simulation if there are previous results
    if (processInputRef.current && simulationResult !== null) {
      // Add a small delay to ensure the algorithm state is updated
      setTimeout(() => {
        if (processInputRef.current) {
          console.log(
            "Auto-triggering simulation with new algorithm:",
            algorithm
          );
          processInputRef.current.triggerSimulation();
        }
      }, 50);
    }
  };

  useEffect(() => {
    console.log("Dashboard Page");
  }, []);

  // Add this useEffect to log algorithm changes
  useEffect(() => {
    console.log("Algorithm changed to:", selectedAlgorithm);
  }, [selectedAlgorithm]);

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
          alignItems: "stretch",
          height: "calc(100vh - 64px)", // Adjust this value based on your header height
          overflow: "hidden", // Prevent double scrolling
        }}
      >
        <Box
          className="custom-scrollbar border-r-2 border-[#242A2D]"
          sx={{
            width: "500px",
            flexShrink: 0,
            height: "100%",
          }}
        >
          <ProcessInput
            onSimulationResult={handleSimulationResult}
            selectedAlgorithm={selectedAlgorithm}
            ref={(ref) => (processInputRef.current = ref)}
          />
        </Box>
        <Box
          className="custom-scrollbar"
          sx={{
            flex: 1,
            height: "100%",
            overflow: "auto", // Change from "hidden" to "auto" to enable scrolling
          }}
        >
          <ProcessGraph
            selectedAlgorithm={selectedAlgorithm}
            onAlgorithmChange={handleAlgorithmChange}
            simulationResult={simulationResult}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default MainDashboard;
