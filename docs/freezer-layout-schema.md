# Freezer Layout Schema

The freezer layout JSON describes this hierarchy:

Freezer → Shelves → Racks → 4 × 4 box slots → Boxes → 9 × 9 positions

The formal Draft 2020-12 JSON Schema is `src/models/freezer-layout.schema.json`.
It is the source of validation rules used when importing freezer layouts.
The TypeScript types are exposed through `src/models/freezerLayout.ts`.

## Top-level layout

A layout is an object with no additional properties. It must include:

| Property | Rule |
|---|---|
| `schemaVersion` | Required; exactly the string `"1.0"` |
| `id`, `name` | Required non-empty strings |
| `shelves` | Required array with at most 4 shelves |
| `samples` | Optional array of sample records |

Object-valued records also reject properties not listed by the schema. A
non-empty string has `minLength: 1`; whitespace is not trimmed by the schema.

## Shelves and racks

Each shelf requires a non-empty `id` and `name`, and a `racks` array containing
at most 6 racks (zero is allowed).

Each rack requires a non-empty `id` and `name`, and exactly 16 `boxSlots`.
`color` is optional and, when present, must be a six-digit hex color such as
`#2E9D50`. Each slot requires integer `row` and `column` values from 1 through
4. Its `box` may be omitted, set to `null`, or contain a box record.

## Boxes and positions

Each box requires a non-empty `id` and `name`, `rows: 9`, `columns: 9`, and a
`positions` array with at most 81 entries. Box `color` is optional and follows
the same hex-color rule as rack color.

A new box is created with all 81 positions (A1 to I9), each empty. Boxes saved
before this change may have fewer; the missing positions are added when a
layout is loaded, so the schema still accepts them.

Every position requires a non-empty `id` and `label`, and integer `row` and
`column` values from 1 through 9. `sampleId` is optional and must be a
non-empty string when present. A position with no `sampleId` is empty. Removing
a sample clears its `sampleId` and keeps the position.

## Samples

The optional top-level `samples` array contains records with required
non-empty `id` and `name` values and an optional `description` string.
Positions may carry a `sampleId` that identifies a stored sample. The schema
checks the shape and type of these fields, but does not enforce ID uniqueness,
coordinate uniqueness, or that a `sampleId` refers to an entry in `samples`.

## Sample layout

`src/data/sample-freezer-layout.json` is an example layout with id
`freezer-main` and name `Main Lab Freezer`. It contains one shelf, two racks
with 16 slots each, three populated boxes, and ten position records. Six of
those positions have `sampleId` values. The example omits the optional
top-level `samples` array.
