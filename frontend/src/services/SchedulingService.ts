interface Process {
  id: number;
  arrival_time: number;
  burst_time: number;
  priority: number;
}

interface SimulationResult {
  algorithm: string;
  system_info: {
    cores: number;
    cpu_model: string;
    architecture: string;
  };
  average_metrics: {
    waiting_time: number;
    response_time: number;
    turnaround_time: number;
    throughput: number;
    cpu_utilization: number;
  };
  process_results: Array<{
    id: number;
    waiting_time: number;
    response_time: number;
    completion_time: number;
    turnaround_time: number;
    cpu_core: number;
    start_time: number;
    end_time: number;
  }>;
  timeline: {
    [key: string]: {
      processes: Array<{
        id: number;
        start_time: number;
        end_time: number;
      }>;
    };
  };
}

class SchedulingService {
  public async simulateScheduling(
    processes: Process[],
    algorithm: string,
    timeQuantum?: number,
    signal?: AbortSignal,
    preemptive?: boolean
  ): Promise<SimulationResult> {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/simulate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            processes,
            algorithm,
            timeQuantum,
            preemptive
          }),
          signal,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to simulate scheduling");
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw error;
      }
      console.error("Scheduling simulation error:", error);
      throw error;
    }
  }
}

export const schedulingService = new SchedulingService();
