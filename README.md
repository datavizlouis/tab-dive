# What is Tableau DIVE — Dashboard Inspector & Viz Explorer

DIVE is a lightweight, client-side React application that parses and visualises the internals of a Tableau workbook (`.twb`) file. It is also **_vibed coded using Claude_** through multiple iterations with my SME knowledge on how Tableau works. Everything runs entirely in your browser — no data is ever uploaded to a server, no account is required, and no installation is needed. Whether you're a Tableau developer inheriting a messy workbook, a data analyst auditing calculations, or a BI lead reviewing dashboard structure, DIVE gives you a clear, interactive window into what's actually inside your workbook.

---

## Features at a Glance

| Tab | What it does |
|---|---|
| **Overview** | High-level summary of the entire workbook |
| **Datasources** | Schema, tables, joins, and field inventory |
| **Fields** | Full field list with lineage graph |
| **Dashboards** | Visual layout tree with object inspector |
| **Worksheets** | Shelf-by-shelf breakdown of every chart |
| **Issues** | Automated audit for common workbook problems |

---

## Getting Started

### Option 1 — Use it in the browser
Drop your `.twb` file onto the upload area or click **Choose File**. DIVE will parse and render the workbook instantly.

> ⚠️ Only unpackaged `.twb` files are supported. If you have a `.twbx` file, rename it to `.zip`, extract it, and use the `.twb` file inside.

### Option 2 — Load the sample workbook
Click **"or load a sample workbook →"** on the landing page to explore a pre-built demo with multiple datasources, dashboards, worksheets, and seeded issues.

---

## Tab-by-Tab Functionality

### ⬡ Overview

The landing tab after a workbook is loaded. Provides a four-card summary:

- **Issues** — counts of duplicate calculations, unused fields, and unused parameters. Each row is clickable and navigates directly to the relevant section of the Issues tab.
- **Fields** — total field count broken down into Native Fields, Calculations, and Parameters. Each row navigates to the filtered Fields tab.
- **Data Sources** — lists every datasource with its connection type, server/file path, and field count. Clicking a datasource navigates to its detail view.
- **Structure** — lists all dashboards and worksheets with one-click navigation to their respective tabs.

---

### 🗄 Datasources

Detailed view of every datasource in the workbook.

**Sidebar**
- Select any datasource from the left panel to load its details.
- Shows field count and table count per datasource.

**Detail panel**
- **Connection metadata** — connection type (e.g. `hyper`, `excel-direct`, `sqlserver`), server or file path, and database name.
- **Schema view** — if the datasource uses physical tables, each table is shown with its columns listed. Join relationships between tables are displayed inline with join type badges (`INNER`, `LEFT`, `RIGHT`, `FULL`).
- **Custom SQL** — if the datasource uses a custom SQL query, it is shown in a collapsible code block.
- **Field sections** — if no table schema is available, fields are grouped into Dimensions, Measures, and Calculations.
- **Clickable fields** — clicking any field or column navigates directly to that field in the Fields tab with its lineage graph open.

---

### ≡ Fields & Lineage

A searchable, filterable inventory of every field and parameter in the workbook, with an interactive lineage explorer.

**Filters**
- **Search** — searches across field names and calculation formulas simultaneously.
- **Datasource filter** — narrow the list to fields from a specific datasource.
- **Field type filter** — filter by Native Fields, Calculations, or Parameters.
- **Sort** — sort by usage count (descending), A→Z, or Z→A.

**Field list**
- Each row shows the field name, datasource, formula (if a calculation), usage count (how many worksheets use it), datatype badge, and any quality flags.
- A coloured left border appears on hover, colour-coded by field role (blue = dimension, green = measure, amber = calculation, purple = parameter).
- Hover over any row to see a floating tooltip with full formula, field type, and a list of worksheets it appears in.

**Lineage graph**
- Click any field to open its lineage diagram.
- The diagram shows three columns: **depends on** (upstream fields), **selected** (the current field), and **used by** (downstream calculations and consumers).
- Hover any node to see its tooltip.
- Click any calculation node to navigate to its own lineage.
- Click **← Return** to go back to the field list.

---

### ▦ Dashboards

Visual representation of dashboard layout with an interactive object inspector.

> ⚠️ Only **tiled** containers are supported. Floating objects and containers are not rendered.

**Dashboard picker**
- Switch between dashboards using the pill buttons at the top.
- Each dashboard shows its canvas dimensions and chart count.

**Visual layout**
- The dashboard layout is rendered as a nested tree of containers and objects.
- Containers are colour-coded by depth level (blue → purple → cyan → amber → green → pink).
- Horizontal containers show `↔ Horizontal`, vertical containers show `↕ Vertical`.
- Leaf objects (worksheets, filters, text, images, legends, parameters) are colour-coded by type.
- Fixed-size containers show a 📌 pin badge.

**Object inspector**
- Click any object in the layout to inspect it in the right-hand panel.
- Shows the object type, fixed dimensions, outer margin, inner padding, and visual properties (border colour, border style, border width, background colour).
- Container objects also show a list of their direct children.
- **Worksheet objects** show a "View in Worksheets →" button that navigates directly to that sheet in the Worksheets tab.

---

### 📄 Worksheets

Shelf-by-shelf breakdown of every worksheet in the workbook.

**Datasource filter**
- Filter the worksheet list to only show sheets that use a specific datasource.

