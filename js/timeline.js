export function createTimeline({ svgSelector, dataContext, getState, setYearRange }) {
  const svg = d3.select(svgSelector);
  const margin = { top: 18, right: 22, bottom: 34, left: 42 };
  const g = svg.append("g");
  const xAxisG = g.append("g").attr("class", "axis x-axis");
  const barsG = g.append("g");
  const brushG = g.append("g").attr("class", "brush");

  const minYear = d3.min(dataContext.years);
  const maxYear = d3.max(dataContext.years);
  let isProgrammaticBrushMove = false;

  function rangesEqual(a, b) {
    return a && b && a[0] === b[0] && a[1] === b[1];
  }

  function update() {
    const state = getState();
    const width = svg.node().clientWidth;
    const height = svg.node().clientHeight;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    if (innerWidth <= 0 || innerHeight <= 0) return;

    svg.attr("viewBox", [0, 0, width, height]);
    g.attr("transform", `translate(${margin.left},${margin.top})`);

    const yearCounts = dataContext.years.map(year => ({
      year,
      count: (dataContext.dataByYear.get(year) || []).filter(d => Number.isFinite(d.renewables_share_elec)).length
    }));

    const x = d3.scaleLinear().domain([minYear, maxYear]).range([0, innerWidth]);
    const y = d3.scaleLinear().domain([0, d3.max(yearCounts, d => d.count) || 1]).range([innerHeight, 0]);
    const barWidth = Math.max(2, innerWidth / dataContext.years.length - 1);

    barsG.selectAll("rect")
      .data(yearCounts, d => d.year)
      .join("rect")
      .attr("x", d => x(d.year) - barWidth / 2)
      .attr("y", d => y(d.count))
      .attr("width", barWidth)
      .attr("height", d => innerHeight - y(d.count))
      .attr("fill", "#93b7a4");

    xAxisG.attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(10).tickFormat(d3.format("d")));

    const brush = d3.brushX()
      .extent([[0, 0], [innerWidth, innerHeight]])
      .on("end", event => {
        if (isProgrammaticBrushMove || !event.selection) return;

        const [x0, x1] = event.selection.map(x.invert);
        const start = Math.max(minYear, Math.round(x0));
        const end = Math.min(maxYear, Math.round(x1));
        const nextRange = start <= end ? [start, end] : [end, start];

        if (nextRange[1] > nextRange[0] && !rangesEqual(nextRange, getState().yearRange)) {
          setYearRange(nextRange);
        }
      });

    brushG.call(brush);

    const currentSelection = d3.brushSelection(brushG.node());
    const targetSelection = state.yearRange.map(x);
    const currentRange = currentSelection ? currentSelection.map(x.invert).map(Math.round) : null;

    if (!rangesEqual(currentRange, state.yearRange)) {
      isProgrammaticBrushMove = true;
      brushG.call(brush.move, targetSelection);
      isProgrammaticBrushMove = false;
    }
  }

  return { update };
}