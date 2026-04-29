import { ENERGY_SOURCES, formatTWh, formatPercent, showTooltip, moveTooltip, hideTooltip } from "./utils.js";

export function createAreaChart({ svgSelector, legendSelector, dataContext, getState, setHoveredSource }) {
  const svg = d3.select(svgSelector);
  const legend = d3.select(legendSelector);
  const margin = { top: 18, right: 20, bottom: 42, left: 58 };
  const g = svg.append("g");
  const xAxisG = g.append("g").attr("class", "axis x-axis");
  const yAxisG = g.append("g").attr("class", "axis y-axis");
  const gridG = g.append("g").attr("class", "grid");
  const layersG = g.append("g");
  const xLabel = g.append("text").attr("class", "axis-label").attr("text-anchor", "middle").attr("fill", "#65716f").text("Year");
  const yLabel = g.append("text").attr("class", "axis-label").attr("text-anchor", "middle").attr("fill", "#65716f").text("Electricity generation (TWh)");

  legend.selectAll(".legend-item")
    .data(ENERGY_SOURCES)
    .join("span")
    .attr("class", "legend-item")
    .html(d => `<span class="legend-swatch" style="background:${d.color}"></span>${d.label}`)
    .on("mouseenter", (_, d) => setHoveredSource(d))
    .on("mouseleave", () => setHoveredSource(null));

  function update() {
    const state = getState();
    const width = svg.node().clientWidth;
    const height = svg.node().clientHeight;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    svg.attr("viewBox", [0, 0, width, height]);
    g.attr("transform", `translate(${margin.left},${margin.top})`);

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
    yLabel.attr("transform", `translate(${-42},${innerHeight / 2}) rotate(-90)`);

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

  return { update };
}