import { useState, useEffect } from "react";
import Header from "../../components/Header";
import ProcessesTable from "./ProcessesTable";
import AppProcessesList from "./AppProcessesList";

const DashboardPage = () => {
  const [selectedApp, setSelectedApp] = useState<{
    name: string;
    processes: any[];
  } | null>(null);

  const handleAppSelect = (appName: string, processes: any[]) => {
    setSelectedApp({ name: appName, processes });
  };

  // Add this useEffect to your Dashboard component
  useEffect(() => {
    // Listen for app terminated events
    const handleAppTerminated = (event: any) => {
      const { appName } = event.detail;

      // If the terminated app is currently selected, clear the selection
      if (selectedApp?.name === appName) {
        setSelectedApp(null);
      }
    };

    window.addEventListener("appTerminated", handleAppTerminated);

    return () => {
      window.removeEventListener("appTerminated", handleAppTerminated);
    };
  }, [selectedApp]);

  return (
    <div className="w-screen h-screen text-[#FBFCFA] overflow-hidden flex flex-col">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* Left side: Processes Table */}
        <div className="w-7/20 h-full overflow-hidden">
          <ProcessesTable
            selectedApp={selectedApp}
            onSelectApp={handleAppSelect}
          />
        </div>

        {/* Right side: Selected App Details */}
        <div className="w-13/20 h-full overflow-hidden">
          {selectedApp ? (
            <AppProcessesList
              appName={selectedApp.name}
              processes={selectedApp.processes}
              icon={selectedApp.processes[0]?.icon}
            />
          ) : (
            <div className="flex items-center justify-center h-full border-l-2 border-[#242a2d]">
              <p className="text-[#242a2d] text-lg">
                Select an application to view its processes
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
