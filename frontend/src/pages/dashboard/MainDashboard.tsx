import { Box, Typography, Paper } from "@mui/material";
import { useSystemInfo } from "../../context/SystemInfoContext";

const MainDashboard = () => {
  const { systemInfo, error } = useSystemInfo();

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
        }}
      >
        <img
          src="/cpuScheduler-icon.svg"
          alt="CPU Scheduler"
          style={{ width: "42px", height: "auto" }}
        />
        <Typography variant="h3" sx={{ color: "#191C20", fontWeight: 500 }}>
          Dashboard
        </Typography>
      </Box>

      {/* Main content */}
      <Paper
        elevation={1}
        sx={{
          width: "100%",
          maxWidth: 800,
          p: 3,
          borderRadius: 2,
          mx: "auto",
        }}
      >
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
          System Information
        </Typography>

        {error ? (
          <Box p={2} sx={{ backgroundColor: "#ffebee", borderRadius: 1 }}>
            <Typography color="error">{error}</Typography>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
            <InfoItem label="CPU" value={systemInfo?.manufacturer || "N/A"} />
            <InfoItem label="Cores" value={systemInfo?.cores || "N/A"} />
            <InfoItem label="Threads" value={systemInfo?.threads || "N/A"} />
            <InfoItem
              label="Frequency"
              value={
                typeof systemInfo?.frequency === "number"
                  ? `${systemInfo?.frequency} MHz`
                  : systemInfo?.frequency || "N/A"
              }
            />
            <InfoItem label="Ram" value={systemInfo?.ram || "N/A"} />
            <InfoItem
              label="Operating System"
              value={systemInfo?.os || "N/A"}
            />
            <InfoItem
              label="Scheduler"
              value={systemInfo?.schedulingPolicy || "N/A"}
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
};

// Helper component for displaying info items
const InfoItem = ({ label, value }: { label: string; value: any }) => (
  <Box sx={{ width: { xs: "100%", sm: "48%" } }}>
    <Typography variant="subtitle2" sx={{ color: "#666", mb: 0.5 }}>
      {label}
    </Typography>
    <Typography variant="body1" fontWeight={500}>
      {value}
    </Typography>
  </Box>
);

export default MainDashboard;
