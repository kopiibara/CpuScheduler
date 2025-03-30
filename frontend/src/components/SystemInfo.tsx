import { Box, Typography, Paper } from "@mui/material";
import { useSystemInfo } from "../context/SystemInfoContext";
import InfoItem from "./InfoItem";

const SystemInfo = () => {
  const { systemInfo, error } = useSystemInfo();

  return (
    <Paper
      elevation={1}
      sx={{
        width: "100%",
        maxWidth: 800,
        p: 3,
        borderRadius: 2,
        mx: "auto",
        height: "100%",
        maxHeight: "100%",
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
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
          <InfoItem label="CPU" value={systemInfo?.manufacturer || "N/A"} />
          <InfoItem label="Cores" value={systemInfo?.cores || "N/A"} />
          <InfoItem
            label="Architecture"
            value={systemInfo?.architecture || "N/A"}
          />
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
          <InfoItem label="Operating System" value={systemInfo?.os || "N/A"} />
          <InfoItem
            label="Scheduler"
            value={systemInfo?.schedulingPolicy || "N/A"}
          />
        </Box>
      )}
    </Paper>
  );
};

export default SystemInfo;
