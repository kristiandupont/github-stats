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
        <div class="text-lg text-slate-300">Loading chart...</div>
      </div>
    );
    return;
  }

  // Filter for all successful runs
  const successfulBuilds = runs.filter((run) => run.conclusion === "success");

  // Get some stats for better messaging
  const runsWithPRs = runs.filter(
    (run) => run.pull_requests && run.pull_requests.length > 0
  );
  const prWorkflowRuns = runs.filter((run) => run.name === "Pull Requests");

  if (successfulBuilds.length === 0) {
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
            <p>• Successful runs: {successfulBuilds.length}</p>
            <p>• PR workflow runs: {prWorkflowRuns.length}</p>
            <p>• Runs with PRs: {runsWithPRs.length}</p>
            <p class="mt-2 text-slate-300">
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
        <h3 class="text-xl font-semibold text-slate-200 mb-2">
          Build Time Trend for Successful Builds
        </h3>
        <p class="text-slate-300">
          Showing {chartData.length} successful builds over time
        </p>
        <div class="text-sm text-slate-300 mt-2">
          <p>
            • Total workflow runs: {runs.length} • Successful builds:{" "}
            {chartData.length} • PR builds:{" "}
            {chartData.filter((d) => d.prNumber).length}
          </p>
        </div>
      </div>
      <div
        id={chartId}
        class="w-full h-96 min-h-64 border border-slate-600 rounded-lg bg-black overflow-hidden"
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

  // Bright colors for dark background
  const colors = {
    line: "#38bdf8",
    dotStroke: "#0f172a",
    axis: "#94a3b8",
    label: "#e2e8f0",
  };

  // Function to create/update the chart
  const updateChart = () => {
    const { width, height, fullWidth, fullHeight } = getDimensions();

    // Remove existing SVG and any previous tooltip for this chart
    container.selectAll("svg").remove();
    d3.selectAll(".build-time-chart-tooltip").remove();

    const svg = container
      .append("svg")
      .attr("width", fullWidth)
      .attr("height", fullHeight);

    // Clip path so the line and dots don't bleed into margins/axes
    svg
      .append("defs")
      .append("clipPath")
      .attr("id", `clip-${chartId}`)
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", width)
      .attr("height", height);

    const marginG = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Invisible rect so the whole chart area receives pointer/wheel events
    marginG
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "transparent")
      .style("cursor", "grab")
      .style("pointer-events", "all");

    // Chart content (no geometric transform; we redraw x-dependent parts on zoom)
    const contentG = marginG.append("g");

    // Plot area: path and dots, clipped to the data rectangle
    const plotAreaG = contentG
      .append("g")
      .attr("clip-path", `url(#clip-${chartId})`);

    // Base scales: full data domain. Zoom only changes the x (time) view.
    const baseXScale = d3
      .scaleTime()
      .domain(d3.extent(data, (d) => d.date) as [Date, Date])
      .range([0, width]);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.duration) || 0])
      .range([height, 0]);

    const lineGen = (xScale: d3.ScaleTime<number, number>) =>
      d3
        .line<ChartDataPoint>()
        .x((d) => xScale(d.date))
        .y((d) => yScale(d.duration))
        .curve(d3.curveMonotoneX);

    const xAxisGen = (xScale: d3.ScaleTime<number, number>) =>
      d3
        .axisBottom(xScale)
        .tickFormat((d) => d3.timeFormat("%m/%d")(d as Date))
        .tickSizeOuter(0);

    const yAxis = d3.axisLeft(yScale).tickSizeOuter(0);

    // Update path, dots, and x-axis for the current x scale (called on init and on zoom)
    const updateZoomedView = (viewXScale: d3.ScaleTime<number, number>) => {
      path.attr("d", lineGen(viewXScale)(data) ?? "");
      dots.attr("cx", (d) => viewXScale(d.date));
      xAxisG.call(xAxisGen(viewXScale));
      xAxisG.attr("color", colors.axis).selectAll("text").style("fill", colors.axis);
      xAxisG.selectAll(".domain").attr("stroke", colors.axis);
      xAxisG.selectAll(".tick line").attr("stroke", colors.axis);
      xAxisG.selectAll(".tick text").style("fill", colors.axis);
    };

    const path = plotAreaG
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", colors.line)
      .attr("stroke-width", 2);

    const dots = plotAreaG
      .selectAll(".dot")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cy", (d) => yScale(d.duration))
      .attr("r", 4)
      .attr("fill", colors.line)
      .attr("stroke", colors.dotStroke)
      .attr("stroke-width", 2);

    // Tooltip
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "build-time-chart-tooltip")
      .style("position", "absolute")
      .style("background", "rgba(15, 23, 42, 0.95)")
      .style("color", "#e2e8f0")
      .style("padding", "8px 12px")
      .style("border-radius", "6px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("border", "1px solid #475569");

    dots
      .on("mouseover", function (event, d) {
        tooltip.transition().duration(200).style("opacity", 0.95);
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

    const xAxisG = contentG
      .append("g")
      .attr("transform", `translate(0,${height})`);

    const yAxisG = contentG.append("g").call(yAxis).attr("color", colors.axis);
    yAxisG.selectAll(".domain").attr("stroke", colors.axis);
    yAxisG.selectAll(".tick line").attr("stroke", colors.axis);
    yAxisG.selectAll(".tick text").style("fill", colors.axis);

    contentG
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - height / 2)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", colors.label)
      .text("Build Time (seconds)");

    contentG
      .append("text")
      .attr(
        "transform",
        `translate(${width / 2}, ${height + margin.bottom - 5})`
      )
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", colors.label)
      .text("Date");

    updateZoomedView(baseXScale);

    // Semantic zoom: only the x (time) scale changes; y-axis and layout stay fixed
    const zoomBehavior = d3
      .zoom<SVGGElement, unknown>()
      .scaleExtent([0.5, 20])
      .on("zoom", (event) => {
        const viewXScale = event.transform.rescaleX(baseXScale);
        updateZoomedView(viewXScale);
      });

    marginG.call(zoomBehavior);
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

  // Cleanup function when component unmounts
  return () => {
    resizeObserver.disconnect();
    d3.selectAll(".build-time-chart-tooltip").remove();
  };
}
