import * as React from "react";
import { Box, Button, Modal, Stack } from "@mui/material";
import { useSystemInfo } from "../context/SystemInfoContext";
import CloseIcon from "@mui/icons-material/CloseRounded";
import InfoItem from "./InfoItem";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "full",
  borderRadius: "8px",
  backgroundColor: "#080e11",
  border: "2px solid #242A2D",
  boxShadow: 24,
};

// Define the props interface for SystemInfoModal
interface SystemInfoModalProps {
  open?: boolean;
  onClose?: () => void;
  renderTrigger?: (handleOpen: () => void) => React.ReactNode;
}

export default function SystemInfoModal({
  open: externalOpen,
  onClose: externalOnClose,
  renderTrigger,
}: SystemInfoModalProps) {
  const { systemInfo, error } = useSystemInfo();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = externalOpen !== undefined;
  const open = isControlled ? externalOpen : internalOpen;

  const handleOpen = () => {
    if (!isControlled) {
      setInternalOpen(true);
    }
  };

  const handleClose = () => {
    if (isControlled) {
      externalOnClose?.();
    } else {
      setInternalOpen(false);
    }
  };

  return (
    <>
      {/* Only render the trigger button when not controlled externally */}
      {!isControlled &&
        (renderTrigger ? (
          renderTrigger(handleOpen)
        ) : (
          <Button onClick={handleOpen}>Open modal</Button>
        ))}
      <Modal open={open} onClose={handleClose}>
        <Box sx={style}>
          <Stack>
            <Box className=" border-b-2 border-[#242A2D] p-6 flex flex-row justify-center items-center">
              <Stack spacing={0.25}>
                <p className="text-[#FBFCFA] text-[16px] font-[600]">
                  SYSTEM INFORMATION
                </p>
                <p className="text-[#7F8588] text-[13px] font-['Inter']">
                  List of system information and configuration details.
                </p>
              </Stack>
              <Box sx={{ flexGrow: 1 }} />

              {/* Close button */}
              <button
                onClick={handleClose}
                className="text-[#242A2D] border-0 items-center rounded-[8px] hover:text-[#60E2AE] cursor-pointer whitespace-nowrap text-[16px] transition-all duration-100 ease-in"
              >
                <CloseIcon />
              </button>
            </Box>

            {error ? (
              <Box p={2} sx={{ backgroundColor: "#ffebee", borderRadius: 1 }}>
                <p>{error}</p>
              </Box>
            ) : (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  width: "screen",
                }}
              >
                <Box className=" border-b-2 border-r-2 border-[#242A2D]">
                  <InfoItem
                    label="CPU"
                    value={systemInfo?.manufacturer || "N/A"}
                  />
                </Box>
                <Box className=" border-b-2 border-[#242A2D]">
                  <InfoItem
                    label="Architecture"
                    value={systemInfo?.cpu_architecture || "N/A"}
                  />
                </Box>
                <Box className=" border-b-2 border-r-2 border-[#242A2D]">
                  <InfoItem label="Cores" value={systemInfo?.cores || "N/A"} />
                </Box>

                <Box className=" border-b-2 border-[#242A2D]">
                  <InfoItem
                    label="Threads"
                    value={systemInfo?.threads || "N/A"}
                  />
                </Box>
                <Box className=" border-b-2 border-r-2 border-[#242A2D]">
                  <InfoItem
                    label="Frequency"
                    value={
                      typeof systemInfo?.frequency === "number"
                        ? `${systemInfo?.frequency} MHz`
                        : systemInfo?.frequency || "N/A"
                    }
                  />
                </Box>
                <Box className=" border-b-2 border-[#242A2D]">
                  <InfoItem
                    label="Ram"
                    value={`${systemInfo?.ram || "N/A"} (Usable RAM)`}
                  />
                </Box>
                <Box className="border-r-2 border-[#242A2D]">
                  <InfoItem
                    label="Operating System"
                    value={systemInfo?.os || "N/A"}
                  />
                </Box>

                <InfoItem
                  label="Scheduler"
                  value={systemInfo?.schedulingPolicy || "N/A"}
                />
              </Box>
            )}
          </Stack>
        </Box>
      </Modal>
    </>
  );
}
