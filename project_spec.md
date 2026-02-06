# Project Specification: SpreadJS Template Editor (SmartReport)

## 1. Project Overview
**SmartReport** is a web-based application for creating "smart" Excel templates. It integrates GrapeCity's SpreadJS to provide a full-featured spreadsheet interface where users can define "Smart Components". These components represent dynamic areas (like tables, charts, text) that are intended to be populated by an AI or backend service in a later stage.

## 2. Technical Stack
- **Framework:** React 18 (with Vite)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Spreadsheet Engine:** GrapeCity SpreadJS (v17+)
- **UI Components:** Radix UI (Primitives), Lucide React (Icons)
- **State Management:** React local state (useState, useRef)
- **Data Validation:** Zod (available in dependencies, though usage not explicit in reviewed files)

## 3. Core Architecture

### 3.1 Data Model
The central entity is the `SmartComponent`.

```typescript
interface SmartComponent {
  id: string;             // UUID
  location: string;       // Excel Range (e.g., "A1:B5")
  type: ComponentType;    // 'Text' | 'Table' | 'Chart' | 'Image' | 'Formula'
  prompt: string;         // Instructions for AI generation
  name: string;           // Display name
  style?: {
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
  };
}
```

### 3.2 Main Components
- **`App.tsx`**: The controller. Manages the SpreadJS instance, component state, conflict detection, and shape synchronization.
- **`ComponentLibrary`**: A palette of available component types. Supports drag-and-drop.
- **`ComponentList`**: A list view of all components on the sheet. Allows selection.
- **`PropertiesPanel`**: A form to edit the selected component's properties (Name, Type, Location, Prompt).

### 3.3 SpreadJS Integration
- **Initialization**: Configures SpreadJS with features like drag-drop, resizing, and scrollbars.
- **Visual Markers**: Uses `SpreadJS Shapes` (transparent rectangles with dashed borders) to overlay the "Smart Components" on the grid.
- **Bi-directional Sync**:
    - **State -> Sheet**: When `components` state changes, shapes are created/updated on the sheet.
    - **Sheet -> State**: When a shape is moved/resized by the user, the `SmartComponent.location` is updated.
- **Events**: Listens to `ShapeChanged`, `ShapeRemoved`, `ShapeSelectionChanged` to keep state in sync.

## 4. Features

### 4.1 Component Management
- **Add Component**:
    - **Drag & Drop**: Drag a type from the library to the canvas.
    - **Selection**: Dragging onto a selected range uses that range.
    - **Auto-Snap**: Components snap to cell boundaries.
- **Edit Component**:
    - Resize/Move the shape on the canvas.
    - Edit properties in the right panel.
- **Delete Component**: Via the panel or by deleting the shape.

### 4.2 Conflict Detection
- Prevents components from overlapping.
- Visual warning ("Area conflicts with existing component") if a move/resize results in overlap.

### 4.3 Persistence
- **Auto-save**: Components are saved to `localStorage` every 30 seconds.
- **Export**: Generates a JSON file containing the template configuration.

## 5. UI/UX Design
- **Layout**:
    - Left (Flex-1): SpreadJS Canvas.
    - Right (340px): Sidebar containing Library, List, and Properties.
- **Visuals**:
    - Distinct colors for different component types (Blue for Text, Green for Table, Orange for Chart, etc.).
    - Clean, modern interface using Tailwind CSS.
    - Icons from Lucide React.

## 6. Deployment & Licensing
- **License**: Requires a valid GrapeCity SpreadJS license key.
- **Environment**: Client-side application, deployable as a static site.

## 7. Future Considerations (Inferred)
- **AI Integration**: The `prompt` field suggests a backend process will use these definitions to generate content.
- **Validation**: Ensure `location` strings are always valid ranges.
- **Advanced Styling**: More customization for component appearance.
