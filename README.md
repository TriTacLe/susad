# SusAD

A tool for drawing susad. Built for idatt2106 course and live at https://susad.netlify.app/

## Running locally

```bash
npm install
npm run dev
```

Goes up at `http://localhost:5173`. Open `examples/myapp.susad.json` to see what a finished diagram looks like.

## Usage

**Adding items** - hit the "+ Add item" button at the bottom of the canvas. Pick sector, ring, and polarity. The ID generates automatically.

**Connecting items** - select an item, click "Connect" in the right panel, then click the target. Esc cancels.

**Resizing cards** - select an item, drag any of the four corner handles. Opposite corner stays fixed.

**Scaling the diagram** - use the Scale slider in the toolbar. Moves all items outward/inward proportionally.

**Save/load** - Save writes a `.susad.json` file to disk. Open loads one back. State also auto-saves to localStorage between sessions.

## Keyboard shortcuts

| Key           | Action                       |
| ------------- | ---------------------------- |
| `Ctrl+S`      | Save                         |
| `Ctrl+Z`      | Undo                         |
| `Ctrl+Y`      | Redo                         |
| `Ctrl+C`      | Copy selected item           |
| `Ctrl+V`      | Paste                        |
| `Ctrl+D`      | Duplicate                    |
| `Delete`      | Remove selected item or edge |
| `Arrow keys`  | Nudge 1px                    |
| `Shift+Arrow` | Nudge 10px                   |
| `Esc`         | Cancel / deselect            |

## Export

- **SVG** - vector, paste straight into a report
- **PNG** - rasterized from the SVG via canvas
- **JSON** - full round-trip, includes positions and offsets

## File format

`.susad.json` files look like this:

```json
{
  "version": 1,
  "system": "MyApp",
  "locale": "no",
  "diagramScale": 1,
  "items": [
    {
      "id": "SI1",
      "code": "SI1",
      "label": "Increased engagement",
      "sector": "social",
      "ring": "immediate",
      "polarity": "positive",
      "dx": 0,
      "dy": 0
    }
  ],
  "edges": [{ "id": "edge-SI1-system", "from": "SI1", "to": "system" }]
}
```
