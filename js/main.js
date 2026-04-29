import { loadDashboardData } from "./data.js";
import { createMap } from "./map.js";
import { createAreaChart } from "./areaChart.js";
import { createScatterPlot } from "./scatterPlot.js";
import { createTimeline } from "./timeline.js";
import {
  COMPARISON_LIMIT,
  formatPercent,
  formatCarbon,
  formatTWh,
  formatDollars,
  formatPercentPoint,
  selectedRangeLabel,
  sourceWithLargestGeneration
} from "./utils.js";

const state = {
  selectedCountry: null,
  comparisonCountries: [],
  selectedRegion: "All",
  yearRange: [1990, 2025],
  hoveredSource: null
};

let dataContext;
let views = [];

function getState() {
  return {
    ...state,
    yearRange: [...state.yearRange],
    comparisonCountries: [...state.comparisonCountries]
  };
}

function availableCountries() {
  return dataContext.countriesForRegion(state.selectedRegion);
}

function updateCountrySelectOptions() {
  const countries = availableCountries();
  const select = d3.select("#country-select");
  const options = [{ country: "", label: "Select a country" }, ...countries.map(d => ({ ...d, label: d.country }))];

  select.selectAll("option")
    .data(options, d => d.country)
    .join("option")
    .attr("value", d => d.country)
    .text(d => d.label);

  select.property("value", state.selectedCountry || "");
}

function updateCompareControl() {
  const countries = availableCountries()
    .filter(d => !state.comparisonCountries.includes(d.country));

  const compareSelect = d3.select("#compare-select");
  const options = [
    { country: "", label: state.comparisonCountries.length >= COMPARISON_LIMIT ? `Maximum ${COMPARISON_LIMIT} countries selected` : "Add country to compare" },
    ...countries.map(d => ({ ...d, label: d.country }))
  ];

  compareSelect.selectAll("option")
    .data(options, d => d.country)
    .join("option")
    .attr("value", d => d.country)
    .attr("disabled", (d, i) => i > 0 && state.comparisonCountries.length >= COMPARISON_LIMIT ? true : null)
    .text(d => d.label);

  compareSelect
    .property("value", "")
    .property("disabled", state.comparisonCountries.length >= COMPARISON_LIMIT);

  d3.select("#comparison-count").text(`${state.comparisonCountries.length}/${COMPARISON_LIMIT}`);

  const chips = d3.select("#comparison-chips")
    .selectAll("button.comparison-chip")
    .data(state.comparisonCountries, d => d);

  chips.join(
    enter => enter.append("button")
      .attr("type", "button")
      .attr("class", "comparison-chip")
      .attr("aria-label", d => `Remove ${d} from comparison`)
      .html(d => `<span>${d}</span><span aria-hidden="true">×</span>`)
      .on("click", (_, d) => removeComparisonCountry(d)),
    update => update
      .attr("aria-label", d => `Remove ${d} from comparison`)
      .html(d => `<span>${d}</span><span aria-hidden="true">×</span>`),
    exit => exit.remove()
  );

  d3.select("#comparison-empty")
    .style("display", state.comparisonCountries.length ? "none" : null);
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
  updateCompareControl();
  updateRegionChips();
  updateSummary();
  views.forEach(view => view.update());
}

function setSelectedCountry(country) {
  const nextCountry = country || null;
  if (nextCountry === state.selectedCountry) return;
  state.selectedCountry = nextCountry;
  if (!nextCountry) state.hoveredSource = null;
  updateAll();
}

function addComparisonCountry(country) {
  if (!country || state.comparisonCountries.includes(country)) return;
  if (state.comparisonCountries.length >= COMPARISON_LIMIT) return;
  if (!dataContext.countryMatchesRegion(country, state.selectedRegion)) return;
  state.comparisonCountries = [...state.comparisonCountries, country];
  state.hoveredSource = null;
  updateAll();
}

function removeComparisonCountry(country) {
  state.comparisonCountries = state.comparisonCountries.filter(d => d !== country);
  updateAll();
}

function setSelectedRegion(region) {
  if (!region || region === state.selectedRegion) return;
  state.selectedRegion = region;

  if (state.selectedCountry && !dataContext.countryMatchesRegion(state.selectedCountry, state.selectedRegion)) {
    state.selectedCountry = null;
  }

  state.comparisonCountries = state.comparisonCountries
    .filter(country => dataContext.countryMatchesRegion(country, state.selectedRegion));

  state.hoveredSource = null;
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
  const statGrid = document.querySelector("#summary-stat-grid");
  const comparisonSummary = document.querySelector("#comparison-summary");

  if (state.comparisonCountries.length >= 2) {
    statGrid.style.display = "none";
    comparisonSummary.style.display = null;
    document.querySelector("#summary-country").textContent = "Country comparison";

    const rows = state.comparisonCountries.map(country => {
      const latest = dataContext.latestCountryRecord(country, state.yearRange, []);
      const renewables = dataContext.latestCountryRecord(country, state.yearRange, ["renewables_share_elec"]);
      const carbon = dataContext.latestCountryRecord(country, state.yearRange, ["carbon_intensity_elec"]);
      const electricity = dataContext.latestCountryRecord(country, state.yearRange, ["electricity_generation"]);
      const gdp = dataContext.latestCountryRecord(country, state.yearRange, ["gdp_per_capita"]);
      const largest = sourceWithLargestGeneration(electricity);
      return { country, latest, renewables, carbon, electricity, gdp, largest };
    });

    comparisonSummary.innerHTML = `
      <table class="comparison-table">
        <thead>
          <tr>
            <th>Country</th>
            <th>Renewables</th>
            <th>Carbon intensity</th>
            <th>GDP/capita</th>
            <th>Largest source</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr>
              <td><strong>${row.country}</strong></td>
              <td>${formatPercent(row.renewables?.renewables_share_elec)}${row.renewables ? `<small>${row.renewables.year}</small>` : ""}</td>
              <td>${formatCarbon(row.carbon?.carbon_intensity_elec)}${row.carbon ? `<small>${row.carbon.year}</small>` : ""}</td>
              <td>${formatDollars(row.gdp?.gdp_per_capita)}${row.gdp ? `<small>${row.gdp.year}</small>` : ""}</td>
              <td>${row.largest ? `${row.largest.label}<small>${formatTWh(row.largest.value)} · ${row.electricity.year}</small>` : "No data"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    document.querySelector("#summary-note").textContent =
      `Comparison mode is using the latest available values within ${selectedRangeLabel(state.yearRange)}. Remove country chips to return to single-country summary mode.`;
    return;
  }

  statGrid.style.display = null;
  comparisonSummary.style.display = "none";

  if (!state.selectedCountry) {
    document.querySelector("#summary-country").textContent = "No country selected";
    [
      "#stat-renewables",
      "#stat-carbon",
      "#stat-electricity",
      "#stat-gdp",
      "#stat-largest-source",
      "#stat-renewables-change"
    ].forEach(selector => { document.querySelector(selector).innerHTML = "—"; });
    document.querySelector("#summary-note").textContent =
      `Click a country on the map or choose one from the dropdown to view country-level metrics for ${selectedRangeLabel(state.yearRange)}. Add two or more countries to compare them directly.`;
    return;
  }

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

  d3.select("#country-select").on("change", event => setSelectedCountry(event.target.value || null));
  d3.select("#compare-select").on("change", event => addComparisonCountry(event.target.value));

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
  updateCompareControl();

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