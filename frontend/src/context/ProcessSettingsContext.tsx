import React, { createContext, useContext, useState, useEffect } from "react";

interface ProcessSettings {
  priority?: number;
  cpu_affinity?: number[];
}

interface ProcessSettingsContextType {
  getProcessSettings: (pid: number) => ProcessSettings;
  updateProcessSettings: (pid: number, settings: ProcessSettings) => void;
}

const ProcessSettingsContext = createContext<
  ProcessSettingsContextType | undefined
>(undefined);

export const ProcessSettingsProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [processSettings, setProcessSettings] = useState<
    Record<number, ProcessSettings>
  >({});

  // Load saved settings from localStorage on init
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem("processSettings");
      if (savedSettings) {
        setProcessSettings(JSON.parse(savedSettings));
      }
    } catch (err) {
      console.error("Failed to load process settings", err);
    }
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem("processSettings", JSON.stringify(processSettings));
    } catch (err) {
      console.error("Failed to save process settings", err);
    }
  }, [processSettings]);

  const getProcessSettings = (pid: number): ProcessSettings => {
    return processSettings[pid] || {};
  };

  const updateProcessSettings = (pid: number, settings: ProcessSettings) => {
    setProcessSettings((prev) => ({
      ...prev,
      [pid]: {
        ...(prev[pid] || {}),
        ...settings,
      },
    }));
  };

  return (
    <ProcessSettingsContext.Provider
      value={{ getProcessSettings, updateProcessSettings }}
    >
      {children}
    </ProcessSettingsContext.Provider>
  );
};

export const useProcessSettings = () => {
  const context = useContext(ProcessSettingsContext);
  if (!context) {
    throw new Error(
      "useProcessSettings must be used within a ProcessSettingsProvider"
    );
  }
  return context;
};
