import { useState, useCallback } from "react";
import axios from "axios";
import { GroupedProcesses } from "../types/ProcessObject";

export const useProcesses = () => {
  const [groupedProcesses, setGroupedProcesses] = useState<GroupedProcesses>(
    {}
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  const fetchProcesses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/processes/grouped`
      );
      setGroupedProcesses(response.data);
      setError(null);
      setIsInitialized(true);
    } catch (err) {
      console.error("Error fetching grouped processes:", err);
      setError("Failed to load processes. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter application groups by name
  const filteredGroups = Object.entries(groupedProcesses).filter(([appName]) =>
    appName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return {
    groupedProcesses,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    fetchProcesses,
    filteredGroups,
    isInitialized,
  };
};
