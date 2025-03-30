import { Box, Typography } from "@mui/material";
import SystemInfo from "../../components/SystemInfo";
import ProcessInput from "../../components/ProcessInput";

const MainDashboard = () => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        minHeight: "100vh",
        width: "100vw",
        padding: 3,
        backgroundColor: "#FBFCFA",
        overflowY: "auto",
      }}
    >
      {/* Header with logo */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        textAlign="center"
        gap={2}
        sx={{
          width: "100%",
          mb: 4,
          pt: 2,
          overflowY: "auto",
        }}
      >
        <img
          src="/cpuScheduler-icon.svg"
          alt="CPU Scheduler"
          style={{ width: "42px", height: "auto" }}
        />
        <Typography variant="h3" sx={{ color: "#191C20", fontWeight: 500 }}>
          cpu<strong>Scheduler</strong>
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "top",
          justifyContent: "top",
          gap: 2,
          padding: 3,
          backgroundColor: "#FBFCFA",
          overflowY: "auto",
        }}
      >
        {/* System Information */}
        <SystemInfo />
        {/* Process Input Section */}
        <Box
          sx={{
            width: "100%",
            maxWidth: 800,

            p: 3,
            borderRadius: 2,
            backgroundColor: "#fff",
            boxShadow: 1,
          }}
        >
          <ProcessInput />
        </Box>
      </Box>
    </Box>
  );
};

export default MainDashboard;