**Worksheet sidebar**
- Each worksheet is shown as a card with its name, chart type badge, and datasource.
- The selected worksheet is highlighted in accent blue.

**Detail view**
- **Chart Type** — shows the mark type (Bar, Line, Map, Text Table, etc.) with its icon and internal class name.
- **Columns shelf** — fields placed on the Columns shelf, with aggregation functions shown (e.g. `SUM(Sales)`).
- **Rows shelf** — fields placed on the Rows shelf, with aggregation functions shown.
- **Filters** — all filters applied to the worksheet.
- **Marks card** — encoding channels used (Color, Size, Label, Detail, Tooltip, Path) and the fields assigned to each.
- Measure fields are shown in blue pills, dimension fields in green pills.

---

### ⚑ Issues

Automated audit of common workbook health problems.

**Summary cards**
- Three clickable summary cards show the count of each issue type at a glance.
- Clicking a card expands its accordion section.

**Duplicate Calculations**
- Detects calculations that have identical formulas, even if they have different names or live in different datasources.
- Groups duplicates together so you can identify consolidation opportunities.

**Unused Fields**
- Lists every field that does not appear in any worksheet's rows, columns, filters, marks, or calculated field dependencies.
- Includes hidden fields and calculations that are defined but never referenced.

**Unused Parameters**
- Lists parameters that are not referenced in any calculation or filter across the workbook.

---

## Field Quality Flags

DIVE automatically detects and flags the following field quality issues throughout the UI:

| Flag | Meaning |
|---|---|
| `auto-named` | Field has an internal Tableau-generated name (e.g. `Calculation_1048576`) and was never given a proper caption |
| `copy` | Field name contains `(copy)`, indicating it was duplicated in Tableau but never renamed |
| `ambiguous` | Two or more datasources contain a field with the same caption, which can cause confusion in cross-datasource analysis |

---

## Project Structure

```
dive/
├── index.html           # App shell
├── package.json         # Dependencies and scripts
├── vite.config.js       # Vite configuration
└── src/
    ├── main.jsx         # React entry point
    ├── App.jsx          # Full application (single-file component)
    └── index.css        # Design system CSS variables and base styles
```

---

## Assumptions & UX Modifications

DIVE makes a number of deliberate interpretation decisions when parsing `.twb` files. These are places where the raw XML is ambiguous, inconsistent across Tableau versions, or would produce a poor user experience if shown literally.

---

### Field Names & Captions

**Assumption:** Tableau stores fields internally with bracket-wrapped technical names (e.g. `[Calculation_1048576]`, `[sum:Sales:qk]`). DIVE always prefers the human-readable `caption` attribute over the internal `name` attribute wherever available.

**Why:** Internal field names are meaningless to the end user. Showing `Calculation_1048576` in the field list instead of its caption would make the tool unusable for large workbooks.

---

### Parameter Name Substitution in Formulas

**Assumption:** Tableau stores parameter references in calculation formulas using internal names (e.g. `[Parameters].[Parameter 1]`) rather than the display caption the user assigned.

**Modification:** DIVE rewrites all parameter references in formulas to use their human-readable captions before displaying them. This means a formula like `SUM([Sales]) * [Parameters].[Discount Rate]` is shown as `SUM([Sales]) * [Discount Rate]`, matching what the user sees in Tableau Desktop.

---

### Lineage Graph Construction

**Assumption:** Tableau does not store an explicit field dependency graph in the `.twb` file. Dependencies must be inferred.

**Modification:** DIVE builds the lineage graph at parse time by scanning each calculation's formula for bracket-wrapped field references and resolving them against the full field registry. This produces a directed dependency graph that powers the lineage visualisation. Only direct (one-hop) dependencies and consumers are shown — multi-hop chain tracing is not currently visualised in a single view.

---

### Tiled-Only Dashboard Rendering

**Assumption:** Tableau dashboards support both tiled and floating layout modes. Floating objects do not carry reliable positional metadata in the zone hierarchy in a way that maps cleanly to a relative layout tree.

**Modification:** DIVE only renders tiled containers and objects. Floating objects are silently excluded from the visual layout. A warning banner is displayed on the Dashboard tab to make this limitation explicit to the user.

---

### Worksheet Zone Matching by Name, Not Type

**Assumption:** Rather than relying on the `type` attribute to identify whether a zone corresponds to a worksheet, DIVE matches zones to worksheets by checking whether the zone's `name` or `param` attribute exists in the known list of worksheet names.

**Why:** Type attributes are unreliable across Tableau versions. Name-based matching is version-agnostic and produces accurate results for the "View in Worksheets →" navigation button and the chart count badge on the Dashboard tab.

---

### Dashboard Chart Count

**Assumption:** The `sheetsUsed` list pre-computed during XML parsing was found to be unreliable for some Tableau versions due to the zone type issue described above.

**Modification:** DIVE recomputes the chart count at render time by walking the full zone hierarchy and matching zone names against the known worksheet list — bypassing the pre-parsed count entirely. This ensures the badge always reflects the true number of chart objects in the layout.

---

## Author

**Louis Yu**
- 🌐 [datavizlouis.webflow.io](https://datavizlouis.webflow.io/)
- 💼 [linkedin.com/in/yulouis](https://www.linkedin.com/in/yulouis/)
- 📊 [Tableau Public](https://public.tableau.com/app/profile/louisyu/vizzes)
- ✉️ datavizlouis@outlook.com
