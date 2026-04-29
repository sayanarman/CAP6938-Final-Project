import { formatPercent, getCountryFromMapName, showTooltip, moveTooltip, hideTooltip } from "./utils.js";

export function createMap({ svgSelector, legendSelector, dataContext, getState, setSelectedCountry }) {
  const svg = d3.select(svgSelector);
  const legend = d3.select(legendSelector);
  const resetButton = d3.select("#reset-map");
  const countriesGeo = topojson.feature(dataContext.world, dataContext.world.objects.countries).features;
  const color = d3.scaleSequential([0, 100], d3.interpolateYlGn);

  legend.html(`
    <div>
      <div class="map-legend-bar"></div>
      <div class="map-legend-labels"><span>0%</span><span>50%</span><span>100%</span></div>
      <div class="map-legend-note">Gray = no data</div>
    </div>
  `);

  const g = svg.append("g");
  const projection = d3.geoNaturalEarth1();
  const path = d3.geoPath(projection);
  let currentTransform = d3.zoomIdentity;

  const zoom = d3.zoom()
    .scaleExtent([1, 8])
    .filter(event => {
      // Keep standard wheel, mouse, and touch zoom/pan behavior, but ignore right-click.
      return !event.ctrlKey && event.button !== 2;
    })
    .on("zoom", event => {
      currentTransform = event.transform;
      g.attr("transform", currentTransform);
    });

  svg.call(zoom).on("dblclick.zoom", null);
  svg.on("click.clear-selection", event => {
    if (event.defaultPrevented) return;
    if (event.target === svg.node()) setSelectedCountry(null);
  });
  svg.on("dblclick", event => {
    event.preventDefault();
    resetMap();
  });

  function resetMap() {
    svg.transition().duration(450).call(zoom.transform, d3.zoomIdentity);
  }

  resetButton.on("click", resetMap);

  function resize() {
    const width = svg.node().clientWidth;
    const height = svg.node().clientHeight;
    svg.attr("viewBox", [0, 0, width, height]);
    projection.fitSize([width, height], { type: "FeatureCollection", features: countriesGeo });
    g.selectAll("path").attr("d", path);
  }

  g.selectAll("path")
    .data(countriesGeo)
    .join("path")
    .attr("class", "country")
    .attr("d", path)
    .on("click", (event, feature) => {
      event.stopPropagation();
      const country = getCountryFromMapName(feature.properties.name, dataContext.countryByNormalizedName);
      const state = getState();
      if (country && dataContext.dataByCountry.has(country) && dataContext.countryMatchesRegion(country, state.selectedRegion)) {
        setSelectedCountry(country === state.selectedCountry ? null : country);
      }
    })
    .on("mousemove", (event, feature) => {
      const state = getState();
      const country = getCountryFromMapName(feature.properties.name, dataContext.countryByNormalizedName) || feature.properties.name;
      const row = dataContext.latestCountryRecord(country, state.yearRange, ["renewables_share_elec"]);
      const windRow = dataContext.latestCountryRecord(country, state.yearRange, ["wind_share_elec"]);
      showTooltip(event, `
        <strong>${country}${row ? ` · ${row.year}` : ""}</strong>
        Renewable share: ${formatPercent(row?.renewables_share_elec)}<br/>
        Wind share: ${formatPercent(windRow?.wind_share_elec)}<br/>
        Range: ${state.yearRange[0]}–${state.yearRange[1]}
      `);
      moveTooltip(event);
    })
    .on("mouseleave", hideTooltip);

  function update() {
    const state = getState();
    const hoveredSource = state.selectedCountry ? state.hoveredSource : null;

    g.selectAll("path.country")
      .attr("fill", feature => {
        const country = getCountryFromMapName(feature.properties.name, dataContext.countryByNormalizedName);
        if (country && !dataContext.countryMatchesRegion(country, state.selectedRegion)) return "#d8ded8";
        const row = country ? dataContext.latestCountryRecord(country, state.yearRange, ["renewables_share_elec"]) : null;
        return Number.isFinite(row?.renewables_share_elec) ? color(row.renewables_share_elec) : "#e4e7e2";
      })
      .classed("selected", feature => {
        const country = getCountryFromMapName(feature.properties.name, dataContext.countryByNormalizedName);
        return Boolean(state.selectedCountry && country === state.selectedCountry);
      })
      .classed("outside-region", feature => {
        const country = getCountryFromMapName(feature.properties.name, dataContext.countryByNormalizedName);
        return Boolean(country && !dataContext.countryMatchesRegion(country, state.selectedRegion));
      })
      .classed("dimmed", feature => {
        const country = getCountryFromMapName(feature.properties.name, dataContext.countryByNormalizedName);
        if (country && !dataContext.countryMatchesRegion(country, state.selectedRegion)) return false;
        if (!hoveredSource) return false;
        const row = country ? dataContext.latestCountryRecord(country, state.yearRange, [hoveredSource.shareKey]) : null;
        return !(Number.isFinite(row?.[hoveredSource.shareKey]) && row[hoveredSource.shareKey] >= 20);
      })
      .classed("highlighted", feature => {
        if (!hoveredSource) return false;
        const country = getCountryFromMapName(feature.properties.name, dataContext.countryByNormalizedName);
        if (country && !dataContext.countryMatchesRegion(country, state.selectedRegion)) return false;
        const row = country ? dataContext.latestCountryRecord(country, state.yearRange, [hoveredSource.shareKey]) : null;
        return Number.isFinite(row?.[hoveredSource.shareKey]) && row[hoveredSource.shareKey] >= 20;
      });
  }

  resize();
  window.addEventListener("resize", () => { resize(); update(); });

  return { update, resetMap };
}