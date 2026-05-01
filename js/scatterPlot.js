import { formatPercent, formatCarbon, formatDollars, showTooltip, moveTooltip, hideTooltip, comparisonColor } from "./utils.js";

export function createScatterPlot({ svgSelector, dataContext, getState, setSelectedCountry }) {
  const svg = d3.select(svgSelector);
  const margin = { top: 18, right: 24, bottom: 52, left: 128 };
  const g = svg.append("g");
  const gridG = g.append("g").attr("class", "grid");
  const xAxisG = g.append("g").attr("class", "axis x-axis");
  const yAxisG = g.append("g").attr("class", "axis y-axis");

  const clipId = `scatter-clip-${Math.random().toString(36).slice(2)}`;
  svg.append("defs")
    .append("clipPath")
    .attr("id", clipId)
    .append("rect");

  const marksG = g.append("g").attr("clip-path", `url(#${clipId})`);
  const dotsG = marksG.append("g").attr("class", "scatter-dots");
  const pathG = marksG.append("g").attr("class", "scatter-trajectory");

  const xLabel = g.append("text").attr("text-anchor", "middle").attr("fill", "#65716f").text("GDP per capita");
  const yLabel = g.append("text")
    .attr("class", "scatter-y-axis-label")
    .attr("text-anchor", "middle")
    .attr("fill", "#65716f")
    .style("font-size", "9px")
    .text("Carbon intensity of electricity (gCO₂e/kWh)");
  const color = d3.scaleSequential([0, 100], d3.interpolateYlGn);

  let innerWidth = 0;
  let innerHeight = 0;
  let baseX = null;
  let baseY = null;
  let currentTransform = d3.zoomIdentity;
  let scatterRows = [];
  let trajectories = [];

  const zoom = d3.zoom()
    .scaleExtent([1, 20])
    .filter(event => !event.ctrlKey && !event.button)
    .on("zoom", event => {
      currentTransform = event.transform;
      redrawWithTransform(currentTransform);
    });

  function transformedScales(transform) {
    return {
      x: transform.rescaleX(baseX),
      y: transform.rescaleY(baseY)
    };
  }

  function redrawWithTransform(transform = d3.zoomIdentity) {
    if (!baseX || !baseY) return;
    const { x, y } = transformedScales(transform);

    gridG.call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(""));
    xAxisG.attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(6, "~s"));
    yAxisG.call(d3.axisLeft(y).ticks(5));

    dotsG.selectAll("circle.dot")
      .attr("cx", d => x(d.gdp_per_capita))
      .attr("cy", d => y(d.carbon_intensity_elec));

    const line = d3.line()
      .defined(d => Number.isFinite(d.gdp_per_capita) && Number.isFinite(d.carbon_intensity_elec))
      .x(d => x(d.gdp_per_capita))
      .y(d => y(d.carbon_intensity_elec));

    pathG.selectAll("path.trajectory")
      .attr("d", d => line(d.values));

    pathG.selectAll("circle.trajectory-point")
      .attr("cx", d => x(d.gdp_per_capita))
      .attr("cy", d => y(d.carbon_intensity_elec));
  }

  function resetZoom() {
    currentTransform = d3.zoomIdentity;
    svg.transition().duration(350).call(zoom.transform, d3.zoomIdentity);
  }

  d3.select("#reset-scatter-zoom").on("click", resetZoom);

  function update() {
    const state = getState();
    const width = svg.node().clientWidth;
    const height = svg.node().clientHeight;
    innerWidth = width - margin.left - margin.right;
    innerHeight = height - margin.top - margin.bottom;

    svg.attr("viewBox", [0, 0, width, height]);
    g.attr("transform", `translate(${margin.left},${margin.top})`);
    svg.select(`#${clipId} rect`)
      .attr("width", innerWidth)
      .attr("height", innerHeight);

    scatterRows = dataContext.latestRowsForRange(
      state.yearRange,
      ["gdp_per_capita", "carbon_intensity_elec"],
      state.selectedRegion
    );

    const comparisonMode = state.comparisonCountries.length >= 2;
    const trajectoryCountries = comparisonMode
      ? state.comparisonCountries
      : (state.selectedCountry ? [state.selectedCountry] : []);

    trajectories = trajectoryCountries.map((country, i) => ({
      country,
      color: comparisonMode ? comparisonColor(i) : "#1d2424",
      values: (dataContext.dataByCountry.get(country) || [])
        .filter(d => d.year >= state.yearRange[0] && d.year <= state.yearRange[1])
        .filter(d => Number.isFinite(d.gdp_per_capita) && Number.isFinite(d.carbon_intensity_elec))
    })).filter(d => d.values.length);

    const trajectoryValues = trajectories.flatMap(d => d.values);
    const allX = scatterRows.concat(trajectoryValues).map(d => d.gdp_per_capita).filter(Number.isFinite).filter(d => d > 0);
    const allY = scatterRows.concat(trajectoryValues).map(d => d.carbon_intensity_elec).filter(Number.isFinite);

    baseX = d3.scaleLog()
      .domain(d3.extent(allX.length ? allX : [1000, 100000]))
      .range([0, innerWidth])
      .nice();
    baseY = d3.scaleLinear()
      .domain([0, d3.max(allY.length ? allY : [1000]) || 1000])
      .range([innerHeight, 0])
      .nice();

    xLabel.attr("x", innerWidth / 2).attr("y", innerHeight + 42);
    yLabel.attr("transform", `translate(${-76},${innerHeight / 2}) rotate(-90)`);

    dotsG.selectAll("circle.dot")
      .data(scatterRows, d => d.iso_code)
      .join(
        enter => enter.append("circle")
          .attr("class", "dot")
          .attr("r", d => Math.max(3.8, Math.min(12, Math.sqrt((d.electricity_generation || 0) / 35))))
          .attr("fill", d => Number.isFinite(d.renewables_share_elec) ? color(d.renewables_share_elec) : "#b8beb8")
          .on("click", (_, d) => setSelectedCountry(d.country))
          .on("mousemove", (event, d) => {
            const compareIndex = state.comparisonCountries.indexOf(d.country);
            showTooltip(event, `
              <strong>${d.country} · ${d.year}</strong>
              GDP per capita: ${formatDollars(d.gdp_per_capita)}<br/>
              Carbon intensity: ${formatCarbon(d.carbon_intensity_elec)}<br/>
              Renewables: ${formatPercent(d.renewables_share_elec)}${compareIndex >= 0 ? "<br/>Included in comparison" : ""}
            `);
            moveTooltip(event);
          })
          .on("mouseleave", hideTooltip),
        update => update,
        exit => exit.remove()
      )
      .attr("r", d => Math.max(3.8, Math.min(12, Math.sqrt((d.electricity_generation || 0) / 35))))
      .attr("fill", d => Number.isFinite(d.renewables_share_elec) ? color(d.renewables_share_elec) : "#b8beb8")
      .classed("selected", d => d.country === state.selectedCountry)
      .classed("comparison-dot", d => state.comparisonCountries.includes(d.country))
      .style("stroke", d => {
        if (d.country === state.selectedCountry) return "#111";
        const compareIndex = state.comparisonCountries.indexOf(d.country);
        return compareIndex >= 0 ? comparisonColor(compareIndex) : null;
      })
      .style("stroke-width", d => {
        if (d.country === state.selectedCountry) return "2.2px";
        return state.comparisonCountries.includes(d.country) ? "2px" : null;
      });

    pathG.selectAll("path.trajectory")
      .data(trajectories.filter(d => d.values.length > 1), d => d.country)
      .join("path")
      .attr("class", "trajectory")
      .attr("stroke", d => d.color);

    pathG.selectAll("circle.trajectory-point")
      .data(trajectories.flatMap(t => t.values.map(v => ({ ...v, trajectoryCountry: t.country, color: t.color }))), d => `${d.trajectoryCountry}|${d.year}`)
      .join("circle")
      .attr("class", "trajectory-point")
      .attr("r", d => d.year === state.yearRange[1] ? 4 : 2.8)
      .attr("fill", d => d.color)
      .on("mousemove", (event, d) => {
        showTooltip(event, `
          <strong>${d.country} · ${d.year}</strong>
          GDP per capita: ${formatDollars(d.gdp_per_capita)}<br/>
          Carbon intensity: ${formatCarbon(d.carbon_intensity_elec)}
        `);
        moveTooltip(event);
      })
      .on("mouseleave", hideTooltip);

    zoom
      .extent([[0, 0], [innerWidth, innerHeight]])
      .translateExtent([[0, 0], [innerWidth, innerHeight]]);

    svg.call(zoom)
      .on("dblclick.zoom", null)
      .on("dblclick", resetZoom);

    redrawWithTransform(currentTransform);
  }

  return { update, resetZoom };
}