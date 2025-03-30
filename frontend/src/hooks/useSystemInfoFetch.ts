import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSystemInfo } from "../context/SystemInfoContext";

/**
 * Custom hook for fetching system information with a minimum loading time
 * @param minimumLoadingTime - Minimum time in ms to show the loading screen
 */
export const useSystemInfoFetch = (minimumLoadingTime = 3000) => {
  const navigate = useNavigate();
  const { setSystemInfo, setLoading, setError } = useSystemInfo();
  const [fetchProgress, setFetchProgress] = useState(0);
  const [dataFetched, setDataFetched] = useState(false);
  const [fetchStartTime, setFetchStartTime] = useState(0);

  const fetchSystemInfo = useCallback(async () => {
    let progressInterval: string | number | NodeJS.Timeout | undefined;
    let errorInterval: string | number | NodeJS.Timeout | undefined;

    try {
      setLoading(true);
      // Record when we start fetching
      const startTime = Date.now();
      setFetchStartTime(startTime);

      const apiUrl = `${import.meta.env.VITE_BACKEND_URL}/system-info`;
      console.log("Fetching from:", apiUrl);

      // Start progress animation - but don't go beyond 80% until data is fetched
      progressInterval = setInterval(() => {
        setFetchProgress((prev) => {
          // If data is fetched, we'll handle progress differently
          if (dataFetched) {
            const timeElapsed = Date.now() - startTime;
            const progressPercentage = Math.min(
              100,
              (timeElapsed / minimumLoadingTime) * 100
            );
            return progressPercentage;
          }

          // Otherwise, slowly increase but cap at 80%
          const newProgress = prev + Math.random() * 3;
          return newProgress >= 80 ? 80 : newProgress;
        });
      }, 100);

      const response = await fetch(apiUrl);
      console.log("Response status:", response.status);

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Received data:", data);
      setSystemInfo(data);
      setError(null);
      setDataFetched(true);

      // Calculate time elapsed since fetch started
      const timeElapsed = Date.now() - startTime;

      // If fetch was too quick, wait longer
      const additionalWaitTime = Math.max(0, minimumLoadingTime - timeElapsed);

      // Wait for the minimum time to pass before completing progress
      setTimeout(() => {
        setFetchProgress(100);
        if (progressInterval) clearInterval(progressInterval);

        // Navigate shortly after showing 100%
        setTimeout(() => {
          navigate("/pages/dashboard");
        }, 500);
      }, additionalWaitTime);
    } catch (err) {
      console.error("Error fetching system info:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(
        `Failed to fetch system information: ${errorMessage}. Please check if the backend server is running.`
      );

      // Calculate time elapsed since fetch started
      const timeElapsed = Date.now() - fetchStartTime;
      const additionalWaitTime = Math.max(0, minimumLoadingTime - timeElapsed);

      // Handle error progress - slowly fill to 100% over the remaining minimum time
      if (progressInterval) clearInterval(progressInterval);

      errorInterval = setInterval(() => {
        setFetchProgress((prev) => {
          const timeNow = Date.now();
          const totalElapsed = timeNow - fetchStartTime;
          if (totalElapsed >= minimumLoadingTime) {
            clearInterval(errorInterval);
            return 100;
          }

          // Calculate progress based on time elapsed
          const errorProgress = 50 + (totalElapsed / minimumLoadingTime) * 20;
          return Math.min(errorProgress, 100);
        });
      }, 100);

      // Navigate to dashboard after minimum time, even with error
      setTimeout(() => {
        if (errorInterval) clearInterval(errorInterval);
        navigate("/pages/dashboard");
      }, additionalWaitTime + 1500);
    } finally {
      setLoading(false);
    }
  }, [
    navigate,
    setSystemInfo,
    setLoading,
    setError,
    dataFetched,
    minimumLoadingTime,
    fetchStartTime,
  ]);

  // Return values and functions to be used in the component
  return {
    fetchProgress,
    fetchSystemInfo,
    dataFetched,
  };
};
