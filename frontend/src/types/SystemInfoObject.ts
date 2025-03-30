export interface SystemInfo {
  manufacturer: string;
  cores: number;
  threads: number;
  frequency: number | string;
  ram: string;
  os: string;
  schedulingPolicy: string;
}
