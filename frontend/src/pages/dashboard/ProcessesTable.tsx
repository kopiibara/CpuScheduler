import React from "react";
import "./ProcessesTable.css";
import NoIcon from "@mui/icons-material/InsertDriveFileRounded";
import RefreshIcon from "@mui/icons-material/Refresh";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import { useProcesses } from "../../context/ProcessContext";
import { Switch, Tooltip, IconButton } from "@mui/material";

interface ProcessesTableProps {
  selectedApp: { name: string; processes: any[] } | null;
  onSelectApp: (appName: string, processes: any[]) => void;
}

const ProcessesTable: React.FC<ProcessesTableProps> = ({
  selectedApp,
  onSelectApp,
}) => {
  const {
    filteredGroups,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    fetchProcesses,
    isAutoRefreshEnabled,
    toggleAutoRefresh,
    lastRefreshed,
  } = useProcesses();

  const handleRefresh = () => {
    fetchProcesses(true); // Force refresh
  };

  const formatLastRefreshed = () => {
    if (!lastRefreshed) return "Never";

    return lastRefreshed.toLocaleTimeString();
  };

  if (loading && !lastRefreshed) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading processes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="processes-container h-full">
      <div className="search-refresh-container flex items-center justify-between w-full px-4 py-3">
        <div className="flex-grow">
          <input
            type="text"
            placeholder="Search applications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="refresh-controls flex items-center ml-2">
          {loading && <div className="mini-loading-spinner mr-2"></div>}
          <div className="last-refreshed text-xs text-gray-500 mr-2">
            Last updated: {formatLastRefreshed()}
          </div>
          <Tooltip title="Refresh process list">
            <IconButton
              onClick={handleRefresh}
              disabled={loading}
              size="small"
              className="refresh-button"
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip
            title={
              isAutoRefreshEnabled
                ? "Disable auto-refresh"
                : "Enable auto-refresh"
            }
          >
            <div className="auto-refresh-toggle flex items-center ml-1">
              <span className="text-xs">Auto</span>
              <Switch
                size="small"
                checked={isAutoRefreshEnabled}
                onChange={toggleAutoRefresh}
                color="primary"
              />
            </div>
          </Tooltip>
        </div>
      </div>

      <div className="table-container custom-scrollbar">
        <table className="processes-table">
          <thead>
            <tr className="text-[#080e11]">
              <th>Icon</th>
              <th>
                Application <span>({filteredGroups.length})</span>
              </th>
              <th>Process Count</th>
            </tr>
          </thead>
          <tbody>
            {filteredGroups.map(([appName, processes]) => {
              // Get the icon from the most important process in the group (first one)
              const mainProcess = processes[0];
              const isSelected = selectedApp?.name === appName;

              return (
                <tr
                  key={appName}
                  onClick={() => onSelectApp(appName, processes)}
                  className={isSelected ? "selected-row" : ""}
                  style={{ cursor: "pointer" }}
                >
                  <td className="icon-cell">
                    {mainProcess?.icon ? (
                      <img
                        src={mainProcess.icon}
                        alt=""
                        width="24"
                        height="24"
                        className="process-icon"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-6 h-6">
                        <NoIcon
                          sx={{
                            width: 24,
                            height: 24,
                            color: "#aaaaaa",
                          }}
                        />
                      </div>
                    )}
                  </td>
                  <td className="process-name">{appName}</td>
                  <td>{processes.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProcessesTable;
