import { Process, ProcessResult, SchedulingResult } from "../types/scheduling";
import { SystemInfoService } from "./SystemInfoService";

export class SchedulingService {
  private systemInfo = SystemInfoService.getSystemInfo();
  private cores = this.systemInfo.cores;

  private calculateAverageMetrics(
    results: ProcessResult[]
  ): SchedulingResult["averageMetrics"] {
    const totalProcesses = results.length;
    const totalWaitingTime = results.reduce((sum, p) => sum + p.waitingTime, 0);
    const totalResponseTime = results.reduce(
      (sum, p) => sum + p.responseTime,
      0
    );
    const totalTurnaroundTime = results.reduce(
      (sum, p) => sum + p.turnaroundTime,
      0
    );
    const maxCompletionTime = Math.max(...results.map((p) => p.completionTime));

    return {
      waitingTime: totalWaitingTime / totalProcesses,
      responseTime: totalResponseTime / totalProcesses,
      turnaroundTime: totalTurnaroundTime / totalProcesses,
      throughput: totalProcesses / maxCompletionTime,
      cpuUtilization:
        (totalTurnaroundTime / (this.cores * maxCompletionTime)) * 100,
    };
  }

  private createTimeline(
    results: ProcessResult[]
  ): SchedulingResult["timeline"] {
    const timeline: SchedulingResult["timeline"] = {};

    for (let i = 0; i < this.cores; i++) {
      timeline[i] = { processes: [] };
    }

    results.forEach((process) => {
      timeline[process.cpuCore].processes.push({
        id: process.id,
        startTime: process.startTime,
        endTime: process.endTime,
      });
    });

    return timeline;
  }

  private formatResult(
    algorithm: string,
    processResults: ProcessResult[]
  ): SchedulingResult {
    return {
      algorithm,
      systemInfo: {
        cores: this.systemInfo.cores,
        cpuModel: this.systemInfo.cpuModel,
        architecture: this.systemInfo.architecture,
      },
      averageMetrics: this.calculateAverageMetrics(processResults),
      processResults,
      timeline: this.createTimeline(processResults),
    };
  }

  public fcfs(processes: Process[]): SchedulingResult {
    const sortedProcesses = [...processes].sort(
      (a, b) => a.arrivalTime - b.arrivalTime
    );
    const results: ProcessResult[] = [];
    const coreTimes = new Array(this.cores).fill(0); // Track time for each core

    sortedProcesses.forEach((process) => {
      // Find the core with minimum current time
      const minCoreIndex = coreTimes.indexOf(Math.min(...coreTimes));
      const startTime = Math.max(coreTimes[minCoreIndex], process.arrivalTime);
      const endTime = startTime + process.burstTime;

      results.push({
        id: process.id,
        waitingTime: startTime - process.arrivalTime,
        responseTime: startTime - process.arrivalTime,
        completionTime: endTime,
        turnaroundTime: endTime - process.arrivalTime,
        cpuCore: minCoreIndex,
        startTime,
        endTime,
      });

      coreTimes[minCoreIndex] = endTime;
    });

    return this.formatResult("FCFS", results);
  }

  public sjf(processes: Process[]): SchedulingResult {
    const results: ProcessResult[] = [];
    const coreTimes = new Array(this.cores).fill(0);
    let remainingProcesses = [...processes];
    let currentTime = Math.min(...processes.map((p) => p.arrivalTime));

    while (remainingProcesses.length > 0) {
      const availableProcesses = remainingProcesses.filter(
        (p) => p.arrivalTime <= currentTime
      );

      if (availableProcesses.length === 0) {
        currentTime = Math.min(...remainingProcesses.map((p) => p.arrivalTime));
        continue;
      }

      // Find shortest job among available processes
      const shortestJob = availableProcesses.reduce((min, p) =>
        p.burstTime < min.burstTime ? p : min
      );

      // Find core with minimum current time
      const minCoreIndex = coreTimes.indexOf(Math.min(...coreTimes));
      const startTime = Math.max(coreTimes[minCoreIndex], currentTime);
      const endTime = startTime + shortestJob.burstTime;

      results.push({
        id: shortestJob.id,
        waitingTime: startTime - shortestJob.arrivalTime,
        responseTime: startTime - shortestJob.arrivalTime,
        completionTime: endTime,
        turnaroundTime: endTime - shortestJob.arrivalTime,
        cpuCore: minCoreIndex,
        startTime,
        endTime,
      });

      coreTimes[minCoreIndex] = endTime;
      currentTime = Math.min(...coreTimes);
      remainingProcesses = remainingProcesses.filter(
        (p) => p.id !== shortestJob.id
      );
    }

    return this.formatResult("SJF", results);
  }

