export interface SimulationResult {
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
