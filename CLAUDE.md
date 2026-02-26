# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Smart Report Designer is a React component library for creating "smart" Excel templates using GrapeCity SpreadJS. It allows users to define dynamic areas (Smart Components) on a spreadsheet that can be populated by AI or backend services.

## Development Commands

```bash
# Install dependencies
pnpm install

# Development server
pnpm dev

# Build library for distribution
pnpm build:lib

# Build demo application
pnpm build

# Lint code
pnpm lint

# Preview production build
pnpm preview
```

## Test Server

A local test server is available for testing template save/load functionality:

```bash
cd server
npm install
npm start
```

Server runs at `http://localhost:3001`. Set `VITE_API_BASE_URL=http://localhost:3001/api` in `.env.local` to use it.

## Architecture

### Core Data Model

```typescript
interface SmartComponent {
  id: string;             // UUID
  location: string;       // Excel range (e.g., "A1:B5")
  type: SmartComponentType; // 'Text' | 'Table' | 'Chart' | 'List' | 'Milestone' | 'Gantt' | 'Image' | 'Formula'
  prompt: string;         // AI generation instructions
  name: string;           // Display name
  shapeId?: string;       // SpreadJS shape ID
  style?: { backgroundColor?: string; borderColor?: string; textColor?: string; };
}
```

### Main Components

- **`SmartReportDesigner`** (`src/components/SmartReportDesigner.tsx`): Main orchestrating component. Manages SpreadJS instance, component state, shape synchronization, drag-and-drop, and conflict detection.

- **`SpreadDesigner`** (`src/components/SpreadDesigner.tsx`): Wrapper for SpreadJS Designer React component. Initializes SpreadJS with Chinese locale.

- **`ComponentLibrary`** (`src/components/ComponentLibrary.tsx`): Palette of draggable component types.

- **`ComponentList`** (`src/components/ComponentList.tsx`): List view of components on the sheet.

- **`PropertiesPanel`** (`src/components/PropertiesPanel.tsx`): Form for editing selected component properties.

### SpreadJS Integration

Components are visualized as shapes on the spreadsheet:
- **State → Sheet**: When components change, shapes are created/updated
- **Sheet → State**: When shapes are moved/resized, component locations update
- Uses SpreadJS Shapes API with dashed borders and semi-transparent fills
- Component type determines color (Text=blue, Table=green, Chart=orange, etc.)

### Exports

The library exports from `src/index.ts`:
- `SmartReportDesigner` - Main component
- `SpreadDesigner` - Spreadsheet component
- `ComponentLibrary`, `ComponentList`, `PropertiesPanel` - UI panels
- `setLicenseKey` - Set SpreadJS license keys
- `SmartComponent` type and helpers
- `exportExcel`, `importExcel` utilities from `excel-utils.ts`

### API Layer

`src/api/templateApi.ts` provides REST API functions:
- `saveTemplate(data)` - POST `/api/template` with FormData (Excel + JSON config)
- `loadTemplate(id)` - Fetches Excel + config from `/api/template/:id/excel` and `/api/template/:id/config`
- `getTemplateList()` - GET `/api/templates`
- `deleteTemplate(id)` - DELETE `/api/template/:id`

## Key Implementation Details

### Shape-Component Synchronization

The `SmartReportDesigner` maintains bidirectional sync:
1. `createShape()` - Creates SpreadJS shape for a component
2. Event handlers for `ShapeChanged`, `ShapeRemoved`, `ShapeSelectionChanged`
3. `snapToCell()` - Aligns shape positions to cell boundaries
4. `checkConflict()` - Prevents overlapping components

### Excel Export/Import

When exporting Excel:
1. Temporarily remove all shapes (via `clearAllShapes()`)
2. Export spreadsheet using ExcelIO
3. Restore shapes (via `restoreAllShapes()`)

This ensures exported Excel files don't contain the overlay shapes.

### Global API

The component exposes methods via `window.smartReportDesigner`:
- `getComponents()` - Get current component list
- `getSpread()` - Get SpreadJS workbook instance
- `getDesigner()` - Get designer instance
- `loadComponents(components)` - Load components from external source
- `exportCleanExcel()` - Export Excel without shapes
- `addComponent(comp)` - Programmatically add a component

## Important Notes

- SpreadJS requires a license key to remove watermarks. Use `setLicenseKey()` before rendering.
- The library treats React, React-DOM, and all SpreadJS packages as peer dependencies.
- Path alias `@/*` maps to `./src/*` (configured in tsconfig.json).