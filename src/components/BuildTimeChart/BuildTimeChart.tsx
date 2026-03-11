/** @jsxImportSource @b9g/crank */
import type { Context } from "@b9g/crank";
import { type WorkflowRun } from "../../services/github";
import { ChartGPUChart } from "./ChartGPUChart";

interface BuildTimeChartProps {
  runs: WorkflowRun[];
}

// Store chart instances to update them when data changes
const chartGPUInstances = new Map<string, ChartGPUChart>();

export function* BuildTimeChart(this: Context, { runs }: BuildTimeChartProps) {
  // Generate unique ID for this chart instance (only once, outside the loop)
  let chartId: string | undefined;
  let chartGPU: ChartGPUChart | undefined;
  let filterOutliers = false;
  let showTrendline = true;

  const toggleOutliers = async () => {
    filterOutliers = !filterOutliers;
    if (chartGPU) {
      await chartGPU.setFilterOutliers(filterOutliers);
    }
    this.refresh();
  };

  const toggleTrendline = async () => {
    showTrendline = !showTrendline;
    if (chartGPU) {
      await chartGPU.setShowTrendline(showTrendline);
    }
    this.refresh();
  };

  // Update data when runs change
  for ({ runs } of this) {
    // Initialize chart ID on first render
    if (!chartId) {
      chartId = `build-time-chart-${Date.now()}`;
    }

    // Mount the chart after first render
    if (!chartGPU) {
      this.after((element) => {
        const chartElement = element.querySelector(
          `#${chartId}`,
        ) as HTMLElement;
        if (chartElement) {
          chartGPU = new ChartGPUChart(chartElement);
          chartGPUInstances.set(chartId!, chartGPU);

          // Initial render with data
          const successfulBuilds = runs.filter(
            (run) => run.conclusion === "success",
          );
          chartGPU.updateData(successfulBuilds);
        }
      });
    } else {
      // Update existing chart with new data
      const successfulBuilds = runs.filter(
        (run) => run.conclusion === "success",
      );
      chartGPU.updateData(successfulBuilds);
    }

    const currentSuccessful = runs.filter(
      (run) => run.conclusion === "success",
    );
    const runsWithPRs = runs.filter(
      (run) => run.pull_requests && run.pull_requests.length > 0,
    );

    if (currentSuccessful.length === 0) {
      yield (
        <div class="w-full">
          <div class="mb-4">
            <h3 class="text-xl font-semibold text-slate-200 mb-2">
              Build Time Trend for Successful Builds
            </h3>
            <p class="text-slate-300">
              No successful builds found in recent history
            </p>
            <div class="text-sm text-slate-300 mt-2 bg-slate-800/80 p-3 rounded border border-slate-600">
              <p>
                <strong>Summary:</strong>
              </p>
              <p>• Total workflow runs: {runs.length}</p>
              <p>• Successful runs: {currentSuccessful.length}</p>
              <p>• Runs with PRs: {runsWithPRs.length}</p>
            </div>
          </div>
        </div>
      );
      continue;
    }

    // Render the component (static - never re-renders the chart)
    yield (
      <div class="w-full">
        <div class="mb-4">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="text-xl font-semibold text-slate-200 mb-2">
                Build Time Trend for Successful Builds
              </h3>
              <p class="text-slate-300">
                Showing {currentSuccessful.length} successful builds over time
              </p>
              <div class="text-sm text-slate-300 mt-2">
                <p>
                  • Total workflow runs: {runs.length} • Successful builds:{" "}
                  {currentSuccessful.length} • PR builds: {runsWithPRs.length}
                </p>
              </div>
            </div>
            <div class="flex gap-2">
              <button
                onclick={toggleTrendline}
                class={`px-3 py-1.5 text-sm rounded border transition-colors ${
                  showTrendline
                    ? "bg-amber-500/20 border-amber-500 text-amber-200"
                    : "bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {showTrendline ? "✓ " : ""}Trendline
              </button>
              <button
                onclick={toggleOutliers}
                class={`px-3 py-1.5 text-sm rounded border transition-colors ${
                  filterOutliers
                    ? "bg-blue-500/20 border-blue-500 text-blue-200"
                    : "bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {filterOutliers ? "✓ " : ""}Filter Outliers
              </button>
            </div>
          </div>
        </div>
        <div
          id={chartId}
          class="w-full h-96 min-h-64 border border-slate-600 rounded-lg bg-black overflow-hidden"
        ></div>
      </div>
    );
  }

  // Cleanup
  this.cleanup = () => {
    if (chartGPU && chartId) {
      chartGPU.destroy();
      chartGPUInstances.delete(chartId);
    }
    return Promise.resolve();
  };
}
