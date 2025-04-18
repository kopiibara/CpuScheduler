import React, { useState, useEffect } from "react";
import axios from "axios";
import "./ActionModal.css";

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  processId: number;
  processName: string;
  modalType: "affinity" | "priority";
}

const ActionModal: React.FC<ActionModalProps> = ({
  isOpen,
  onClose,
  processId,
  processName,
  modalType,
}) => {
  const [availableCores, setAvailableCores] = useState<number[]>([]);
  const [selectedCores, setSelectedCores] = useState<number[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<string>("normal");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Get system information on component mount
  useEffect(() => {
    if (isOpen && modalType === "affinity") {
      // Get current process affinity
      const getProcessInfo = async () => {
        try {
          const response = await axios.get(
            `${import.meta.env.VITE_BACKEND_URL}/processes`
          );
          const processes = response.data;
          const process = processes.find((p: any) => p.pid === processId);

          if (process) {
            setSelectedCores(process.cpu_affinity || []);
          }

          // Determine available cores based on system
          const coreCount = navigator.hardwareConcurrency || 4;
          setAvailableCores(Array.from({ length: coreCount }, (_, i) => i));
        } catch (err) {
          console.error("Error fetching process info:", err);
          setError("Failed to load process information");
        }
      };

      getProcessInfo();
    }
  }, [isOpen, processId, modalType]);

  const handleCoresToggles = (coreIndex: number) => {
    setSelectedCores((prevCores) => {
      if (prevCores.includes(coreIndex)) {
        // Remove core
        return prevCores.filter((c) => c !== coreIndex);
      } else {
        // Add core
        return [...prevCores, coreIndex].sort((a, b) => a - b);
      }
    });
  };

  const handlePriorityChange = (priority: string) => {
    setSelectedPriority(priority);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (modalType === "affinity") {
        // Prevent empty core selection
        if (selectedCores.length === 0) {
          setError("You must select at least one CPU core");
          setLoading(false);
          return;
        }

        await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/processes/${processId}/affinity`,
          {
            cores: selectedCores,
          }
        );
        setSuccess("CPU affinity updated successfully");
      } else {
        await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/processes/${processId}/priority`,
          {
            priority: selectedPriority,
          }
        );
        setSuccess("Process priority updated successfully");
      }

      // Close modal after a delay to show success message
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error(`Error setting ${modalType}:`, err);
      setError(`Failed to update ${modalType}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const priorityOptions = [
    { value: "idle", label: "Idle (Lowest)" },
    { value: "below_normal", label: "Below Normal" },
    { value: "normal", label: "Normal" },
    { value: "above_normal", label: "Above Normal" },
    { value: "high", label: "High" },
    { value: "realtime", label: "Realtime (Highest)" },
  ];

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>
            {modalType === "affinity"
              ? "Set CPU Affinity"
              : "Set Process Priority"}
          </h2>
          <button className="close-button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div className="process-info">
            <p>
              <strong>Process:</strong> {processName} (PID: {processId})
            </p>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          {modalType === "affinity" ? (
            <div className="affinity-selector">
              <p>Select which CPU cores this process can run on:</p>
              <div className="cores-grid">
                {availableCores.map((core) => (
                  <label key={core} className="core-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedCores.includes(core)}
                      onChange={() => handleCoresToggles(core)}
                    />
                    Core {core}
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="priority-selector">
              <p>Select the scheduling priority for this process:</p>
              <div className="priority-options">
                {priorityOptions.map((option) => (
                  <label key={option.value} className="priority-radio">
                    <input
                      type="radio"
                      name="priority"
                      value={option.value}
                      checked={selectedPriority === option.value}
                      onChange={() => handlePriorityChange(option.value)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="cancel-button"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="save-button"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionModal;
