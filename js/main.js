import { loadDashboardData } from "./data.js";
import { createMap } from "./map.js";
import { createAreaChart } from "./areaChart.js";
import { createScatterPlot } from "./scatterPlot.js";
import { createTimeline } from "./timeline.js";
import {
  formatPercent,
  formatCarbon,
  formatTWh,
  formatDollars,
  formatPercentPoint,
  selectedRangeLabel,
  sourceWithLargestGeneration
} from "./utils.js";

const state = {
  selectedCountry: "United States",
  selectedRegion: "All",
  yearRange: [1990, 2025],
  hoveredSource: null
};

let dataContext;
let views = [];

function getState() {
  return { ...state, yearRange: [...state.yearRange] };
}

function updateCountrySelectOptions() {
  const countries = dataContext.countriesForRegion(state.selectedRegion);
  const select = d3.select("#country-select");

  select.selectAll("option")
    .data(countries, d => d.country)
    .join("option")
    .attr("value", d => d.country)
    .text(d => d.country);

  select.property("value", state.selectedCountry);
}

function updateRegionChips() {
  d3.selectAll("#region-filter .region-chip")
    .classed("active", d => d === state.selectedRegion)
    .attr("aria-checked", d => d === state.selectedRegion ? "true" : "false");
}

function updateAll() {
  const label = selectedRangeLabel(state.yearRange);
  document.querySelector("#year-range-label").textContent = label;
  document.querySelector("#timeline-range-label").textContent = label;
  updateCountrySelectOptions();
  updateRegionChips();
  updateSummary();
  views.forEach(view => view.update());
}

function setSelectedCountry(country) {
  if (!country || country === state.selectedCountry) return;
  state.selectedCountry = country;
  updateAll();
}

function setSelectedRegion(region) {
  if (!region || region === state.selectedRegion) return;
  state.selectedRegion = region;

  if (!dataContext.countryMatchesRegion(state.selectedCountry, state.selectedRegion)) {
    const replacement = dataContext.countriesForRegion(state.selectedRegion)[0];
    if (replacement) state.selectedCountry = replacement.country;
  }

  updateAll();
}

function setYearRange(range) {
  state.yearRange = range;
  updateAll();
}

function setHoveredSource(source) {
  state.hoveredSource = source;
  updateAll();
}

function metricHtml(formatter, row, field) {
  return row ? `${formatter(row[field])}${row.year ? `<small>${row.year}</small>` : ""}` : "No data";
}

function updateSummary() {
  const anyRow = dataContext.latestCountryRecord(state.selectedCountry, state.yearRange, []);
  const renewablesRow = dataContext.latestCountryRecord(state.selectedCountry, state.yearRange, ["renewables_share_elec"]);
  const carbonRow = dataContext.latestCountryRecord(state.selectedCountry, state.yearRange, ["carbon_intensity_elec"]);
  const electricityRow = dataContext.latestCountryRecord(state.selectedCountry, state.yearRange, ["electricity_generation"]);
  const gdpRow = dataContext.latestCountryRecord(state.selectedCountry, state.yearRange, ["gdp_per_capita"]);
  const sourceRow = dataContext.latestCountryRecord(state.selectedCountry, state.yearRange, ["electricity_generation"]);
  const firstRenewablesRow = dataContext.earliestCountryRecord(state.selectedCountry, state.yearRange, ["renewables_share_elec"]);
  const latestRenewablesRow = renewablesRow;
  const largestSource = sourceWithLargestGeneration(sourceRow);
  const renewablesChange = latestRenewablesRow && firstRenewablesRow
    ? latestRenewablesRow.renewables_share_elec - firstRenewablesRow.renewables_share_elec
    : NaN;

  document.querySelector("#summary-country").textContent = state.selectedCountry;
  document.querySelector("#stat-renewables").innerHTML = metricHtml(formatPercent, renewablesRow, "renewables_share_elec");
  document.querySelector("#stat-carbon").innerHTML = metricHtml(formatCarbon, carbonRow, "carbon_intensity_elec");
  document.querySelector("#stat-electricity").innerHTML = metricHtml(formatTWh, electricityRow, "electricity_generation");
  document.querySelector("#stat-gdp").innerHTML = metricHtml(formatDollars, gdpRow, "gdp_per_capita");
  document.querySelector("#stat-largest-source").innerHTML = largestSource
    ? `${largestSource.label}<small>${formatTWh(largestSource.value)} · ${sourceRow.year}</small>`
    : "No data";
  document.querySelector("#stat-renewables-change").innerHTML = Number.isFinite(renewablesChange)
    ? `${formatPercentPoint(renewablesChange)}<small>${firstRenewablesRow.year} to ${latestRenewablesRow.year}</small>`
    : "No data";

  document.querySelector("#summary-note").textContent = anyRow
    ? `Showing latest available data for ${state.selectedCountry} within ${selectedRangeLabel(state.yearRange)}. Small year labels show which year each metric comes from.`
    : `No data available for ${state.selectedCountry} in ${selectedRangeLabel(state.yearRange)}. Try a wider year range.`;
}

async function init() {
  dataContext = await loadDashboardData();
  state.yearRange = [d3.min(dataContext.years), d3.max(dataContext.years)];
  if (!dataContext.dataByCountry.has(state.selectedCountry)) {
    state.selectedCountry = dataContext.countries[0]?.country || "";
  }

  const select = d3.select("#country-select");
  select.on("change", event => setSelectedCountry(event.target.value));

  const regionOptions = ["All", ...dataContext.regions];
  d3.select("#region-filter")
    .selectAll("button")
    .data(regionOptions)
    .join("button")
    .attr("type", "button")
    .attr("class", "region-chip")
    .attr("role", "radio")
    .attr("aria-checked", d => d === state.selectedRegion ? "true" : "false")
    .text(d => d)
    .on("click", (_, d) => setSelectedRegion(d));

  updateCountrySelectOptions();

  views = [
    createMap({ svgSelector: "#map", legendSelector: "#map-legend", dataContext, getState, setSelectedCountry }),
    createAreaChart({ svgSelector: "#area-chart", legendSelector: "#area-legend", dataContext, getState, setHoveredSource }),
    createScatterPlot({ svgSelector: "#scatter-plot", dataContext, getState, setSelectedCountry }),
    createTimeline({ svgSelector: "#timeline", dataContext, getState, setYearRange })
  ];

  document.querySelector("#reset-years").addEventListener("click", () => {
    setYearRange([d3.min(dataContext.years), d3.max(dataContext.years)]);
  });

  updateAll();
}

init().catch(error => {
  console.error(error);
  document.body.insertAdjacentHTML("afterbegin", `
    <div style="margin:1rem;padding:1rem;border:1px solid #c44;background:#fff3f3;border-radius:12px;">
      <strong>Dashboard failed to load.</strong><br/>
      ${error.message}<br/>
      Make sure you run this with a local server, not by opening index.html directly.
    </div>
  `);
});