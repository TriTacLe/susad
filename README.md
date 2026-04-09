# SusAD Editor

Browser-based editor for Sustainability Awareness Diagrams (SusAD). Pentagon with 5 sustainability dimensions x 3 effect rings. Items are green (positive) or orange (negative) cards placed by sector and ring. Directed arrows connect items to each other or to the central system node.

## Stack

Vue 3 + Vite + TypeScript + Tailwind v4 + Pinia. No backend. Pure SPA. State auto-saves to localStorage.

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. Load `examples/myapp.susad.json` to see a sample diagram.

## File format

Files use `.susad.json` extension. Schema:

```ts
interface Diagram {
  version: 1
  system: string       // center node label
  locale: 'en' | 'no' // axis label language
  items: Item[]
  edges: Edge[]
}

interface Item {
  id: string           // stable identifier, e.g. "IE1"
  code: string         // display code, e.g. "IE1)"
  label: string
  sector: 'social' | 'individual' | 'technical' | 'economic' | 'environmental'
  ring: 'immediate' | 'enabling' | 'structural'
  polarity: 'positive' | 'negative'
  dx: number           // manual offset from slot center (px)
  dy: number
}

interface Edge {
  id: string
  from: string         // item id or "system"
  to: string           // item id or "system"
}
```

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+S` | Save |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+C` | Copy selected item |
| `Ctrl+V` | Paste item |
| `Ctrl+D` | Duplicate selected item |
| `Delete` | Delete selected item or edge |
| `Arrow keys` | Nudge selected item 1px |
| `Shift+Arrow` | Nudge 10px |
| `Esc` | Cancel connect mode / deselect |

## Scripts

```bash
npm run dev          # dev server
npm run build        # typecheck + production build
npm run type-check   # tsc only
npm run lint         # eslint src/
npm run test:unit    # vitest
```

## Connect flow

1. Select an item in the canvas or inspector.
2. Click "Connect" in the inspector.
3. Click the target item or the system node.
4. Arrow appears. Press Esc to cancel.

## Export

- **SVG**: File > SVG. Embeds all diagram content, suitable for reports.
- **PNG**: File > PNG. Rasterizes the SVG via canvas.
- **JSON**: Save button. Full round-trip format, includes positions.

## Locale

Toggle EN/NO in the toolbar. Only axis labels switch. Item content is unchanged.
