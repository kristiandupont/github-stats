import { ChartGPU } from "chartgpu";
import type { ChartGPUInstance } from "chartgpu";
import type { WorkflowRun } from "../../services/github";
import { calculateDurationInSeconds } from "../../services/calculateDurationInSeconds";
import type { ChartDataPoint } from "./ChartDataPoint";

// ChartGPU Chart Class - owns all chart state and rendering
export class ChartGPUChart {
  private container: HTMLElement;
  private chart: ChartGPUInstance | null = null;
  private data: ChartDataPoint[] = [];
  private filterOutliers = false;
  private showTrendline = true;

  constructor(containerElement: HTMLElement) {
    this.container = containerElement;
  }

  private calculateOutlierThreshold(durations: number[]): number {
    if (durations.length === 0) return Infinity;

    // Use IQR method to detect outliers
    const sorted = [...durations].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;

    // Outliers are values > Q3 + 1.5 * IQR
    return q3 + 1.5 * iqr;
  }

  private calculateTrendline(data: [number, number][]): [number, number][] {
    if (data.length < 2) return [];

    // Linear regression: y = mx + b
    const n = data.length;
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumXX = 0;

    for (const [x, y] of data) {
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    }

    const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const b = (sumY - m * sumX) / n;

    // Return trendline points at the start and end
    const firstX = data[0][0];
    const lastX = data[data.length - 1][0];

    return [
      [firstX, m * firstX + b],
      [lastX, m * lastX + b],
    ];
  }

  private async render() {
    if (this.data.length === 0) return;

    // Calculate outlier threshold
    const durations = this.data.map((d) => d.duration);
    const outlierThreshold = this.calculateOutlierThreshold(durations);

    // Filter data if outliers should be removed
    let filteredData = this.data;
    let outlierData: ChartDataPoint[] = [];

    if (this.filterOutliers) {
      filteredData = this.data.filter((d) => d.duration <= outlierThreshold);
      outlierData = this.data.filter((d) => d.duration > outlierThreshold);
    }

    // Transform data to ChartGPU format: [x, y] pairs
    const chartData: [number, number][] = filteredData.map((d) => [
      d.date.getTime(),
      d.duration,
    ]);

    const outlierChartData: [number, number][] = outlierData.map((d) => [
      d.date.getTime(),
      d.duration,
    ]);

    // Calculate trendline
    const trendlineData = this.showTrendline
      ? this.calculateTrendline(chartData)
      : [];

    // Custom formatter for Y axis
    const formatDuration = (value: number) => {
      if (value < 60) return `${Math.round(value)}s`;
      if (value < 3600) return `${Math.round(value / 60)}m`;
      return `${(value / 3600).toFixed(1)}h`;
    };

    // Build series array
    const series: any[] = [
      {
        type: "line",
        name: "Build Time",
        data: chartData,
        lineStyle: {
          color: "#38bdf8",
          width: 2,
        },
      },
      {
        type: "scatter",
        name: "Builds",
        data: chartData,
        symbolSize: 4,
        symbol: "circle",
      },
    ];

    // // Add outliers as separate series if filtering
    // if (this.filterOutliers && outlierChartData.length > 0) {
    //   series.push({
    //     type: "scatter",
    //     name: "Outliers",
    //     data: outlierChartData,
    //     symbolSize: 4,
    //     symbol: "diamond",
    //   });
    // }

    // Add trendline if enabled
    if (this.showTrendline && trendlineData.length > 0) {
      series.push({
        type: "line",
        name: "Trend",
        data: trendlineData,
        lineStyle: {
          color: "#fbbf24",
          width: 2,
          opacity: 0.6,
        },
      });
    }

    // Create ChartGPU instance
    this.chart = await ChartGPU.create(this.container, {
      theme: "dark",
      series,
      xAxis: {
        type: "time",
      },
      yAxis: {
        type: "value",
        name: "Build Time",
        tickFormatter: formatDuration,
        autoBounds: "visible",
      },
      dataZoom: [
        {
          type: "inside",
          start: 0,
          end: 100,
        },
        {
          type: "slider",
          start: 0,
          end: 100,
        },
      ],
      tooltip: {
        show: true,
        trigger: "item",
        formatter: (params: any) => {
          const dataIndex = params.dataIndex;
          const seriesName = params.seriesName;

          // Handle trendline tooltip
          if (seriesName === "Trend") {
            return `<strong>Trendline</strong><br/>Duration: ${formatDuration(params.value[1])}`;
          }

          // Find the actual data point
          let d: ChartDataPoint | undefined;
          if (seriesName === "Outliers") {
            d = outlierData[dataIndex];
          } else {
            d = filteredData[dataIndex];
          }

          if (!d) return "";

          const name = d.name ? `<br/>${d.name}` : "";
          const prInfo = d.prNumber ? `PR #${d.prNumber}` : "Non-PR Build";
          const prTitle = d.prTitle ? `<br/>Title: ${d.prTitle}` : "";
          const outlierLabel =
            seriesName === "Outliers"
              ? '<br/><span style="color: #ef4444;">⚠ Outlier</span>'
              : "";
          return `<strong>${prInfo}</strong>${name}<br/>Duration: ${formatDuration(d.duration)}<br/>Date: ${d.date.toLocaleDateString()}${prTitle}${outlierLabel}`;
        },
      },
    });
  }

  public async updateData(runs: WorkflowRun[]) {
    // Transform runs to chart data
    const chartData: ChartDataPoint[] = runs.map((run) => ({
      date: new Date(run.created_at),
      duration: calculateDurationInSeconds(run.created_at, run.updated_at),
      name: run.name,
      prNumber:
        run.pull_requests && run.pull_requests.length > 0
          ? run.pull_requests[0].number
          : null,
      prTitle:
        run.pull_requests && run.pull_requests.length > 0
          ? (run.pull_requests[0] as any).title
          : null,
      runId: run.id,
    }));

    chartData.sort((a, b) => a.date.getTime() - b.date.getTime());
    this.data = chartData;

    if (this.chart) {
      // Re-render with new data
      this.chart.dispose();
      this.chart = null;
      await this.render();
    } else {
      // Initial render
      await this.render();
    }
  }

  public async setFilterOutliers(filter: boolean) {
    if (this.filterOutliers === filter) return;
    this.filterOutliers = filter;

    if (this.chart) {
      this.chart.dispose();
      this.chart = null;
      await this.render();
    }
  }

  public async setShowTrendline(show: boolean) {
    if (this.showTrendline === show) return;
    this.showTrendline = show;

    if (this.chart) {
      this.chart.dispose();
      this.chart = null;
      await this.render();
    }
  }

  public getFilterOutliers(): boolean {
    return this.filterOutliers;
  }

  public getShowTrendline(): boolean {
    return this.showTrendline;
  }

  public destroy() {
    if (this.chart) {
      this.chart.dispose();
      this.chart = null;
    }
  }
}
