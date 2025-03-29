//import React from "react";
import { Stack, Box } from "@mui/material";

const MainDashboard = () => {
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
        <p className="text-[#191C20] text-[3rem]">Dashboard</p>
      </Box>
    </Stack>
  );
};

export default MainDashboard;