  public priority(processes: Process[]): SchedulingResult {
    const results: ProcessResult[] = [];
    const coreTimes = new Array(this.cores).fill(0);
    let remainingProcesses = [...processes];
    let currentTime = Math.min(...processes.map((p) => p.arrivalTime));

    while (remainingProcesses.length > 0) {
      const availableProcesses = remainingProcesses.filter(
        (p) => p.arrivalTime <= currentTime
      );

      if (availableProcesses.length === 0) {
        currentTime = Math.min(...remainingProcesses.map((p) => p.arrivalTime));
        continue;
      }

      // Find highest priority process (lower number = higher priority)
      const highestPriority = availableProcesses.reduce((min, p) =>
        p.priority < min.priority ? p : min
      );

      // Find core with minimum current time
      const minCoreIndex = coreTimes.indexOf(Math.min(...coreTimes));
      const startTime = Math.max(coreTimes[minCoreIndex], currentTime);
      const endTime = startTime + highestPriority.burstTime;

      results.push({
        id: highestPriority.id,
        waitingTime: startTime - highestPriority.arrivalTime,
        responseTime: startTime - highestPriority.arrivalTime,
        completionTime: endTime,
        turnaroundTime: endTime - highestPriority.arrivalTime,
        cpuCore: minCoreIndex,
        startTime,
        endTime,
      });

      coreTimes[minCoreIndex] = endTime;
      currentTime = Math.min(...coreTimes);
      remainingProcesses = remainingProcesses.filter(
        (p) => p.id !== highestPriority.id
      );
    }

    return this.formatResult("Priority", results);
  }

  public roundRobin(
    processes: Process[],
    timeQuantum: number = 2
  ): SchedulingResult {
    const results: ProcessResult[] = [];
    const coreTimes = new Array(this.cores).fill(0);
    let remainingProcesses = processes.map((p) => ({
      ...p,
      remainingTime: p.burstTime,
      firstResponse: -1,
    }));
    let currentTime = Math.min(...processes.map((p) => p.arrivalTime));
    const processStartTimes = new Map<number, number>();

    while (remainingProcesses.length > 0) {
      const availableProcesses = remainingProcesses.filter(
        (p) => p.arrivalTime <= currentTime
      );

      if (availableProcesses.length === 0) {
        currentTime = Math.min(...remainingProcesses.map((p) => p.arrivalTime));
        continue;
      }

      // Process each available process for the time quantum
      for (const process of availableProcesses) {
        const minCoreIndex = coreTimes.indexOf(Math.min(...coreTimes));
        const startTime = Math.max(coreTimes[minCoreIndex], currentTime);
        const executionTime = Math.min(timeQuantum, process.remainingTime);
        const endTime = startTime + executionTime;

        // Track first response time
        if (process.firstResponse === -1) {
          process.firstResponse = startTime;
        }

        // If process is completing
        if (process.remainingTime <= timeQuantum) {
          results.push({
            id: process.id,
            waitingTime:
              startTime -
              process.arrivalTime -
              (process.burstTime - process.remainingTime),
            responseTime: process.firstResponse - process.arrivalTime,
            completionTime: endTime,
            turnaroundTime: endTime - process.arrivalTime,
            cpuCore: minCoreIndex,
            startTime,
            endTime,
          });
        }

        coreTimes[minCoreIndex] = endTime;
        process.remainingTime -= executionTime;
      }

      currentTime = Math.min(...coreTimes);
      remainingProcesses = remainingProcesses.filter(
        (p) => p.remainingTime > 0
      );
    }

    return this.formatResult("Round Robin", results);
  }
}
