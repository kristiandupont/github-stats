import * as d3 from "d3";
import type { WorkflowRun } from "../../services/github";
import { calculateDurationInSeconds } from "../../services/calculateDurationInSeconds";
import type { ChartDataPoint } from "./ChartDataPoint";

// D3 Chart Class - owns all chart state and rendering
export class D3Chart {
  private container: d3.Selection<HTMLElement, unknown, null, undefined>;
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null =
    null;
  private data: ChartDataPoint[] = [];
  private margin = { top: 20, right: 30, bottom: 40, left: 60 };
  private width = 0;
  private height = 0;
  private baseXScale!: d3.ScaleTime<number, number>;
  private baseYScale!: d3.ScaleLinear<number, number>;
  private xZoomBehavior!: d3.ZoomBehavior<SVGGElement, unknown>;
  private yZoomBehavior!: d3.ZoomBehavior<SVGGElement, unknown>;
  private currentXTransform = d3.zoomIdentity;
  private currentYTransform = d3.zoomIdentity;
  private tooltip!: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>;
  private resizeObserver: ResizeObserver | null = null;

  // D3 selections that need to be updated
  private plotAreaG!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private path!: d3.Selection<
    SVGPathElement,
    ChartDataPoint[],
    null,
    undefined
  >;
  private xAxisG!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private yAxisG!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private marginG!: d3.Selection<SVGGElement, unknown, null, undefined>;

  constructor(containerElement: HTMLElement) {
    this.container = d3.select(containerElement);
    this.initTooltip();
  }

  private initTooltip() {
    // Create tooltip (reuse if exists)
    let existing = d3.select("body").select(".build-time-chart-tooltip");
    if (existing.empty()) {
      this.tooltip = d3
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
        .style("border", "1px solid #475569")
        .style("z-index", "1000");
    } else {
      this.tooltip = existing as any;
    }
  }

  private getDimensions() {
    const containerNode = this.container.node();
    const containerRect = containerNode?.getBoundingClientRect();
    const fullWidth = containerRect?.width || 800;
    const fullHeight = containerRect?.height || 400;
    this.width = fullWidth - this.margin.left - this.margin.right;
    this.height = fullHeight - this.margin.top - this.margin.bottom;
    return { fullWidth, fullHeight };
  }

  private render() {
    if (this.data.length === 0) return;

    const { fullWidth, fullHeight } = this.getDimensions();

    // Clear and create SVG
    this.container.selectAll("svg").remove();
    this.svg = this.container
      .append("svg")
      .attr("width", fullWidth)
      .attr("height", fullHeight);

    // Clip path
    this.svg
      .append("defs")
      .append("clipPath")
      .attr("id", `clip-${Date.now()}`)
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", this.width)
      .attr("height", this.height);

    this.marginG = this.svg
      .append("g")
      .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

    // Background rect for events
    this.marginG
      .append("rect")
      .attr("width", this.width)
      .attr("height", this.height)
      .attr("fill", "transparent")
      .style("pointer-events", "all");

    const contentG = this.marginG.append("g");
    this.plotAreaG = contentG
      .append("g")
      .attr("clip-path", `url(#clip-${Date.now()})`);

    // Initialize scales
    this.baseXScale = d3
      .scaleTime()
      .domain(d3.extent(this.data, (d) => d.date) as [Date, Date])
      .range([0, this.width]);

    this.baseYScale = d3
      .scaleLinear()
      .domain([0, d3.max(this.data, (d) => d.duration) || 0])
      .range([this.height, 0]);

    // Create line and dots
    this.path = this.plotAreaG
      .append("path")
      .datum(this.data)
      .attr("fill", "none")
      .attr("stroke", "#38bdf8")
      .attr("stroke-width", 2);

    // Axes
    this.xAxisG = contentG
      .append("g")
      .attr("transform", `translate(0,${this.height})`);

    this.yAxisG = contentG.append("g");

    // Axis labels
    contentG
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - this.margin.left)
      .attr("x", 0 - this.height / 2)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", "#e2e8f0")
      .text("Build Time");

    contentG
      .append("text")
      .attr(
        "transform",
        `translate(${this.width / 2}, ${this.height + this.margin.bottom - 5})`,
      )
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", "#e2e8f0")
      .text("Date");

    // Setup zoom behaviors
    this.setupZoom();

    // Initial render
    this.updateView();

