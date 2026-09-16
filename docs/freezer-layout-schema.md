# Freezer Layout Schema

The freezer simulator uses the following hierarchy:

Freezer → Shelves → Racks → Boxes → Positions

## Capacity Rules

| Container | Allowed Children |
|---|---|
| Freezer | Any number of shelves |
| Shelf | 0–4 racks |
| Rack | 0–16 boxes |
| Box | 0–81 positions |

## Freezer

A freezer has an ID, name, schema version, and a list of shelves.

## Shelf

Each shelf has an ID, name, and a list of racks.

## Rack

Each rack has an ID, name, and a list of boxes.

## Box

Each box has an ID, name, number of rows, number of columns, and a list of positions.

The initial version supports a maximum 9 × 9 grid.

## Position

Each position has:

- A unique ID
- A label such as A1
- A row number
- A column number
- An optional sample ID

An empty position does not need a sample ID.

The TypeScript definitions are located in `src/models/freezerLayout.ts`.

The formal JSON Schema is located in `src/models/freezer-layout.schema.json`.
