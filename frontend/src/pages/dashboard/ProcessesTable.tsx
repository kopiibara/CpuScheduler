import React, { useState, useEffect } from "react";
import axios from "axios";
import "./ProcessesTable.css";
import ActionModal from "../../components/ActionModal/ActionModal";

// Define the Process interface to match the backend data structure
interface Process {
  pid: number;
  name: string;
  status: string;
  cpu_affinity: number[];
  exe: string | null;
  description: string | null;
  icon: string | null;
}

const ProcessesTable: React.FC = () => {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Modal state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [modalType, setModalType] = useState<"affinity" | "priority">(
    "affinity"
  );

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    processId: number;
  }>({
    visible: false,
    x: 0,
    y: 0,
    processId: 0,
  });

  useEffect(() => {
    const fetchProcesses = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/processes`
        );
        setProcesses(response.data);
        setError(null);
      } catch (err) {
        console.error("Error fetching processes:", err);
        setError("Failed to load processes. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchProcesses();

    // Hide context menu when clicking elsewhere
    const handleClick = () => {
      setContextMenu({ ...contextMenu, visible: false });
    };

    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, []);

  const handleContextMenu = (e: React.MouseEvent, process: Process) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      processId: process.pid,
    });
    setSelectedProcess(process);
  };

  const openModal = (type: "affinity" | "priority") => {
    setModalType(type);
    setModalOpen(true);
    setContextMenu({ ...contextMenu, visible: false });
  };

  const closeModal = () => {
    setModalOpen(false);
    // Refresh process list after modal is closed
    const fetchProcesses = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/processes`
        );
        setProcesses(response.data);
      } catch (err) {
        console.error("Error refreshing processes:", err);
      }
    };
    fetchProcesses();
  };

  const filteredProcesses = processes.filter(
    (process) =>
      process.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      process.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false
  );

  if (loading) {
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
    <div className="processes-container">
      <div className="search-container">
        <input
          type="text"
          placeholder="Search processes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <p>{filteredProcesses.length} processes found</p>
      </div>

      <div className="table-container">
        <table className="processes-table">
          <thead>
            <tr className="text-[#080e11]">
              <th>Icon</th>
              <th>PID</th>
              <th>Name</th>
              <th>Status</th>
              <th>CPU Affinity</th>
              <th>Path</th>
            </tr>
          </thead>
          <tbody>
            {filteredProcesses.map((process) => (
              <tr
                key={process.pid}
                onContextMenu={(e) => handleContextMenu(e, process)}
              >
                <td className="icon-cell">
                  {process.icon ? (
                    <img
                      src={process.icon}
                      alt=""
                      width="24"
                      height="24"
                      className="process-icon"
                    />
                  ) : (
                    <div className="placeholder-icon"></div>
                  )}
                </td>
                <td>{process.pid}</td>
                <td className="process-name">{process.name}</td>
                <td>
                  <span className={`status-badge status-${process.status}`}>
                    {process.status}
                  </span>
                </td>
                <td>
                  {process.cpu_affinity?.length > 0
                    ? process.cpu_affinity.join(", ")
                    : "N/A"}
                </td>
                <td className="path-cell">
                  <div className="path-content">{process.exe || "N/A"}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="context-menu"
          style={{
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
            position: "fixed",
            zIndex: 1000,
          }}
        >
          <ul>
            <li onClick={() => openModal("affinity")}>Set CPU Affinity</li>
            <li onClick={() => openModal("priority")}>Set Process Priority</li>
          </ul>
        </div>
      )}

      {/* Action Modal */}
      {selectedProcess && (
        <ActionModal
          isOpen={modalOpen}
          onClose={closeModal}
          processId={selectedProcess.pid}
          processName={selectedProcess.name}
          modalType={modalType}
        />
      )}
    </div>
  );
};

export default ProcessesTable;
