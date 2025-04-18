export interface SystemInfo {
  manufacturer: string;
  cpu_architecture: string;
  cores: number;
  architecture: string;
  threads: number;
  frequency: number | string;
  ram: string;
  os: string;
  schedulingPolicy: string;
}
