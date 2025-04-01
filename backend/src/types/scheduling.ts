export interface Process {
  id: number;
  arrivalTime: number;
  burstTime: number;
  priority: number;
}

export interface ProcessResult {
  id: number;
  waitingTime: number;
  responseTime: number;
  completionTime: number;
  turnaroundTime: number;
  cpuCore: number;
  startTime: number;
  endTime: number;
}

export interface SchedulingResult {
  algorithm: string;
  systemInfo: {
    cores: number;
    cpuModel: string;
    architecture: string;
  };
  averageMetrics: {
    waitingTime: number;
    responseTime: number;
    turnaroundTime: number;
    throughput: number;
    cpuUtilization: number;
  };
  processResults: ProcessResult[];
  timeline: {
    [key: string]: {
      // key is CPU core number
      processes: Array<{
        id: number;
        startTime: number;
        endTime: number;
      }>;
    };
  };
}
