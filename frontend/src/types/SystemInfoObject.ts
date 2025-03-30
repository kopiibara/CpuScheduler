export interface SystemInfo {
  manufacturer: string;
  cores: number;
  architecture: string;
  threads: number;
  frequency: number | string;
  ram: string;
  os: string;
  schedulingPolicy: string;
}
