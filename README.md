# CAP6938 Final Project: Global Energy Transition Tracker

The Final Project for CAP6938 (Information Visualization) course offered in 2025-2026 Spring Semester at the University of Central Florida.

## Project option selected

**Project Option: Interactive Visualization Dashboard**

This project is an interactive, multi-view D3 dashboard for exploring how countries have shifted from fossil-fuel electricity generation toward renewable and lower-carbon electricity systems from 1990 to 2025.

## Live project link

**Hosted dashboard:** `https://sayanarman.github.io/CAP6938-Final-Project/`

## Dashboard goals

The goal of the Global Energy Transition Tracker is to help users explore and compare changes in national electricity systems over time. The dashboard focuses on renewable electricity share, electricity generation by source, GDP per capita, and electricity-sector carbon intensity.

The dashboard is designed to answer questions such as:

- Which countries currently generate a high share of electricity from renewable sources?
- How has a selected country's electricity mix changed from 1990 to 2025?
- Are countries reducing the carbon intensity of electricity while GDP per capita changes?
- How do countries in the same region compare?
- How do multiple selected countries compare across renewable share, fossil generation, total electricity generation, or carbon intensity?

## User tasks

The dashboard supports the following user tasks:

1. **Identify countries with high or low renewable electricity shares.**  
   Users can inspect the choropleth map to compare renewable electricity share across countries.

2. **Select a country for detailed exploration.**  
   Users can click a country on the map or choose one from the country dropdown to update the summary panel, electricity chart, and scatterplot trajectory.

3. **Clear a selected country and return to global exploration.**  
   Users can click the map background or click the selected country again to clear the country selection.

4. **Filter the dashboard by region.**  
   Region chips allow users to focus on Africa, Asia, Europe, North America, Oceania, South America, or all regions.

5. **Filter the dashboard by time period.**  
   The timeline brush lets users select a year range. The map, summary panel, electricity chart, scatterplot, and comparison views update based on the selected range.

6. **Explore a selected country's electricity mix over time.**  
   The stacked area chart shows electricity generation by source, including coal, gas, oil, nuclear, hydro, solar, wind, biofuel, and other renewables.

7. **Compare GDP per capita and electricity carbon intensity.**  
   The scatterplot shows countries by GDP per capita and carbon intensity of electricity. A selected country is shown as a trajectory across the brushed years.

8. **Zoom into dense or small areas.**  
   The map supports zooming and panning to inspect small countries or dense regions. The scatterplot supports zooming and panning to inspect dense clusters of countries.

9. **Compare multiple countries directly.**  
   Users can add multiple countries to comparison mode. The dashboard then shows a comparison table, multiple scatterplot trajectories, map outlines for compared countries, and a line chart comparing the selected metric over time.

10. **Change the comparison metric.**  
    In comparison mode, users can choose the metric shown in the line chart, such as renewable share, coal generation, gas generation, wind generation, total electricity generation, or carbon intensity.

## Visualizations and interactions

### 1. Choropleth map

The map shows countries colored by renewable share of electricity generation using the latest available value within the selected time range. Darker green indicates a higher renewable electricity share. Gray countries do not have available data for the selected range.

Supported interactions:

- **Click a country** to select it.
- **Click the selected country again** to clear the selection.
- **Click the ocean/background** to clear the selection.
- **Scroll to zoom** and **drag to pan** the map.
- **Double-click or use Reset map** to restore the world view.
- **Region filter** dims countries outside the selected region while preserving geographic context.
- **Comparison mode** outlines compared countries using matching colors.

How this supports user tasks:

- The map supports geographic comparison of renewable electricity share.
- Country selection links the map to the summary panel, electricity chart, and scatterplot.
- Map zoom helps users inspect small countries and dense regions.
- Region filtering helps users focus on a meaningful geographic subset.

### 2. Country summary panel

The summary panel shows country-level metrics for the selected country using the latest available values within the selected year range. Metrics include renewable share, electricity carbon intensity, electricity generation, GDP per capita, largest electricity source, and renewable-share change.

In comparison mode, the panel switches to a table that compares selected countries side by side.

How this supports user tasks:

- The summary panel provides quick quantitative details for a selected country.
- The comparison table makes it easier to directly compare countries across key indicators.
- Year labels below values clarify which year each metric comes from.

### 3. Electricity over time chart

In single-country mode, this chart is a stacked area chart showing the selected country's electricity generation by source over time.

In comparison mode, the chart switches to a line chart. Each line represents a selected comparison country, and users can choose the metric to compare.

Supported interactions:

- **Hover an energy source** in the single-country chart to highlight that source.
- **Hover Wind** to highlight wind-heavy countries on the map.
- **Use the comparison metric dropdown** to compare different variables across selected countries.
- **Tooltips** provide exact year, source, generation, share, country, and metric values.

How this supports user tasks:

- The stacked area chart shows how a country's electricity mix changes over time.
- The comparison line chart supports direct comparison of multiple countries.
- The metric selector lets users compare renewable share, fossil generation, low-carbon generation, total generation, and carbon intensity.

