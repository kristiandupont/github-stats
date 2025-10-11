/** @jsxImportSource @b9g/crank */
import * as d3 from "d3";
import type { Context } from "@b9g/crank";
import {
  type WorkflowRun,
  calculateDurationInSeconds,
} from "../services/github";

interface BuildTimeChartProps {
  runs: WorkflowRun[];
  isLoading?: boolean;
}

interface ChartDataPoint {
  date: Date;
  duration: number;
  prNumber: number | null;
  prTitle?: string | null;
  runId: number;
}

export function* BuildTimeChart(
  this: Context,
  { runs, isLoading }: BuildTimeChartProps
) {
  if (isLoading) {
    yield (
      <div class="flex justify-center items-center py-8">
        <div class="text-lg text-gray-600">Loading chart...</div>
      </div>
    );
    return;
  }

  // Filter for all successful runs
  const successfulBuilds = runs.filter((run) => run.conclusion === "success");

  // Get some stats for better messaging
  const runsWithPRs = runs.filter((run) => run.pull_requests.length > 0);
  const prWorkflowRuns = runs.filter((run) => run.name === "Pull Requests");

  if (successfulBuilds.length === 0) {
    yield (
      <div class="w-full">
        <div class="mb-4">
          <h3 class="text-xl font-semibold text-gray-800 mb-2">
            Build Time Trend for Successful Builds
          </h3>
          <p class="text-gray-600">
            No successful builds found in recent history
          </p>
          <div class="text-sm text-gray-500 mt-2 bg-gray-50 p-3 rounded">
            <p>
              <strong>Summary:</strong>
            </p>
            <p>• Total workflow runs: {runs.length}</p>
            <p>• Successful runs: {successfulBuilds.length}</p>
            <p>• PR workflow runs: {prWorkflowRuns.length}</p>
            <p>• Runs with PRs: {runsWithPRs.length}</p>
            <p class="mt-2 text-gray-600">
              <em>
                Note: All successful workflow runs are shown in the chart.
              </em>
            </p>
          </div>
        </div>
      </div>
    );
    return;
  }

  // Transform data for the chart
  const chartData: ChartDataPoint[] = successfulBuilds.map((run) => ({
    date: new Date(run.created_at),
    duration: calculateDurationInSeconds(run.created_at, run.updated_at),
    prNumber: run.pull_requests.length > 0 ? run.pull_requests[0].number : null,
    prTitle: run.pull_requests.length > 0 ? run.pull_requests[0].title : null,
    runId: run.id,
  }));

  // Sort by date
  chartData.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Generate unique ID for this chart instance
  const chartId = `build-time-chart-${Date.now()}`;

  // Use Crank's after() lifecycle method to render D3 chart after DOM is ready
  this.after((element) => {
    const chartElement = element.querySelector(`#${chartId}`);
    if (chartElement) {
      const cleanup = renderBuildTimeChart(chartData, chartId);
      // Store cleanup function for when component unmounts
      if (cleanup) {
        this.cleanup = () => {
          cleanup();
          return Promise.resolve();
        };
      }
    }
  });

  // Render the component
  yield (
    <div class="w-full">
      <div class="mb-4">
        <h3 class="text-xl font-semibold text-gray-800 mb-2">
          Build Time Trend for Successful Builds
        </h3>
        <p class="text-gray-600">
          Showing {chartData.length} successful builds over time
        </p>
        <div class="text-sm text-gray-500 mt-2">
          <p>
            • Total workflow runs: {runs.length} • Successful builds:{" "}
            {chartData.length} • PR builds:{" "}
            {chartData.filter((d) => d.prNumber).length}
          </p>
        </div>
      </div>
      <div
        id={chartId}
        class="w-full h-96 min-h-64 border border-gray-200 rounded-lg bg-white overflow-hidden"
      ></div>
    </div>
  );
}

// Function to render the D3 chart
export function renderBuildTimeChart(data: ChartDataPoint[], chartId: string) {
  // Clear any existing chart
  d3.select(`#${chartId}`).selectAll("*").remove();

  if (data.length === 0) return;

  const container = d3.select(`#${chartId}`);
  const margin = { top: 20, right: 30, bottom: 40, left: 60 };

  // Function to get current container dimensions
  const getDimensions = () => {
    const containerNode = container.node() as HTMLElement;
    const containerRect = containerNode?.getBoundingClientRect();
    const fullWidth = containerRect?.width || 800;
    const fullHeight = containerRect?.height || 400;
    const width = fullWidth - margin.left - margin.right;
    const height = fullHeight - margin.top - margin.bottom;
    return { width, height, fullWidth, fullHeight };
  };

  // Function to create/update the chart
  const updateChart = () => {
    const { width, height, fullWidth, fullHeight } = getDimensions();

    // Remove existing SVG if it exists
    container.selectAll("svg").remove();

    const svg = container
      .append("svg")
      .attr("width", fullWidth)
      .attr("height", fullHeight);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(data, (d) => d.date) as [Date, Date])
      .range([0, width]);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.duration) || 0])
      .range([height, 0]);

    // Line generator
    const line = d3
      .line<ChartDataPoint>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.duration))
      .curve(d3.curveMonotoneX);

    // Add the line
    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Add dots for each data point
    const dots = g
      .selectAll(".dot")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", (d) => xScale(d.date))
      .attr("cy", (d) => yScale(d.duration))
      .attr("r", 4)
      .attr("fill", "#3b82f6")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2);

    // Add tooltips
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background", "rgba(0, 0, 0, 0.8)")
      .style("color", "white")
      .style("padding", "8px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("opacity", 0);

    dots
      .on("mouseover", function (event, d) {
        tooltip.transition().duration(200).style("opacity", 0.9);
        const prInfo = d.prNumber ? `PR #${d.prNumber}` : "Non-PR Build";
        const prTitle = d.prTitle ? `<br/>Title: ${d.prTitle}` : "";
        tooltip
          .html(
            `<strong>${prInfo}</strong><br/>
             Duration: ${d.duration} seconds<br/>
             Date: ${d.date.toLocaleDateString()}${prTitle}`
          )
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px");
      })
      .on("mouseout", function () {
        tooltip.transition().duration(500).style("opacity", 0);
      });

    // Add X axis
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(
        d3
          .axisBottom(xScale)
          .tickFormat((d) => d3.timeFormat("%m/%d")(d as Date))
      );

    // Add Y axis
    g.append("g").call(d3.axisLeft(yScale));

    // Add axis labels
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - height / 2)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", "#666")
      .text("Build Time (seconds)");

    g.append("text")
      .attr(
        "transform",
        `translate(${width / 2}, ${height + margin.bottom - 5})`
      )
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", "#666")
      .text("Date");
  };

  // Initial render
  updateChart();

  // Set up ResizeObserver to handle container size changes
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.target.id === chartId) {
        updateChart();
      }
    }
  });

  // Start observing the container
  const containerElement = container.node() as HTMLElement;
  if (containerElement) {
    resizeObserver.observe(containerElement);
  }

  // Cleanup function to disconnect observer when component unmounts
  // This will be called by Crank when the component is removed
  return () => {
    resizeObserver.disconnect();
  };
}
