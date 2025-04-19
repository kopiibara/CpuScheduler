import React, { useState } from "react";
import "./ProcessesTable.css";
import NoIcon from "@mui/icons-material/InsertDriveFileRounded";
import { useProcesses } from "../../context/ProcessContext";
import BackspaceIcon from "@mui/icons-material/BackspaceRounded";

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
    isInitialized,
  } = useProcesses();

  // Add sorting state
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    null
  );
  const [sortedGroups, setSortedGroups] = useState(filteredGroups);

  // Update sorted groups when filtered groups change
  React.useEffect(() => {
    setSortedGroups(filteredGroups);
    // Reset sort direction when data changes
    setSortDirection(null);
  }, [filteredGroups]);

  // Handle sorting by name
  const handleSortByName = () => {
    if (sortDirection === null) {
      // First click - sort ascending
      setSortedGroups(
        [...filteredGroups].sort((a, b) => a[0].localeCompare(b[0]))
      );
      setSortDirection("asc");
    } else if (sortDirection === "asc") {
      // Second click - sort descending
      setSortedGroups(
        [...filteredGroups].sort((a, b) => b[0].localeCompare(a[0]))
      );
      setSortDirection("desc");
    } else {
      // Third click - back to ascending (not default)
      setSortedGroups(
        [...filteredGroups].sort((a, b) => a[0].localeCompare(b[0]))
      );
      setSortDirection("asc");
    }
  };

  // Add double click handler to reset to default
  const handleDoubleClickName = () => {
    setSortedGroups(filteredGroups);
    setSortDirection(null);
  };

  // Only show loading indicator on initial load, not during search or auto-refresh
  if (!isInitialized && loading) {
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

  // Display "No results found" message when searching with no matches
  const isSearching = searchTerm.trim() !== "";
  const hasNoSearchResults = isSearching && filteredGroups.length === 0;

  return (
    <div className="processes-container h-full">
      <div className="search-refresh-container flex items-center justify-between w-full px-4 py-3">
        <div className="flex-grow relative">
          <input
            type="text"
            placeholder="Search applications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-3.5 transform -translate-y-1/2 text-gray-500 hover:text-[#60e2ae] focus:outline-none"
              aria-label="Clear search"
            >
              <BackspaceIcon fontSize="small" />
            </button>
          )}
        </div>
      </div>

      {hasNoSearchResults ? (
        <div className="flex items-center justify-center h-64 text-[#5A6062]">
          No applications match your search
        </div>
      ) : (
        <div className="table-container custom-scrollbar">
          <table className="processes-table">
            <thead>
              <tr className="text-[#080e11]">
                <th>Icon</th>
                <th
                  onClick={handleSortByName}
                  onDoubleClick={handleDoubleClickName}
                  className="cursor-pointer hover:text-[#60e2ae]"
                  title="Click to sort, double-click to reset"
                >
                  Application <span>({filteredGroups.length})</span>
                  {sortDirection && (
                    <span className="ml-1">
                      {sortDirection === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </th>
                <th>Process Count</th>
              </tr>
            </thead>
            <tbody>
              {sortedGroups.map(([appName, processes]) => {
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
      )}
    </div>
  );
};

export default ProcessesTable;
