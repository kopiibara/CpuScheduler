import { useState } from "react";
import { Stack, Box, Divider } from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import WindowButtons from "./WindowButtons";
import SystemInfoModal from "./SystemInfoModal";

const Header = () => {
  const [modalOpen, setModalOpen] = useState(false);

  const handleOpenModal = () => setModalOpen(true);
  const handleCloseModal = () => setModalOpen(false);
  return (
    <>
      <header className="flex justify-baseline w-screen items-center border-b-2 border-[#242A2D]">
        <Stack direction="row" spacing={2} className="w-full">
          <Box className="flex w-full px-10 py-5 items-center">
            <img
              src="/cpuScheduler-icon.svg"
              alt="CPU Scheduler"
              className="w-[26px] h-auto mr-3"
            />
            <p className="text-[16px] text-[#FBFCFA]">
              CPU<strong>SCHEDULER</strong>
            </p>
          </Box>
          <button
            onClick={handleOpenModal}
            className="text-[#242A2D] hover:text-[#60E2AE] pr-3 cursor-pointer whitespace-nowrap text-[16px] flex items-center"
          >
            <InfoIcon sx={{ mr: 1, fontSize: 20 }} />
            SYSTEM INFO
          </button>

          <Divider
            orientation="vertical"
            flexItem
            sx={{ width: "2px", backgroundColor: "#242A2D" }}
          />
          <WindowButtons />
        </Stack>
      </header>
      <SystemInfoModal open={modalOpen} onClose={handleCloseModal} />
    </>
  );
};

export default Header;
