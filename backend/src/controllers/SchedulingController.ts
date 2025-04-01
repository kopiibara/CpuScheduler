import { Request, Response } from "express";
import { SchedulingService } from "../services/SchedulingService";
import { Process } from "../types/scheduling";

export class SchedulingController {
  private schedulingService = new SchedulingService();

  public simulate = async (req: Request, res: Response) => {
    try {
      const { processes, algorithm, timeQuantum } = req.body;

      if (!processes || !Array.isArray(processes)) {
        return res.status(400).json({ error: "Invalid processes data" });
      }

      if (!algorithm) {
        return res.status(400).json({ error: "Algorithm not specified" });
      }

      let result;
      switch (algorithm.toLowerCase()) {
        case "fcfs":
          result = this.schedulingService.fcfs(processes);
          break;
        case "sjf":
          result = this.schedulingService.sjf(processes);
          break;
        case "priority":
          result = this.schedulingService.priority(processes);
          break;
        case "rr":
          if (!timeQuantum) {
            return res
              .status(400)
              .json({ error: "Time quantum not specified for Round Robin" });
          }
          result = this.schedulingService.roundRobin(processes, timeQuantum);
          break;
        default:
          return res.status(400).json({ error: "Invalid algorithm specified" });
      }

      return res.json(result);
    } catch (error) {
      console.error("Scheduling simulation error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  };
}
