import { createContext, useState, ReactNode, useContext } from "react";
import { SystemInfo } from "../types/SystemInfoObject";

interface SystemInfoContextType {
  systemInfo: SystemInfo | null;
  setSystemInfo: (info: SystemInfo) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

const SystemInfoContext = createContext<SystemInfoContextType | undefined>(
  undefined
);

export const SystemInfoProvider = ({ children }: { children: ReactNode }) => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  return (
    <SystemInfoContext.Provider
      value={{
        systemInfo,
        setSystemInfo,
        loading,
        setLoading,
        error,
        setError,
      }}
    >
      {children}
    </SystemInfoContext.Provider>
  );
};

export const useSystemInfo = () => {
  const context = useContext(SystemInfoContext);
  if (context === undefined) {
    throw new Error("useSystemInfo must be used within a SystemInfoProvider");
  }
  return context;
};
