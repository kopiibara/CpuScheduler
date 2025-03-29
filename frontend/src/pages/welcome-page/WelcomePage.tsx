import { Stack, Box, LinearProgress } from "@mui/material";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const WelcomePage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/pages/dashboard");
    }, 3000);

    // Cleanup function to clear timer if component unmounts
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <Stack
      spacing={2}
      alignItems="center"
      justifyContent="center"
      height="full"
      width="100vw"
    >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        textAlign={"center"}
        width="100%"
        height="100%"
        gap={2}
      >
        <img src="/cpuScheduler-icon.svg" alt="" className="w-12 h-auto" />
        <p className="text-[#191C20] text-[3rem]">
          cpu<strong>Scheduler</strong>
        </p>
      </Box>
      <p className="text-[#191C20] text-[1rem]">Getting your system specs...</p>
      <Box sx={{ width: "40%" }}>
        <LinearProgress
          sx={{
            height: 6,
            borderRadius: 4,
            backgroundColor: "rgba(25, 28, 32, 0.1)",
            "& .MuiLinearProgress-bar": {
              borderRadius: 4,
              backgroundColor: "#191C20",
            },
          }}
        />
      </Box>
      <Box flex={1} />
    </Stack>
  );
};

export default WelcomePage;
