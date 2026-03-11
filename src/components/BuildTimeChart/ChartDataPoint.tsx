export interface ChartDataPoint {
  date: Date;
  duration: number;
  name: string;
  prNumber: number | null;
  prTitle?: string | null;
  runId: number;
}
