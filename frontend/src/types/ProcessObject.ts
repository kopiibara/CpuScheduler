export interface Process {
  pid: number;
  name: string;
  status?: string;
  cpu_affinity?: number[];
  priority?: number;
  // Add this new property
  _originalPriority?: number;
  exe: string | null;
  description: string | null;
  icon: string | null;
  importance_score: number;
  cpu_percent: number;
  memory_percent: number;
}

export interface GroupedProcesses {
  [appName: string]: Process[];
}