### 4. GDP per capita vs. carbon intensity scatterplot

The scatterplot shows countries by GDP per capita and carbon intensity of electricity. Each dot represents a country using the latest available data within the selected year range.

Supported interactions:

- **Hover dots** to see country-level values.
- **Click dots** to select countries.
- **Scroll to zoom** and **drag to pan** in dense areas.
- **Double-click or Reset zoom** returns to the full scatterplot view.
- In single-country mode, the selected country's trajectory is shown over time.
- In comparison mode, trajectories for multiple selected countries are shown in distinct colors.

How this supports user tasks:

- The scatterplot supports comparison between economic development and electricity-sector carbon intensity.
- Country trajectories help users see whether countries are moving toward lower-carbon electricity over time.
- Zooming supports detailed inspection of dense clusters.

### 5. Timeline brush

The timeline brush filters the entire dashboard by year range. Each vertical bar represents one year; taller bars indicate more country records are available for that year.

Supported interactions:

- **Drag the selected brush region** to move the time window.
- **Drag the brush handles** to resize the year range.
- **Reset years** restores the full 1990–2025 range.

How this supports user tasks:

- Users can focus on specific periods, such as 1990–2005 or 2015–2025.
- All coordinated views update based on the brushed years.
- The timeline helps users compare historical periods and recent transition patterns.

## How the views are coordinated

The dashboard uses shared state for country selection, comparison countries, selected region, selected year range, hovered energy source, map zoom, scatterplot zoom, and comparison metric.

Examples of coordinated behavior:

- Selecting a country on the map updates the summary panel, electricity chart, and scatterplot trajectory.
- Brushing the timeline updates the map, summary metrics, electricity chart, scatterplot dots, and comparison views.
- Selecting a region filters the country dropdown and scatterplot while dimming other regions on the map.
- Adding comparison countries changes the summary panel into a comparison table, adds colored map outlines, adds scatterplot trajectories, and changes the electricity chart into a comparison line chart.
- Hovering an energy source in the electricity chart highlights that source and can highlight related countries on the map.

## Data sources

The project uses public data from **Our World in Data (OWID)** and a public world map geometry file.

Main data files used:

- `owid-energy-data.csv`  
  Used as the main source for electricity generation, renewable share, carbon intensity, population, GDP, and electricity source fields.

- `gdp-per-capita-electricity.csv`  
  Used to supplement GDP per capita and OWID world-region information.

- `countries-110m.json`  
  World country geometry used for the choropleth map.

Additional downloaded OWID files were used during development and validation, including focused files for coal, gas, oil, hydro, nuclear, solar, wind, total electricity generation, renewable share, wind share, solar share, and carbon intensity.

The processed dashboard dataset is stored as:

```text
data/processed-energy-data.csv
```

This processed file combines and filters the necessary fields for browser-based visualization.

## Data processing

A preprocessing script was used to create a smaller dashboard-ready dataset from the raw OWID data files. The processed dataset:

- Keeps country-year records from 1990 to 2025.
- Removes OWID aggregate regions when appropriate.
- Keeps ISO country codes for joining data to the map.
- Adds or preserves region information.
- Keeps electricity generation, electricity share, GDP per capita, carbon intensity, and renewable-share metrics needed by the dashboard.

Preprocessing script:

```text
preprocess_energy_data.py
```

Generated output:

```text
data/processed-energy-data.csv
```

## How to run locally

Because the dashboard loads CSV and JSON files, it should be run through a local server rather than opened directly as a `file://` URL.

From the project folder, run:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Alternatively, the project can be opened with the VS Code Live Server extension.

## Project structure

```text
CAP6938-Final-Project/
├── index.html
├── README.md
├── css/
│   └── styles.css
├── js/
│   ├── main.js
│   ├── data.js
│   ├── map.js
│   ├── areaChart.js
│   ├── scatterPlot.js
│   ├── timeline.js
│   └── utils.js
└── data/
    ├── processed-energy-data.csv
    └── countries-110m.json
```

## Limitations

- Data availability varies by country and year, especially for earlier years and some smaller countries or territories.
- Some metrics use the latest available value within the selected year range rather than requiring data for the exact final year.
- The map uses country-level data and does not show subnational differences.
- Comparison mode is limited to a small number of countries to keep the visualization readable.
- Absolute electricity generation values are affected by country size and demand; users should interpret TWh comparisons differently from percentage-share comparisons.
- GDP per capita and electricity carbon intensity may come from different source series and may have different missing-data patterns.
- The dashboard focuses on electricity generation, not total primary energy consumption or all greenhouse gas emissions.

## Technologies used

- HTML
- CSS
- JavaScript
- D3.js
- TopoJSON client

## Future improvements

Possible future extensions include:

- Adding a map metric selector for latest renewable share versus change in renewable share.
- Adding annotations for major energy-policy or energy-crisis events.
- Supporting more advanced comparison layouts, such as small multiples.
- Adding export options for selected country comparisons.
- Improving mobile responsiveness for small screens.
