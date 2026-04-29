export const ENERGY_SOURCES = [
  { key: "coal_electricity", shareKey: "coal_share_elec", label: "Coal", color: "#5b4a42" },
  { key: "gas_electricity", shareKey: "gas_share_elec", label: "Gas", color: "#9c6b43" },
  { key: "oil_electricity", shareKey: "oil_share_elec", label: "Oil", color: "#7f7f7f" },
  { key: "nuclear_electricity", shareKey: "nuclear_share_elec", label: "Nuclear", color: "#8d78bd" },
  { key: "hydro_electricity", shareKey: "hydro_share_elec", label: "Hydro", color: "#4c9fd3" },
  { key: "solar_electricity", shareKey: "solar_share_elec", label: "Solar", color: "#f2bd42" },
  { key: "wind_electricity", shareKey: "wind_share_elec", label: "Wind", color: "#64b96a" },
  { key: "biofuel_electricity", shareKey: "biofuel_share_elec", label: "Biofuel", color: "#a6c96a" },
  { key: "other_renewable_electricity", shareKey: "other_renewables_share_elec", label: "Other renewables", color: "#83b8a3" }
];

export function formatPercent(value, digits = 1) {
  return Number.isFinite(value) ? `${value.toFixed(digits)}%` : "No data";
}

export function formatPercentPoint(value, digits = 1) {
  if (!Number.isFinite(value)) return "No data";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)} pp`;
}

export function formatTWh(value) {
  if (!Number.isFinite(value)) return "No data";
  return `${d3.format(",.0f")(value)} TWh`;
}

export function formatCarbon(value) {
  if (!Number.isFinite(value)) return "No data";
  return `${d3.format(",.0f")(value)} gCO₂e/kWh`;
}

export function formatDollars(value) {
  if (!Number.isFinite(value)) return "No data";
  return `$${d3.format(",.0f")(value)}`;
}

export function normalizeName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\./g, "")
    .replace(/\bthe\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export const MAP_NAME_ALIASES = new Map(Object.entries({
  "united states of america": "United States",
  "dem rep congo": "Democratic Republic of Congo",
  "congo": "Congo",
  "dominican rep": "Dominican Republic",
  "central african rep": "Central African Republic",
  "eq guinea": "Equatorial Guinea",
  "bosnia and herz": "Bosnia and Herzegovina",
  "czechia": "Czechia",
  "south korea": "South Korea",
  "north korea": "North Korea",
  "russia": "Russia",
  "w sahara": "Western Sahara",
  "s sudan": "South Sudan",
  "cote d ivoire": "Cote d'Ivoire",
  "solomon is": "Solomon Islands",
  "falkland is": "Falkland Islands",
  "fr s antarctic lands": "French Southern and Antarctic Lands",
  "n cyprus": "Northern Cyprus",
  "macedonia": "North Macedonia",
  "e swatini": "Eswatini",
  "taiwan": "Taiwan",
  "laos": "Laos",
  "vietnam": "Vietnam",
  "brunei": "Brunei",
  "tanzania": "Tanzania"
}));

export function getCountryFromMapName(mapName, countryByNormalizedName) {
  const normalized = normalizeName(mapName);
  const alias = MAP_NAME_ALIASES.get(normalized);
  if (alias) return alias;
  const match = countryByNormalizedName.get(normalized);
  return match ? match.country : null;
}

export function selectedRangeLabel([start, end]) {
  return `${start}–${end}`;
}

export function sourceWithLargestGeneration(row) {
  if (!row) return null;
  return ENERGY_SOURCES
    .map(source => ({ ...source, value: row[source.key] }))
    .filter(d => Number.isFinite(d.value))
    .sort((a, b) => d3.descending(a.value, b.value))[0] || null;
}

export function showTooltip(event, html) {
  const tooltip = d3.select("#tooltip");
  tooltip.html(html)
    .style("display", "block")
    .style("left", `${event.clientX + 14}px`)
    .style("top", `${event.clientY + 14}px`)
    .attr("aria-hidden", "false");
}

export function moveTooltip(event) {
  d3.select("#tooltip")
    .style("left", `${event.clientX + 14}px`)
    .style("top", `${event.clientY + 14}px`);
}

export function hideTooltip() {
  d3.select("#tooltip").style("display", "none").attr("aria-hidden", "true");
}