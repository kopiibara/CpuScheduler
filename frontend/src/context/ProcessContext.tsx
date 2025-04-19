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
    useState<boolean>(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(1000); // 1 second refresh
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);

  const fetchProcesses = useCallback(
    async (forceRefresh = false): Promise<void> => {
      if (isInitialLoad) {
        setLoading(true);
      } else if (forceRefresh) {
        // For forced refreshes, use a different approach than full loading screen
        // You could set a different state here if you wanted a mini-loader
      }

      try {
        const response = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/processes/grouped`,
          {
            params: { _t: new Date().getTime() }, // Cache busting
            timeout: 2000, // Short timeout to prevent hanging
          }
        );

        setGroupedProcesses(response.data);
        setError(null);

        if (!isInitialized) {
          setIsInitialized(true);
        }

        if (isInitialLoad) {
          setIsInitialLoad(false);
        }

        setLastRefreshed(new Date());
      } catch (err) {
        console.error("Error fetching grouped processes:", err);
        if (isInitialLoad) {
          setError("Failed to load processes. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    },
    [isInitialized, isInitialLoad]
  );

  const toggleAutoRefresh = useCallback(() => {
    setIsAutoRefreshEnabled((prev) => !prev);
  }, []);

  useEffect(() => {
    let intervalId: number | undefined;

    if (isAutoRefreshEnabled) {
      intervalId = window.setInterval(() => {
        fetchProcesses(true);
      }, refreshInterval);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isAutoRefreshEnabled, refreshInterval, fetchProcesses]);

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
