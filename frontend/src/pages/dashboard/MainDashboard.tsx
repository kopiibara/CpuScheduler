import { Box } from "@mui/material";
import Header from "../../components/Header";
import ProcessInput from "../../components/ProcessInput";
import ProcessGraph from "../../components/ProcessGraph";
import "../../style/custom-scrollbar.css"; // Import global styles

const MainDashboard = () => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        height: "100%",
        width: "100%",
        maxWidth: "100vw",
        overflow: "hidden", // Prevent double scrollbars
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
          <ProcessInput />
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
          <ProcessGraph />
        </Box>
      </Box>
    </Box>
  );
};

export default MainDashboard;
