import { Stack, Box, LinearProgress } from "@mui/material";
import { useEffect, useState } from "react";
import { useSystemInfoFetch } from "../hooks/useSystemInfoFetch";
import { useProcesses } from "../context/ProcessContext";
import WindowsButtons from "../components/WindowsButtons";
import cpuSchedulerIcon from "../assets/cpuScheduler-icon.svg";
import { useNavigate } from "react-router-dom";

const WelcomePage = () => {
  const { fetchProgress, fetchSystemInfo } = useSystemInfoFetch(3000); // 3 seconds minimum loading time
  const { fetchProcesses, isInitialized } = useProcesses();
  const [totalProgress, setTotalProgress] = useState<number>(0);
  const navigate = useNavigate();

  // Trigger both fetches on component mount
  useEffect(() => {
    const loadAllData = async () => {
      try {
        console.log("Starting data fetches...");
        // Start both fetches in parallel with error handling
        const results = await Promise.all([
          fetchSystemInfo().catch((e) => {
            console.error("System info fetch error:", e);
            return null;
          }),
          fetchProcesses().catch((e) => {
            console.error("Processes fetch error:", e);
            return null;
          }),
        ]);
        console.log("Both fetches completed:", results);
      } catch (error) {
        console.error("Error in loadAllData:", error);
      }
    };

    loadAllData();
  }, [fetchSystemInfo, fetchProcesses]);

  // Calculate combined progress
  useEffect(() => {
    // System info is 60% of total progress, processes is 40%
    const systemInfoWeight = 0.6;
    const processesWeight = 0.4;

    // If processes initialized, count as 100% for that part
    const processProgress = isInitialized ? 100 : 0;

    // Combine both progress values with their weights
    const combinedProgress =
      fetchProgress * systemInfoWeight + processProgress * processesWeight;

    setTotalProgress(combinedProgress);
  }, [fetchProgress, isInitialized]);

  // Add navigation effect - redirect when everything is loaded
  useEffect(() => {
    // Only navigate when totalProgress reaches 100%
    if (totalProgress >= 100 && isInitialized) {
      // Add a small delay for better UX so user can see "Redirecting..." text
      const redirectTimer = setTimeout(() => {
        console.log("Loading complete, navigating to dashboard");
        navigate("/dashboard");
      }, 1000);

      return () => clearTimeout(redirectTimer);
    }
  }, [totalProgress, isInitialized, navigate]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        width: "100vw",
      }}
    >
      <Box className="absolute top-0 right-0 pt-4">
        <WindowsButtons />
      </Box>

      {/* Background image */}
      <Stack
        spacing={3}
        alignItems="center"
        justifyContent="center"
        sx={{
          width: "100%",
          maxWidth: "500px",
          padding: 3,
        }}
      >
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          textAlign="center"
          gap={2}
          sx={{ mb: 2 }}
        >
          <img
            src={cpuSchedulerIcon}
            alt="CPU Scheduler"
            style={{ width: "48px", height: "auto" }}
          />
          <p className="text-[#FBFCFA] text-5xl">
            CPU<strong>SCHEDULER</strong>
          </p>
        </Box>

        <p className="text-[#5A6062] font-['Inter'] text-center">
          {totalProgress < 50
            ? "Getting system information..."
            : totalProgress < 80
            ? "Loading process data..."
            : totalProgress < 100
            ? "Finalizing system configuration..."
            : "Redirecting to dashboard..."}
        </p>

        <Box sx={{ width: "80%", mb: 2 }}>
          <LinearProgress
            variant="determinate"
            value={totalProgress}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: "#151B1E",
              "& .MuiLinearProgress-bar": {
                borderRadius: 4,
                backgroundColor: "#60E2AE",
              },
            }}
          />
        </Box>
      </Stack>
    </Box>
  );
};

export default WelcomePage;
