import { Stack, Box, LinearProgress, Typography } from "@mui/material";
import { useEffect } from "react";
import { useSystemInfoFetch } from "../../hooks/useSystemInfoFetch";

const WelcomePage = () => {
  const { fetchProgress, fetchSystemInfo } = useSystemInfoFetch(3000); // 3 seconds minimum loading time

  // Trigger the fetch on component mount
  useEffect(() => {
    fetchSystemInfo();
  }, [fetchSystemInfo]);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        width: "100vw",
        background: "#f8f8f4",
      }}
    >
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
            src="/cpuScheduler-icon.svg"
            alt="CPU Scheduler"
            style={{ width: "48px", height: "auto" }}
          />
          <Typography
            variant="h2"
            sx={{
              color: "#191C20",
              fontWeight: 400,
              fontSize: { xs: "2rem", sm: "3rem" },
            }}
          >
            cpu<strong>Scheduler</strong>
          </Typography>
        </Box>

        <Typography
          variant="body2"
          sx={{
            color: "#666",
            textAlign: "center",
          }}
        >
          {fetchProgress < 80
            ? "Getting system information..."
            : fetchProgress < 100
            ? "Finalizing system configuration..."
            : "Redirecting to dashboard..."}
        </Typography>

        <Box sx={{ width: "80%", mb: 2 }}>
          <LinearProgress
            variant="determinate"
            value={fetchProgress}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: "rgba(25, 28, 32, 0.1)",
              "& .MuiLinearProgress-bar": {
                borderRadius: 4,
                backgroundColor: "#191C20",
              },
            }}
          />
        </Box>
      </Stack>
    </Box>
  );
};

export default WelcomePage;
