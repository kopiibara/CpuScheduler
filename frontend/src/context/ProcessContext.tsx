import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import axios from "axios";
import { GroupedProcesses } from "../types/ProcessObject";

interface ProcessContextType {
  groupedProcesses: GroupedProcesses;
  loading: boolean;
  error: string | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  fetchProcesses: (forceRefresh?: boolean) => Promise<void>;
  filteredGroups: [string, any][];
  isInitialized: boolean;
  isAutoRefreshEnabled: boolean;
  toggleAutoRefresh: () => void;
  refreshInterval: number;
  setRefreshInterval: (interval: number) => void;
  lastRefreshed: Date | null;
}

const ProcessContext = createContext<ProcessContextType | undefined>(undefined);

export const ProcessProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [groupedProcesses, setGroupedProcesses] = useState<GroupedProcesses>(
    {}
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] =
    useState<boolean>(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(3000); // 3 seconds default
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchProcesses = useCallback(
    async (forceRefresh = false): Promise<void> => {
      // Skip fetching if we already have data and are not forcing a refresh
      if (
        Object.keys(groupedProcesses).length > 0 &&
        !loading &&
        !forceRefresh
      ) {
        console.log("Processes already loaded, skipping fetch");
        return; // Just return void
      }

      try {
        setLoading(true);
        console.log("Fetching processes from API...");
        const response = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/processes/grouped`
        );
        console.log("Processes fetched successfully!");
        setGroupedProcesses(response.data);
        setError(null);
        setIsInitialized(true);
        setLastRefreshed(new Date());
      } catch (err) {
        console.error("Error fetching grouped processes:", err);
        setError("Failed to load processes. Please try again later.");
      } finally {
        setLoading(false);
      }
    },
    [groupedProcesses, loading]
  );

  const toggleAutoRefresh = useCallback(() => {
    setIsAutoRefreshEnabled((prev) => !prev);
  }, []);

  // Set up auto-refresh
  useEffect(() => {
    let intervalId: number | undefined;

    if (isAutoRefreshEnabled) {
      intervalId = window.setInterval(() => {
        fetchProcesses(true); // Force refresh
      }, refreshInterval);
    }

    // Cleanup function
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isAutoRefreshEnabled, refreshInterval, fetchProcesses]);

  // Filter application groups by name
  const filteredGroups = Object.entries(groupedProcesses).filter(([appName]) =>
    appName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ProcessContext.Provider
      value={{
        groupedProcesses,
        loading,
        error,
        searchTerm,
        setSearchTerm,
        fetchProcesses,
        filteredGroups,
        isInitialized,
        isAutoRefreshEnabled,
        toggleAutoRefresh,
        refreshInterval,
        setRefreshInterval,
        lastRefreshed,
      }}
    >
      {children}
    </ProcessContext.Provider>
  );
};

export const useProcesses = () => {
  const context = useContext(ProcessContext);
  if (!context) {
    throw new Error("useProcesses must be used within a ProcessProvider");
  }
  return context;
};
