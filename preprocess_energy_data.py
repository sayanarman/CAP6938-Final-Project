#!/usr/bin/env python3
"""
Preprocess OWID data for the Global Energy Transition Tracker dashboard.

Put this file in your project root, keep your downloaded files in data/, then run:

    python preprocess_energy_data.py --data-dir data

It creates:

    data/processed-energy-data.csv

Required input files:
    data/owid-energy-data.csv
    data/gdp-per-capita-electricity.csv
"""

import argparse
import csv
import math
from pathlib import Path

OUTPUT_FIELDS = [
    "country",
    "iso_code",
    "year",
    "region",
    "population",
    "gdp",
    "gdp_per_capita",
    "electricity_generation",
    "carbon_intensity_elec",
    "renewables_share_elec",
    "fossil_share_elec",
    "low_carbon_share_elec",
    "coal_electricity",
    "gas_electricity",
    "oil_electricity",
    "nuclear_electricity",
    "hydro_electricity",
    "solar_electricity",
    "wind_electricity",
    "biofuel_electricity",
    "other_renewable_electricity",
    "coal_share_elec",
    "gas_share_elec",
    "oil_share_elec",
    "nuclear_share_elec",
    "hydro_share_elec",
    "solar_share_elec",
    "wind_share_elec",
    "biofuel_share_elec",
    "other_renewables_share_elec",
]

TEXT_FIELDS = {"country", "iso_code", "region"}


def is_country_code(code):
    """Keep real ISO-3 country/territory rows and remove OWID aggregate rows."""
    code = (code or "").strip()
    return len(code) == 3 and code.isalpha() and not code.startswith("OWID")


def to_float(value):
    value = (value or "").strip()
    if value == "":
        return None
    try:
        number = float(value)
    except ValueError:
        return None
    if math.isnan(number) or math.isinf(number):
        return None
    return number


def clean_number(value):
    if value is None:
        return ""
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        return f"{value:.6f}".rstrip("0").rstrip(".")
    return str(value)


def load_gdp_per_capita_and_region(gdp_file):
    """
    Returns:
      gdp_pc_by_code_year[(Code, Year)] = GDP per capita
      region_by_code[Code] = most recent OWID world region
    """
    gdp_pc_by_code_year = {}
    region_by_code = {}
    latest_region_year = {}

    if not gdp_file.exists():
        print(f"Warning: missing {gdp_file}; gdp_per_capita and region may be blank.")
        return gdp_pc_by_code_year, region_by_code

    with gdp_file.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            code = (row.get("Code") or "").strip()
            year_text = (row.get("Year") or "").strip()
            if not is_country_code(code) or not year_text.isdigit():
                continue

            year = int(year_text)
            gdp_pc = to_float(row.get("GDP per capita"))
            if gdp_pc is not None:
                gdp_pc_by_code_year[(code, year)] = gdp_pc

            region = (row.get("World region according to OWID") or "").strip()
            if region and (code not in latest_region_year or year > latest_region_year[code]):
                latest_region_year[code] = year
                region_by_code[code] = region

    return gdp_pc_by_code_year, region_by_code


def preprocess(data_dir, output_file, min_year, max_year):
    energy_file = data_dir / "owid-energy-data.csv"
    gdp_file = data_dir / "gdp-per-capita-electricity.csv"

    if not energy_file.exists():
        raise FileNotFoundError(f"Could not find {energy_file}")

    gdp_pc_lookup, region_lookup = load_gdp_per_capita_and_region(gdp_file)

    rows = []
    countries = set()
    years = set()

    with energy_file.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)

        for source_row in reader:
            code = (source_row.get("iso_code") or "").strip()
            year_text = (source_row.get("year") or "").strip()
            if not is_country_code(code) or not year_text.isdigit():
                continue

            year = int(year_text)
            if year < min_year:
                continue
            if max_year is not None and year > max_year:
                continue

            out = {}
            out["country"] = (source_row.get("country") or "").strip()
            out["iso_code"] = code
            out["year"] = year
            out["region"] = region_lookup.get(code, "")

            for field in OUTPUT_FIELDS:
                if field in TEXT_FIELDS or field in {"year", "gdp_per_capita"}:
                    continue
                out[field] = to_float(source_row.get(field))

            # Prefer GDP per capita from the dedicated OWID file.
            # Fall back to gdp / population when needed.
            gdp_pc = gdp_pc_lookup.get((code, year))
            if gdp_pc is None:
                gdp = out.get("gdp")
                population = out.get("population")
                if gdp is not None and population not in (None, 0):
                    gdp_pc = gdp / population
            out["gdp_per_capita"] = gdp_pc

            rows.append(out)
            countries.add(code)
            years.add(year)

    rows.sort(key=lambda row: (row["country"], row["year"]))
    output_file.parent.mkdir(parents=True, exist_ok=True)

    with output_file.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=OUTPUT_FIELDS)
        writer.writeheader()
        for row in rows:
            writer.writerow({field: clean_number(row.get(field)) for field in OUTPUT_FIELDS})

    latest_year = max(years) if years else "n/a"
    earliest_year = min(years) if years else "n/a"
    print(f"Wrote {len(rows)} rows to {output_file}")
    print(f"Countries/territories: {len(countries)}")
    print(f"Year range: {earliest_year}-{latest_year}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", type=Path, default=Path("data"))
    parser.add_argument("--out", type=Path, default=None)
    parser.add_argument("--min-year", type=int, default=1990)
    parser.add_argument("--max-year", type=int, default=None)
    args = parser.parse_args()

    output_file = args.out or args.data_dir / "processed-energy-data.csv"
    preprocess(args.data_dir, output_file, args.min_year, args.max_year)


if __name__ == "__main__":
    main()
