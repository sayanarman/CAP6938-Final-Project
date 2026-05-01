import { ENERGY_SOURCES, formatTWh, formatPercent, showTooltip, moveTooltip, hideTooltip, comparisonColor, getComparisonMetric } from "./utils.js";

export function createAreaChart({ svgSelector, legendSelector, dataContext, getState, setHoveredSource }) {
  const svg = d3.select(svgSelector);
  const legend = d3.select(legendSelector);
  const margin = { top: 18, right: 20, bottom: 42, left: 120 };
  const g = svg.append("g");
  const xAxisG = g.append("g").attr("class", "axis x-axis");
  const yAxisG = g.append("g").attr("class", "axis y-axis");
  const gridG = g.append("g").attr("class", "grid");
  const layersG = g.append("g");
  const emptyText = g.append("text")
    .attr("class", "empty-state")
    .attr("text-anchor", "middle")
    .attr("fill", "#65716f")
    .style("font-size", "14px")
    .style("display", "none");
  const xLabel = g.append("text").attr("class", "axis-label").attr("text-anchor", "middle").attr("fill", "#65716f").text("Year");
  const yLabel = g.append("text").attr("class", "axis-label").attr("text-anchor", "middle").attr("fill", "#65716f");

  function clearAreaHover() {
    hideTooltip();
    setHoveredSource(null);
  }

  svg.on("mouseleave.areaTooltip", clearAreaHover);
  layersG.on("mouseleave.areaTooltip", clearAreaHover);

  function renderSourceLegend() {
    legend.selectAll(".legend-item")
      .data(ENERGY_SOURCES, d => d.label)
      .join("span")
      .attr("class", "legend-item")
      .html(d => `<span class="legend-swatch" style="background:${d.color}"></span>${d.label}`)
      .on("mouseenter", (_, d) => setHoveredSource(d))
      .on("mouseleave", () => setHoveredSource(null));
  }

  function renderComparisonLegend(countries, metric) {
    legend.selectAll(".legend-item")
      .data(countries, d => d)
      .join("span")
      .attr("class", "legend-item")
      .html((d, i) => `<span class="legend-swatch" style="background:${comparisonColor(i)}"></span>${d}`)
      .on("mouseenter", null)
      .on("mouseleave", null);
  }

  function update() {
    hideTooltip();
    const state = getState();
    const isComparisonMode = state.comparisonCountries.length >= 2;
    const width = svg.node().clientWidth;
    const height = svg.node().clientHeight;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    svg.attr("viewBox", [0, 0, width, height]);
    g.attr("transform", `translate(${margin.left},${margin.top})`);

    if (isComparisonMode) {
      updateComparisonMode(state, innerWidth, innerHeight);
      return;
    }

    renderSourceLegend();

    if (!state.selectedCountry) {
      xAxisG.selectAll("*").remove();
      yAxisG.selectAll("*").remove();
      gridG.selectAll("*").remove();
      layersG.selectAll("*").remove();
      xLabel.style("display", "none");
      yLabel.style("display", "none");
      emptyText
        .style("display", null)
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight / 2)
        .text("Select a country to view its electricity mix over time, or add 2+ countries to compare renewable share.");
      return;
    }

    emptyText.style("display", "none");
    layersG.selectAll("path.comparison-line,circle.comparison-line-point").remove();
    xLabel.style("display", null).text("Year");
    yLabel.style("display", null).text("Electricity generation (TWh)");

    const rows = (dataContext.dataByCountry.get(state.selectedCountry) || [])
      .filter(d => d.year >= state.yearRange[0] && d.year <= state.yearRange[1])
      .map(d => {
        const row = { year: d.year };
        for (const source of ENERGY_SOURCES) row[source.key] = Number.isFinite(d[source.key]) ? d[source.key] : 0;
        return row;
      });

    const stack = d3.stack().keys(ENERGY_SOURCES.map(d => d.key));
    const series = stack(rows);
    const maxY = d3.max(series, layer => d3.max(layer, d => d[1])) || 1;

    const x = d3.scaleLinear().domain(d3.extent(rows, d => d.year)).range([0, innerWidth]).nice();
    const y = d3.scaleLinear().domain([0, maxY]).range([innerHeight, 0]).nice();
    const area = d3.area()
      .x(d => x(d.data.year))
      .y0(d => y(d[0]))
      .y1(d => y(d[1]));

    gridG.attr("transform", `translate(0,0)`)
      .call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(""));
    xAxisG.attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(x).ticks(Math.min(8, rows.length)).tickFormat(d3.format("d")));
    yAxisG.call(d3.axisLeft(y).ticks(5));
    xLabel.attr("x", innerWidth / 2).attr("y", innerHeight + 36);
    yLabel.attr("transform", `translate(${-82},${innerHeight / 2}) rotate(-90)`);

    layersG.selectAll("path.area-layer")
      .data(series, d => d.key)
      .join("path")
      .attr("class", "area-layer")
      .attr("fill", d => ENERGY_SOURCES.find(s => s.key === d.key).color)
      .attr("d", area)
      .classed("active", d => state.hoveredSource?.key === d.key)
      .classed("faded", d => state.hoveredSource && state.hoveredSource.key !== d.key)
      .on("mouseenter.highlight", (_, d) => setHoveredSource(ENERGY_SOURCES.find(s => s.key === d.key)))
      .on("mouseleave.highlight", () => setHoveredSource(null))
      .on("mousemove", (event, d) => {
        const [mx] = d3.pointer(event, g.node());
        const year = Math.round(x.invert(mx));
        const source = ENERGY_SOURCES.find(s => s.key === d.key);
        const raw = dataContext.dataByCountryYear.get(`${state.selectedCountry}|${year}`);
        showTooltip(event, `
          <strong>${state.selectedCountry} · ${source.label}</strong>
          Year: ${year}<br/>
          Generation: ${formatTWh(raw?.[source.key])}<br/>
          Share: ${formatPercent(raw?.[source.shareKey])}
        `);
        moveTooltip(event);
      })
      .on("mouseleave.tooltip", hideTooltip);
  }

  function updateComparisonMode(state, innerWidth, innerHeight) {
    const metric = getComparisonMetric(state.comparisonMetric);
    renderComparisonLegend(state.comparisonCountries, metric);
    emptyText.style("display", "none");
    layersG.selectAll("path.comparison-line,circle.comparison-line-point").remove();
    xLabel.style("display", null).text("Year");
    yLabel.style("display", null).text(metric.axisLabel);

    const series = state.comparisonCountries.map(country => ({
      country,
      values: (dataContext.dataByCountry.get(country) || [])
        .filter(d => d.year >= state.yearRange[0] && d.year <= state.yearRange[1])
        .filter(d => Number.isFinite(d[metric.key]))
    })).filter(d => d.values.length);

    if (!series.length) {
      xAxisG.selectAll("*").remove();
      yAxisG.selectAll("*").remove();
      gridG.selectAll("*").remove();
      layersG.selectAll("*").remove();
      xLabel.style("display", "none");
      yLabel.style("display", "none");
      emptyText
        .style("display", null)
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight / 2)
        .text(`No ${metric.label.toLowerCase()} data is available for the compared countries in this year range.`);
      return;
    }

    const years = series.flatMap(d => d.values.map(v => v.year));
    const values = series.flatMap(d => d.values.map(v => v[metric.key]));
    const maxValue = d3.max(values) || 1;
    const yDomain = metric.domain === "percent" ? [0, Math.max(100, maxValue)] : [0, maxValue];
    const x = d3.scaleLinear().domain(d3.extent(years.length ? years : state.yearRange)).range([0, innerWidth]).nice();
    const y = d3.scaleLinear().domain(yDomain).range([innerHeight, 0]).nice();
    const line = d3.line()
      .defined(d => Number.isFinite(d[metric.key]))
      .x(d => x(d.year))
      .y(d => y(d[metric.key]));

    gridG.call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(""));
    xAxisG.attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(x).ticks(8).tickFormat(d3.format("d")));
    yAxisG.call(d3.axisLeft(y).ticks(5).tickFormat(metric.domain === "percent" ? d => `${d}%` : undefined));
    xLabel.attr("x", innerWidth / 2).attr("y", innerHeight + 36);
    yLabel.attr("transform", `translate(${-82},${innerHeight / 2}) rotate(-90)`);

    layersG.selectAll("path.area-layer").remove();

    layersG.selectAll("path.comparison-line")
      .data(series, d => d.country)
      .join("path")
      .attr("class", "comparison-line")
      .attr("fill", "none")
      .attr("stroke", (d, i) => comparisonColor(i))
      .attr("stroke-width", 2.4)
      .attr("d", d => line(d.values));

    layersG.selectAll("circle.comparison-line-point")
      .data(series.flatMap((s, i) => s.values.map(v => ({ ...v, country: s.country, color: comparisonColor(i), metricValue: v[metric.key] }))), d => `${d.country}|${d.year}`)
      .join("circle")
      .attr("class", "comparison-line-point")
      .attr("r", 3)
      .attr("cx", d => x(d.year))
      .attr("cy", d => y(d.metricValue))
      .attr("fill", d => d.color)
      .on("mousemove", (event, d) => {
        showTooltip(event, `
          <strong>${d.country} · ${d.year}</strong>
          ${metric.label}: ${metric.formatter(d.metricValue)}
        `);
        moveTooltip(event);
      })
      .on("mouseleave", hideTooltip);
  }

  return { update };
}