import { Stack, Tooltip } from "@mui/material";
import { useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";

import "../style/custom-scrollbar.css";

// Use unique IDs that don't change when reindexing
let nextId = 2; // Start with 2 since we already have process 1

const ProcessInput = () => {
  const [processes, setProcesses] = useState([
    { id: 1, index: 1, arrival: "", burst: "", priority: "" },
  ]);

  const addProcess = () => {
    const newId = nextId++;
    setProcesses([
      ...processes,
      {
        id: newId,
        index: processes.length + 1,
        arrival: "",
        burst: "",
        priority: "",
      },
    ]);
  };

  const removeProcess = (id: number) => {
    // Don't remove if it's the last process
    if (processes.length <= 1) {
      return;
    }

    // Remove the process with the specific ID
    const filteredProcesses = processes.filter((process) => process.id !== id);

    // Reindex remaining processes to ensure sequential indexes (not IDs)
    const reindexedProcesses = filteredProcesses.map((process, idx) => ({
      ...process,
      index: idx + 1, // Update visual index
    }));

    setProcesses(reindexedProcesses);
  };

  const handleChange = (id: number, field: string, value: string) => {
    setProcesses(
      processes.map((process) =>
        process.id === id ? { ...process, [field]: value } : process
      )
    );
  };

  return (
    <Stack
      spacing={4}
      className="h-full flex flex-col overflow-hidden w-auto py-6 px-10"
    >
      {/* Header section */}
      <header>
        <Stack
          spacing={1}
          className="flex-shrink-0"
          direction={"row"}
          alignItems={"center"}
          justifyContent={"space-between"}
        >
          <Stack spacing={1}>
            <p className="text-[#FBFCFA] text-[16px] font-[600]">ADD PROCESS</p>
            <p className="text-[#7F8588] text-[14px] font-['Inter']">
              Input the following details to start simulation.
            </p>
          </Stack>
          <Tooltip
            title="Add"
            arrow
            placement="bottom"
            componentsProps={{
              tooltip: {
                sx: {
                  bgcolor: "#242A2D",
                  color: "#FBFCFA",
                  borderRadius: "8px",
                  padding: "0.5rem 1rem",
                  fontSize: "0.75rem",
                  "& .MuiTooltip-arrow": {
                    color: "#242A2D",
                  },
                },
              },
            }}
          >
            <button
              onClick={addProcess}
              className="bg-white w-8 h-8 rounded-lg font-semibold hover:bg-[#60E2AE] transition-all duration-200 flex items-center justify-center"
            >
              <AddRoundedIcon fontSize="small" />
            </button>
          </Tooltip>
        </Stack>
      </header>

      <body>
        {/* Table header row */}
        <div
          className="grid w-full flex-shrink-0 pb-4"
          style={{
            gridTemplateColumns: "90px 0.45fr 0.45fr 0.45fr 45px",
            gap: "10px",
          }}
        >
          <div className="text-[#FBFCFA] text-[13px]">PROCESS ID</div>
          <div className="text-[#FBFCFA] text-[13px]">ARRIVAL TIME</div>
          <div className="text-[#FBFCFA] text-[13px]">BURST TIME</div>
          <div className="text-[#FBFCFA] text-[13px]">PRIORITY</div>
          <div className="text-[#FBFCFA] text-[13px]"></div>
        </div>

        {/* Scrollable process list - with max height to leave room for button */}
        <div
          className="overflow-y-auto custom-scrollbar overflow-x-hidden"
          style={{ maxHeight: "calc(100% - 130px)" }}
        >
          {processes.map((process) => (
            <div
              key={process.id}
              className="grid items-center w-full mb-3"
              style={{
                gridTemplateColumns: "90px 0.45fr 0.45fr 0.45fr 45px",
                gap: "10px",
              }}
            >
              <span className="text-[#7F8588]">
                # {String(process.index).padStart(2, "0")}
              </span>
              <input
                type="number"
                value={process.arrival}
                onChange={(e) =>
                  handleChange(process.id, "arrival", e.target.value)
                }
                className="bg-[#242A2D] text-white p-2 rounded-[8px] w-full outline-none border-2 border-transparent hover:border-[#60E2AE] focus:border-[#60E2AE] transition-colors duration-200"
                placeholder="0"
              />
              <input
                type="number"
                value={process.burst}
                onChange={(e) =>
                  handleChange(process.id, "burst", e.target.value)
                }
                className="bg-[#242A2D] text-white p-2 rounded-[8px] w-full outline-none border-2 border-transparent hover:border-[#60E2AE] focus:border-[#60E2AE] transition-colors duration-200"
                placeholder="0"
              />
              <input
                type="number"
                value={process.priority}
                onChange={(e) =>
                  handleChange(process.id, "priority", e.target.value)
                }
                className="bg-[#242A2D] text-white p-2 rounded-[8px] w-full outline-none border-2 border-transparent hover:border-[#60E2AE] focus:border-[#60E2AE] transition-colors duration-200"
                placeholder="0"
              />
              {processes.length > 1 && (
                <button
                  onClick={() => removeProcess(process.id)}
                  className="rounded-[8px] p-2 h-fit w-fit flex items-center justify-center hover:bg-[#1E1619] hover:scale-105 transition-all duration-200 ease-in"
                >
                  <img src="/trash.svg" alt="trash" className="w-5" />
                </button>
              )}
              {processes.length <= 1 && <div className="w-[45px]"></div>}
            </div>
          ))}
        </div>
      </body>

      <footer className="items-end text-">
        {/* Button to start simulation */}
        <button className="absolute group flex items-center gap-2 z-10 bottom-8 left-90 text-[#242A2D] text-[14px] hover:text-[#60E2AE] cursor-pointer">
          START SIMULATION{" "}
          <img
            src="/arrow-right.svg"
            alt="arrow"
            className="w-4 h-auto block group-hover:hidden transition-all duration-200"
          />
          <img
            src="/arrow-right-light.svg"
            alt="arrow"
            className="w-4 h-auto hidden group-hover:block transition-all duration-200"
          />
        </button>
      </footer>
    </Stack>
  );
};

export default ProcessInput;