    // Note: ResizeObserver disabled to prevent render loops
    // If container size changes, user can refresh the page
    // this.setupResizeObserver();
  }

  private setupZoom() {
    // X-axis zoom (horizontal panning with scroll, drag to zoom)
    this.xZoomBehavior = d3
      .zoom<SVGGElement, unknown>()
      .scaleExtent([0.5, 20])
      .filter((event) => {
        // Disable default wheel zoom - we handle wheel events manually for panning
        if (event.type === "wheel") {
          return false;
        }
        // Allow mousedown for drag-to-zoom (handled separately)
        return !event.ctrlKey && !event.button;
      })
      .on("zoom", (event) => {
        this.currentXTransform = this.constrainXTransform(event.transform);
        this.updateView();
      });

    // Y-axis zoom (on Y-axis only)
    this.yZoomBehavior = d3
      .zoom<SVGGElement, unknown>()
      .scaleExtent([0.5, 20])
      .on("zoom", (event) => {
        this.currentYTransform = event.transform;
        this.updateView();
      });

    // Apply zoom to main area for X (but wheel is disabled via filter)
    this.marginG.call(this.xZoomBehavior);

    // Handle horizontal scrolling for panning (custom handler)
    this.marginG.on("wheel.pan", (event) => {
      event.preventDefault();
      const deltaX = event.deltaX || (event.shiftKey ? event.deltaY : 0);
      if (deltaX !== 0) {
        const dx = -deltaX * 0.5;
        const proposedTransform = d3.zoomIdentity
          .translate(this.currentXTransform.x + dx, 0)
          .scale(this.currentXTransform.k);
        const constrainedTransform =
          this.constrainXTransform(proposedTransform);

        // Update transform directly without triggering zoom event
        this.currentXTransform = constrainedTransform;
        this.updateView();
      }
    });

    // Drag selection to zoom
    this.setupDragZoom();

    // Y-axis interactive - drag to pan, wheel to zoom
    this.yAxisG
      .style("cursor", "ns-resize")
      .call(this.yZoomBehavior)
      .on("wheel", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const delta = -event.deltaY;
        const scaleFactor = delta > 0 ? 1.1 : 0.9;
        const newK = Math.max(
          0.5,
          Math.min(20, this.currentYTransform.k * scaleFactor),
        );

        // Keep the pan position when zooming
        const newTransform = d3.zoomIdentity
          .translate(0, this.currentYTransform.y)
          .scale(newK);
        this.yAxisG.call(this.yZoomBehavior.transform, newTransform);
      });
  }

  private setupDragZoom() {
    let dragStartX: number | null = null;
    let dragEndX: number | null = null;
    let selectionRect: any = null;

    this.marginG.on("mousedown", (event) => {
      if (event.button !== 0) return;
      const [x] = d3.pointer(event);
      dragStartX = x;
      dragEndX = x;

      selectionRect = this.plotAreaG
        .append("rect")
        .attr("class", "zoom-selection")
        .attr("x", x)
        .attr("y", 0)
        .attr("width", 0)
        .attr("height", this.height)
        .attr("fill", "rgba(56, 189, 248, 0.2)")
        .attr("stroke", "rgba(56, 189, 248, 0.5)")
        .attr("stroke-width", 1);

      event.preventDefault();
    });

    this.marginG.on("mousemove", (event) => {
      if (dragStartX === null || !selectionRect) return;
      const [x] = d3.pointer(event);
      dragEndX = x;
      const left = Math.min(dragStartX, dragEndX);
      const right = Math.max(dragStartX, dragEndX);
      selectionRect.attr("x", left).attr("width", right - left);
    });

    this.marginG.on("mouseup", () => {
      if (dragStartX === null || dragEndX === null) return;
      if (selectionRect) {
        selectionRect.remove();
        selectionRect = null;
      }

      const dx = Math.abs(dragEndX - dragStartX);
      if (dx > 5) {
        const left = Math.min(dragStartX, dragEndX);
        const right = Math.max(dragStartX, dragEndX);
        const viewXScale = this.currentXTransform.rescaleX(this.baseXScale);
        const domain = [viewXScale.invert(left), viewXScale.invert(right)];
        const newScale =
          (this.baseXScale.range()[1] - this.baseXScale.range()[0]) /
          (this.baseXScale(domain[1]) - this.baseXScale(domain[0]));
        const newTranslate = -this.baseXScale(domain[0]) * newScale;
        const newTransform = d3.zoomIdentity
          .translate(newTranslate, 0)
          .scale(newScale);
        const constrainedTransform = this.constrainXTransform(newTransform);

        this.marginG
          .transition()
          .duration(300)
          .call(this.xZoomBehavior.transform, constrainedTransform);
      }

      dragStartX = null;
      dragEndX = null;
    });
  }

  private constrainXTransform(transform: d3.ZoomTransform): d3.ZoomTransform {
    const viewXScale = transform.rescaleX(this.baseXScale);
    const [_viewStart, viewEnd] = viewXScale.domain();
    const now = new Date();

    if (viewEnd > now) {
      // Calculate new transform so that viewEnd aligns with "now"
      // We want: transform.rescaleX(baseXScale)(now) = baseXScale.range()[1]
      const r1 = this.baseXScale.range()[1];
      const nowInBase = this.baseXScale(now);

      // The new transform should map "now" to the right edge of the chart
      const newTranslate = r1 - nowInBase * transform.k;

      return d3.zoomIdentity.translate(newTranslate, 0).scale(transform.k);
    }

    return transform;
  }

  private updateView() {
    if (!this.svg || this.data.length === 0) return;

    const viewXScale = this.currentXTransform.rescaleX(this.baseXScale);
    const viewYScale = this.currentYTransform.rescaleY(this.baseYScale);

    // Update line
    const lineGen = d3
      .line<ChartDataPoint>()
      .x((d) => viewXScale(d.date))
      .y((d) => viewYScale(d.duration))
      .curve(d3.curveMonotoneX);

    this.path.attr("d", lineGen(this.data) ?? "");

    // Update dots (data join)
    const dotsUpdate = this.plotAreaG
      .selectAll<SVGCircleElement, ChartDataPoint>(".dot")
      .data(this.data);

    dotsUpdate.exit().remove();

    const dotsEnter = dotsUpdate
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("r", 4)
      .attr("fill", "#38bdf8")
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 2);

    const allDots = dotsUpdate
      .merge(dotsEnter)
      .attr("cx", (d) => viewXScale(d.date))
      .attr("cy", (d) => viewYScale(d.duration));

    // Attach tooltip handlers
    allDots
      .on("mouseover", (event, d) => {
        this.tooltip.transition().duration(200).style("opacity", 0.95);
        const prInfo = d.prNumber ? `PR #${d.prNumber}` : "Non-PR Build";
        const prTitle = d.prTitle ? `<br/>Title: ${d.prTitle}` : "";
        this.tooltip
          .html(
            `<strong>${prInfo}</strong><br/>
             Duration: ${d.duration}s<br/>
             Date: ${d.date.toLocaleDateString()}${prTitle}`,
          )
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px");
      })
      .on("mouseout", () => {
        this.tooltip.transition().duration(500).style("opacity", 0);
      });

    // Update axes
    const formatDuration = (domainValue: d3.NumberValue) => {
      const seconds =
        typeof domainValue === "number" ? domainValue : domainValue.valueOf();
      if (seconds < 60) return `${Math.round(seconds)}s`;
      if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
      return `${(seconds / 3600).toFixed(1)}h`;
    };

    const xAxisGen = d3
      .axisBottom(viewXScale)
      .tickFormat((d) => d3.timeFormat("%m/%d")(d as Date))
      .tickSizeOuter(0);

    const yAxisGen = d3
      .axisLeft(viewYScale)
      .tickFormat(formatDuration)
      .tickSizeOuter(0);

    this.xAxisG.call(xAxisGen);
    this.yAxisG.call(yAxisGen);

    // Style axes
    [this.xAxisG, this.yAxisG].forEach((axis) => {
      axis.attr("color", "#94a3b8");
      axis.selectAll(".domain").attr("stroke", "#94a3b8");
      axis.selectAll(".tick line").attr("stroke", "#94a3b8");
      axis.selectAll(".tick text").style("fill", "#94a3b8");
    });
  }

  public updateData(runs: WorkflowRun[]) {
    // Transform runs to chart data
    const chartData: ChartDataPoint[] = runs.map((run) => ({
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

    chartData.sort((a, b) => a.date.getTime() - b.date.getTime());

    const oldDataCount = this.data.length;
    const oldExtent =
      this.data.length > 0
        ? [this.data[0].date, this.data[this.data.length - 1].date]
        : null;

    this.data = chartData;

    console.log("[UPDATE DATA]", {
      oldCount: oldDataCount,
      newCount: chartData.length,
      oldExtent: oldExtent
        ? [oldExtent[0].toISOString(), oldExtent[1].toISOString()]
        : null,
      newExtent:
        chartData.length > 0
          ? [
              chartData[0].date.toISOString(),
              chartData[chartData.length - 1].date.toISOString(),
            ]
          : null,
    });

    if (this.svg) {
      // Update existing chart
      const newDomain = d3.extent(this.data, (d) => d.date) as [Date, Date];
      console.log("[SCALE UPDATE]", {
        oldDomain: this.baseXScale.domain().map((d) => d.toISOString()),
        newDomain: newDomain.map((d) => d.toISOString()),
      });
      this.baseXScale.domain(newDomain);
      this.baseYScale.domain([0, d3.max(this.data, (d) => d.duration) || 0]);
      this.updateView();
    } else {
      // Initial render
      this.render();
    }
  }

  public destroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.container.selectAll("*").remove();
  }
}
