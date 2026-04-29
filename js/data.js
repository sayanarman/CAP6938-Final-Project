import { normalizeName } from "./utils.js";

const NUMERIC_COLUMNS = [
  "year", "population", "gdp", "gdp_per_capita", "electricity_generation", "carbon_intensity_elec",
  "renewables_share_elec", "fossil_share_elec", "low_carbon_share_elec",
  "coal_electricity", "gas_electricity", "oil_electricity", "nuclear_electricity", "hydro_electricity",
  "solar_electricity", "wind_electricity", "biofuel_electricity", "other_renewable_electricity",
  "coal_share_elec", "gas_share_elec", "oil_share_elec", "nuclear_share_elec", "hydro_share_elec",
  "solar_share_elec", "wind_share_elec", "biofuel_share_elec", "other_renewables_share_elec"
];

export async function loadDashboardData() {
  const [energy, world] = await Promise.all([
    d3.csv("data/processed-energy-data.csv", row => parseEnergyRow(row)),
    d3.json("data/countries-110m.json")
  ]);

  const countryByNormalizedName = d3.rollup(
    energy.filter(d => d.iso_code),
    rows => rows[0],
    d => normalizeName(d.country)
  );

  const countries = Array.from(
    d3.rollup(energy, rows => rows.find(r => r.region) || rows[0], d => d.country).values()
  )
    .filter(d => d.country && d.iso_code)
    .map(d => ({ country: d.country, iso_code: d.iso_code, region: d.region || "" }))
    .sort((a, b) => d3.ascending(a.country, b.country));

  const countryMetaByName = new Map(countries.map(d => [d.country, d]));
  const regions = Array.from(new Set(countries.map(d => d.region).filter(Boolean))).sort(d3.ascending);

  const dataByCountry = d3.group(energy, d => d.country);
  for (const rows of dataByCountry.values()) rows.sort((a, b) => d3.ascending(a.year, b.year));

  const dataByCountryYear = new Map(energy.map(d => [`${d.country}|${d.year}`, d]));
  const dataByYear = d3.group(energy, d => d.year);
  const years = Array.from(new Set(energy.map(d => d.year))).sort(d3.ascending);

  const latestByCountryForRange = new Map();

  function latestCountryRecord(country, yearRange, requiredFields = []) {
    const key = `${country}|${yearRange[0]}|${yearRange[1]}|${requiredFields.join("+")}`;
    if (latestByCountryForRange.has(key)) return latestByCountryForRange.get(key);

    const rows = dataByCountry.get(country) || [];
    const match = [...rows]
      .reverse()
      .find(d =>
        d.year >= yearRange[0] &&
        d.year <= yearRange[1] &&
        requiredFields.every(field => Number.isFinite(d[field]))
      ) || null;

    latestByCountryForRange.set(key, match);
    return match;
  }

  function earliestCountryRecord(country, yearRange, requiredFields = []) {
    const rows = dataByCountry.get(country) || [];
    return rows.find(d =>
      d.year >= yearRange[0] &&
      d.year <= yearRange[1] &&
      requiredFields.every(field => Number.isFinite(d[field]))
    ) || null;
  }

  function countryMatchesRegion(country, selectedRegion) {
    if (!selectedRegion || selectedRegion === "All") return true;
    return countryMetaByName.get(country)?.region === selectedRegion;
  }

  function countriesForRegion(selectedRegion = "All") {
    return countries.filter(d => !selectedRegion || selectedRegion === "All" || d.region === selectedRegion);
  }

  function latestRowsForRange(yearRange, requiredFields = [], selectedRegion = "All") {
    return countriesForRegion(selectedRegion)
      .map(d => latestCountryRecord(d.country, yearRange, requiredFields))
      .filter(Boolean);
  }

  return {
    energy,
    world,
    countries,
    regions,
    countryMetaByName,
    dataByCountry,
    dataByCountryYear,
    dataByYear,
    years,
    countryByNormalizedName,
    countryMatchesRegion,
    countriesForRegion,
    latestCountryRecord,
    earliestCountryRecord,
    latestRowsForRange
  };
}

function parseEnergyRow(row) {
  const parsed = { ...row };
  for (const key of NUMERIC_COLUMNS) {
    parsed[key] = row[key] === "" || row[key] == null ? NaN : +row[key];
  }
  return parsed;
}