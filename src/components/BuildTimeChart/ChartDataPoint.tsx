export interface ChartDataPoint {
  date: Date;
  duration: number;
  prNumber: number | null;
  prTitle?: string | null;
  runId: number;
}
