import { useState, useEffect } from "react";
import { Stack } from "@mui/material";

// SVG Icons for window controls (more consistent across platforms)
const MinimizeIcon = () => (
  <svg width="10" height="1" viewBox="0 0 10 1">
    <path d="M0 0h10v1H0z" fill="#242A2D" />
  </svg>
);

const MaximizeIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10">
    <path d="M0 0v10h10V0H0zm9 9H1V1h8v8z" fill="#242A2D" />
  </svg>
);

const RestoreIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10">
    <path
      d="M2 0v2H0v8h8V8h2V0H2zm5 9H1V3h6v6zm2-2H8V2H3V1h6v6z"
      fill="#242A2D"
    />
  </svg>
);

const CloseIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10">
    <path
      d="M10 1.01L8.99 0 5 3.99 1.01 0 0 1.01 3.99 5 0 8.99 1.01 10 5 6.01 8.99 10 10 8.99 6.01 5 10 1.01z"
      fill="#242A2D"
    />
  </svg>
);

const WindowButtons = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  // Check window state on mount and when it changes
  const updateMaximizedState = async () => {
    try {
      const maximized = await window.windowControls.isMaximized();
      setIsMaximized(maximized);
    } catch (error) {
      console.error("Error checking maximized state:", error);
    }
  };

  useEffect(() => {
    // Initial check
    updateMaximizedState();

    // Listen for window state changes
    const handleStateChange = (
      _event: any,
      state: { isMaximized: boolean }
    ) => {
      if (state && typeof state.isMaximized === "boolean") {
        setIsMaximized(state.isMaximized);
      } else {
        updateMaximizedState();
      }
    };

    window.ipcRenderer.on("window-state-changed", handleStateChange);

    return () => {
      window.ipcRenderer.off("window-state-changed", handleStateChange);
    };
  }, []);

  const handleMinimize = () => {
    window.windowControls.minimize();
  };

  const handleMaximize = () => {
    window.windowControls.maximize();
  };

  const handleClose = () => {
    window.windowControls.close();
  };

  return (
    <Stack
      direction="row"
      alignItems={"center"}
      className="window-controls-container pr-4"
    >
      <button
        onClick={handleMinimize}
        className="control-button w-10 h-8 flex justify-center items-center rounded-[6px] hover:bg-[#60E2AE]"
        aria-label="Minimize"
      >
        <MinimizeIcon />
      </button>
      <button
        onClick={handleMaximize}
        className="control-button w-10 h-8 flex justify-center items-center rounded-[6px] hover:bg-[#60E2AE]"
        aria-label={isMaximized ? "Restore" : "Maximize"}
      >
        {isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
      </button>
      <button
        onClick={handleClose}
        className="control-button w-10 h-8 flex justify-center items-center rounded-[6px] hover:bg-red-600"
        aria-label="Close"
      >
        <CloseIcon />
      </button>
    </Stack>
  );
};

export default WindowButtons;
