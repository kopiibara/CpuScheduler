import { Stack, Box, LinearProgress } from "@mui/material";
import { useEffect } from "react";
import { useSystemInfoFetch } from "../../hooks/useSystemInfoFetch";
import WindowButtons from "../../components/WindowButtons";
import cpuSchedulerIcon from "../../assets/cpuScheduler-icon.svg";

const WelcomePage = () => {
  const { fetchProgress, fetchSystemInfo } = useSystemInfoFetch(3000); // 3 seconds minimum loading time

  // Trigger the fetch on component mount
  useEffect(() => {
    fetchSystemInfo();
  }, [fetchSystemInfo]);

  useEffect(() => {
    console.log("Welcome Page");
  }, []);

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
        <WindowButtons />
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
          {fetchProgress < 80
            ? "Getting system information..."
            : fetchProgress < 100
            ? "Finalizing system configuration..."
            : "Redirecting to dashboard..."}
        </p>

        <Box sx={{ width: "80%", mb: 2 }}>
          <LinearProgress
            variant="determinate"
            value={fetchProgress}
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
