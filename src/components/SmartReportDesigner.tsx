import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import GC from '@grapecity/spread-sheets';
import '@grapecity/spread-sheets-shapes';
import '@grapecity/spread-sheets-charts';
import '@grapecity/spread-sheets/styles/gc.spread.sheets.excel2013white.css';
import * as ExcelIO from '@grapecity/spread-excelio';

// Import SpreadJS Designer component
import { SpreadDesigner } from './SpreadDesigner';

import { SmartComponent, DefaultColors } from '../types/SmartComponent';
import { ComponentLibrary } from './ComponentLibrary';
import { ComponentList } from './ComponentList';
import { PropertiesPanel } from './PropertiesPanel';
import type {
  SmartReportDesignerHandle,
  SmartReportExcelSource,
  SmartReportTemplateConfig,
  SmartReportTemplateExportPayload,
  SmartReportTemplateLoadPayload,
} from '../lib/smart-report-designer-api';
import { Download, Layers, Upload, FileSpreadsheet } from 'lucide-react';

const colLetterToIndex = (letters: string): number => {
  let result = 0;
  for (let i = 0; i < letters.length; i++) {
    result = result * 26 + (letters.charCodeAt(i) - 64);
  }
  return result - 1;
};

const colIndexToLetter = (index: number): string => {
  let result = '';
  let n = index + 1;
  while (n > 0) {
    const remainder = (n - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
};

const DefaultSizeMap: Record<string, { rows: number; cols: number }> = {
  Text: { rows: 1, cols: 2 },
  Table: { rows: 4, cols: 5 },
  Chart: { rows: 3, cols: 4 },
  List: { rows: 4, cols: 3 },
  Milestone: { rows: 2, cols: 2 },
  GanttChart: { rows: 4, cols: 6 },
  Image: { rows: 3, cols: 3 },
  Formula: { rows: 1, cols: 2 },
  Gantt: { rows: 4, cols: 6 },
};

const TypeNames: Record<string, string> = {
  Text: '文本',
  Table: '表格',
  Chart: '图表',
  List: '列表',
  Milestone: '里程碑',
  GanttChart: '甘特表',
  Image: '图片',
  Formula: '公式',
  Gantt: '甘特表',
};

const EXCEL_FILE_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const base64ToUint8Array = (value: string): Uint8Array => {
  const matches = value.match(/^data:.*?;base64,(.*)$/);
  const base64 = matches?.[1] ?? value;
  const normalized = base64.replace(/\s/g, '');
  const binary = window.atob(normalized);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
};

const normalizeExcelSourceToFile = (source: SmartReportExcelSource): File => {
  if (source instanceof File) {
    return source;
  }

  if (source instanceof Blob) {
    return new File([source], 'template.xlsx', { type: source.type || EXCEL_FILE_MIME });
  }

  if (source instanceof ArrayBuffer) {
    return new File([source], 'template.xlsx', { type: EXCEL_FILE_MIME });
  }

  if (ArrayBuffer.isView(source)) {
    return new File([source], 'template.xlsx', { type: EXCEL_FILE_MIME });
  }

  if (typeof source === 'string') {
    return new File([base64ToUint8Array(source)], 'template.xlsx', { type: EXCEL_FILE_MIME });
  }

  throw new Error('不支持的 Excel 数据格式');
};

export interface SmartReportDesignerProps {
  /** 初始组件列表 */
  initialComponents?: SmartComponent[];
  /** 组件变更回调 */
  onComponentsChange?: (components: SmartComponent[]) => void;
  /** 选中组件变更回调 */
  onSelectComponent?: (component: SmartComponent | null) => void;
  /** SpreadJS 就绪回调 */
  onSpreadReady?: (workbook: GC.Spread.Sheets.Workbook, designer: any) => void;
  /** 导出配置回调 */
  onExport?: (config: { component_list: SmartComponent[] }) => void;
  /** 自定义头部标题 */
  title?: React.ReactNode;
  /** 自定义右侧面板 */
  customRightPanel?: React.ReactNode;
  /** 是否隐藏组件库 */
  hideComponentLibrary?: boolean;
  /** 是否隐藏组件列表 */
  hideComponentList?: boolean;
  /** 是否隐藏属性面板 */
  hidePropertiesPanel?: boolean;
  /** 是否隐藏导入导出按钮 */
  hideImportExport?: boolean;
  /** 右侧面板宽度 */
  rightPanelWidth?: number;
  /** 额外的头部操作按钮 */
  extraHeaderActions?: React.ReactNode;
  /** 冲突警告回调 */
  onConflict?: (message: string) => void;
  /** 样式类名 */
  className?: string;
  /** 样式 */
  style?: React.CSSProperties;
  /** 导出 Excel 回调 */
  onExportExcel?: (blob: Blob) => void;
  /** 导入 Excel 回调，返回组件列表 */
  onImportExcel?: (blob: Blob) => Promise<SmartComponent[]> | SmartComponent[];
  /** 设计器 API 就绪回调 */
  onApiReady?: (api: SmartReportDesignerHandle) => void;
}

export function SmartReportDesigner({
  initialComponents = [],
  onComponentsChange,
  onSelectComponent,
  onSpreadReady,
  onExport,
  title = 'SmartReport',
  customRightPanel,
  hideComponentLibrary = false,
  hideComponentList = false,
  hidePropertiesPanel = false,
  hideImportExport = true,
  rightPanelWidth = 340,
  extraHeaderActions,
  onConflict,
  className = '',
  style,
  onExportExcel,
  onImportExcel,
  onApiReady,
}: SmartReportDesignerProps) {
  const [spread, setSpread] = useState<GC.Spread.Sheets.Workbook | null>(null);
  const [components, setComponents] = useState<SmartComponent[]>(initialComponents);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggingType, setDraggingType] = useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const shapesRef = useRef<Map<string, GC.Spread.Sheets.Shapes.Shape>>(new Map());
  const componentMapRef = useRef<Map<string, SmartComponent>>(new Map());
  const designerRef = useRef<any>(null);
  const isInternalSelectionRef = useRef(false);
  const createdShapesRef = useRef<Set<string>>(new Set());
  const updatingComponentRef = useRef<Set<string>>(new Set());
  const spreadRef = useRef<GC.Spread.Sheets.Workbook | null>(null);
  const componentsRef = useRef<SmartComponent[]>([]);
  const syncingShapeRef = useRef(false);
  const lastSelectionRef = useRef<{ sheetName: string; range: { row: number; col: number; rowCount: number; colCount: number } } | null>(null);

  // Sync refs with current state
  useEffect(() => {
    spreadRef.current = spread;
  }, [spread]);

  useEffect(() => {
    componentsRef.current = components;
  }, [components]);

  // Notify parent of component changes
  useEffect(() => {
    onComponentsChange?.(components);
  }, [components, onComponentsChange]);

  // Notify parent of selection changes
  useEffect(() => {
    const selected = components.find(c => c.id === selectedId) || null;
    onSelectComponent?.(selected);
  }, [selectedId, components, onSelectComponent]);

  // Designer initialization callback
  const handleWorkbookReady = useCallback((workbook: GC.Spread.Sheets.Workbook, designer: any) => {
    designerRef.current = designer;
    setSpread(workbook);
    onSpreadReady?.(workbook, designer);
  }, [onSpreadReady]);

  const normalizeComponentCollection = useCallback((
    input: SmartReportTemplateLoadPayload['components']
  ): SmartComponent[] => {
    if (!input) {
      return [];
    }

    let parsed: unknown = input;

    if (typeof input === 'string') {
      parsed = JSON.parse(input);
    }

    const componentList = Array.isArray(parsed)
      ? parsed
      : (parsed && typeof parsed === 'object' && Array.isArray((parsed as SmartReportTemplateConfig).component_list)
        ? (parsed as SmartReportTemplateConfig).component_list
        : null);

    if (!componentList) {
      throw new Error('组件 JSON 格式错误，缺少 component_list 或数组内容');
    }

    return componentList.map((comp) => ({
      id: comp.id || uuidv4(),
      location: comp.location,
      type: comp.type,
      prompt: comp.prompt || '',
      semantic_description: comp.semantic_description || (comp as SmartComponent & { name?: string }).name || '',
      style: comp.style,
      data_example: comp.data_example,
      data_source: comp.data_source,
      shapeId: comp.shapeId,
    }));
  }, []);

  const parseRange = useCallback((location: string): { row: number; col: number; rowCount: number; colCount: number } | null => {
    try {
      const match = location.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
      if (!match) {
        const singleMatch = location.match(/^([A-Z]+)(\d+)$/i);
        if (singleMatch) {
          const col = colLetterToIndex(singleMatch[1].toUpperCase());
          const row = parseInt(singleMatch[2]) - 1;
          return { row, col, rowCount: 1, colCount: 1 };
        }
        return null;
      }
      const startCol = colLetterToIndex(match[1].toUpperCase());
      const startRow = parseInt(match[2]) - 1;
      const endCol = colLetterToIndex(match[3].toUpperCase());
      const endRow = parseInt(match[4]) - 1;
      return { row: startRow, col: startCol, rowCount: endRow - startRow + 1, colCount: endCol - startCol + 1 };
    } catch { return null; }
  }, []);

  const rangeToLocation = useCallback((row: number, col: number, rowCount: number, colCount: number): string => {
    const startCol = colIndexToLetter(col);
    const endCol = colIndexToLetter(col + colCount - 1);
    return `${startCol}${row + 1}:${endCol}${row + rowCount}`;
  }, []);

  const normalizeSelectionRange = useCallback((selection: GC.Spread.Sheets.Range | null | undefined) => {
    if (!selection) return null;
    if (selection.rowCount <= 0 || selection.colCount <= 0) return null;
    return { row: selection.row, col: selection.col, rowCount: selection.rowCount, colCount: selection.colCount };
  }, []);

  const isDefaultSelectionRange = useCallback((range: { row: number; col: number; rowCount: number; colCount: number } | null | undefined) => {
    return !!range && range.row === 0 && range.col === 0 && range.rowCount === 1 && range.colCount === 1;
  }, []);

  const getSelectionRange = useCallback((): { row: number; col: number; rowCount: number; colCount: number } | null => {
    if (!spread) return null;
    try {
      const sheet = spread.getActiveSheet();
      if (!sheet) return null;
      const selections = sheet.getSelections();
      if (!selections || selections.length === 0) return null;
      return normalizeSelectionRange(selections[0]);
    } catch { return null; }
  }, [spread, normalizeSelectionRange]);

  const checkConflict = useCallback((newRange: { row: number; col: number; rowCount: number; colCount: number }, excludeId?: string): boolean => {
    for (const comp of componentsRef.current) {
      if (excludeId && comp.id === excludeId) continue;
      const existing = parseRange(comp.location);
      if (!existing) continue;
      const overlap = !(
        newRange.row + newRange.rowCount <= existing.row ||
        newRange.row >= existing.row + existing.rowCount ||
        newRange.col + newRange.colCount <= existing.col ||
        newRange.col >= existing.col + existing.colCount
      );
      if (overlap) return true;
    }
    return false;
  }, [parseRange]);

  const syncShapeToRange = useCallback((
    shape: GC.Spread.Sheets.Shapes.Shape,
    range: { row: number; col: number; rowCount: number; colCount: number },
    sheetArg?: GC.Spread.Sheets.Worksheet | null
  ) => {
    const sheet = sheetArg ?? spreadRef.current?.getActiveSheet();
    if (!sheet) return;
    const endRow = range.row + range.rowCount;
    const endCol = range.col + range.colCount;

    syncingShapeRef.current = true;
    try {
      shape.startRow(range.row);
      shape.startColumn(range.col);
      shape.startRowOffset(0);
      shape.startColumnOffset(0);
      shape.endRow(endRow);
      shape.endColumn(endCol);
      shape.endRowOffset(0);
      shape.endColumnOffset(0);
      shape.dynamicMove(true);
      shape.dynamicSize(true);
    } finally {
      window.setTimeout(() => {
        syncingShapeRef.current = false;
      }, 0);
    }
  }, []);

  const getSheetZoom = useCallback((sheet: GC.Spread.Sheets.Worksheet | null | undefined): number => {
    if (!sheet) return 1;
    const zoom = Number(sheet.zoom());
    return Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  }, []);

  const getAxisPosition = useCallback((
    sheet: GC.Spread.Sheets.Worksheet,
    axis: 'row' | 'col',
    index: number,
    offset: number
  ): number => {
    const safeIndex = Math.max(0, index);
    let position = Number.isFinite(offset) ? offset : 0;

    for (let i = 0; i < safeIndex; i++) {
      position += axis === 'row' ? sheet.getRowHeight(i) : sheet.getColumnWidth(i);
    }

    return Math.max(0, position);
  }, []);

  const snapPositionToLineIndex = useCallback((
    sheet: GC.Spread.Sheets.Worksheet,
    axis: 'row' | 'col',
    position: number
  ): number => {
    const count = axis === 'row' ? sheet.getRowCount() : sheet.getColumnCount();
    if (count <= 0) return 0;
    if (position <= 0) return 0;

    let acc = 0;
    for (let i = 0; i < count; i++) {
      const size = axis === 'row' ? sheet.getRowHeight(i) : sheet.getColumnWidth(i);
      const next = acc + size;
      if (position <= next) {
        return position - acc <= next - position ? i : i + 1;
      }
      acc = next;
    }

    return count;
  }, []);

  const snapShapeToRange = useCallback((shape: GC.Spread.Sheets.Shapes.Shape) => {
    const sheet = spreadRef.current?.getActiveSheet();
    if (!sheet) return { row: 0, col: 0, rowCount: 1, colCount: 1 };

    const maxRows = Math.max(sheet.getRowCount(), 1);
    const maxCols = Math.max(sheet.getColumnCount(), 1);

    const startRowPos = getAxisPosition(sheet, 'row', Number(shape.startRow()), Number(shape.startRowOffset()));
    const endRowPos = getAxisPosition(sheet, 'row', Number(shape.endRow()), Number(shape.endRowOffset()));
    const startColPos = getAxisPosition(sheet, 'col', Number(shape.startColumn()), Number(shape.startColumnOffset()));
    const endColPos = getAxisPosition(sheet, 'col', Number(shape.endColumn()), Number(shape.endColumnOffset()));

    let startRowLine = snapPositionToLineIndex(sheet, 'row', startRowPos);
    let endRowLine = snapPositionToLineIndex(sheet, 'row', endRowPos);
    let startColLine = snapPositionToLineIndex(sheet, 'col', startColPos);
    let endColLine = snapPositionToLineIndex(sheet, 'col', endColPos);

    startRowLine = Math.min(Math.max(0, startRowLine), maxRows - 1);
    startColLine = Math.min(Math.max(0, startColLine), maxCols - 1);
    endRowLine = Math.min(Math.max(startRowLine + 1, endRowLine), maxRows);
    endColLine = Math.min(Math.max(startColLine + 1, endColLine), maxCols);

    return {
      row: startRowLine,
      col: startColLine,
      rowCount: Math.max(1, endRowLine - startRowLine),
      colCount: Math.max(1, endColLine - startColLine),
    };
  }, [getAxisPosition, snapPositionToLineIndex]);

  const createShape = useCallback((component: SmartComponent) => {
    if (createdShapesRef.current.has(component.id)) {
      return;
    }

    if (!spread) return;
    const sheet = spread.getActiveSheet();
    if (!sheet) return;

    const range = parseRange(component.location);
    if (!range) return;

    const borderColor = component.style?.borderColor || DefaultColors[component.type]?.border || '#9ca3af';
    const bgColor = DefaultColors[component.type]?.bg || 'rgba(156, 163, 175, 0.2)';

    try {
      const shape = sheet.shapes.add(
        component.id,
        GC.Spread.Sheets.Shapes.AutoShapeType.rectangle,
        0, 0, 1, 1
      );

      const style = shape.style();
      style.fill = { type: GC.Spread.Sheets.Shapes.ShapeFillType.solid, color: bgColor };
      style.line = {
        color: borderColor,
        width: 2,
        dashStyle: GC.Spread.Sheets.Shapes.PresetLineDashStyle.dash
      };
      style.textEffect = { color: borderColor, font: '12px Arial' };
      shape.style(style);
      shape.text(component.semantic_description);
      shape.allowMove(true);
      shape.allowResize(true);
      syncShapeToRange(shape, range, sheet);

      shapesRef.current.set(component.id, shape);
      componentMapRef.current.set(component.id, component);
      createdShapesRef.current.add(component.id);
    } catch (e) {
      console.error('创建形状失败:', e);
    }
  }, [spread, parseRange, syncShapeToRange]);

  const removeShape = useCallback((id: string) => {
    if (!spread) return;
    const sheet = spread.getActiveSheet();
    if (!sheet) return;
    if (shapesRef.current.has(id)) {
      try {
        sheet.shapes.remove(id);
      } catch {
        // Ignore missing shapes during async updates.
      }
      shapesRef.current.delete(id);
      componentMapRef.current.delete(id);
      createdShapesRef.current.delete(id);
    }
  }, [spread]);

  const snapToCell = useCallback((x: number, y: number, width: number, height: number) => {
    if (!spreadRef.current) return { row: 0, col: 0, rowCount: 1, colCount: 1 };
    const sheet = spreadRef.current.getActiveSheet();
    const zoom = getSheetZoom(sheet);
    const normalizedX = x / zoom;
    const normalizedY = y / zoom;
    const normalizedWidth = width / zoom;
    const normalizedHeight = height / zoom;
    const maxCols = Math.max(sheet.getColumnCount(), 1);
    const maxRows = Math.max(sheet.getRowCount(), 1);

    let accX = 0;
    let col = 0;
    while (col < maxCols) {
      const colWidth = sheet.getColumnWidth(col);
      if (normalizedX >= accX && normalizedX < accX + colWidth) {
        break;
      }
      accX += colWidth;
      col++;
    }
    if (col >= maxCols) col = maxCols - 1;

    let accY = 0;
    let row = 0;
    while (row < maxRows) {
      const rowHeight = sheet.getRowHeight(row);
      if (normalizedY >= accY && normalizedY < accY + rowHeight) {
        break;
      }
      accY += rowHeight;
      row++;
    }
    if (row >= maxRows) row = maxRows - 1;

    let accW = 0;
    let colCount = 0;
    let c = col;
    while (accW < normalizedWidth && c < maxCols) {
      accW += sheet.getColumnWidth(c);
      colCount++;
      c++;
    }
    if (colCount === 0) colCount = 1;

    let accH = 0;
    let rowCount = 0;
    let r = row;
    while (accH < normalizedHeight && r < maxRows) {
      accH += sheet.getRowHeight(r);
      rowCount++;
      r++;
    }
    if (rowCount === 0) rowCount = 1;

    return { row, col, rowCount, colCount };
  }, [getSheetZoom]);

  const selectedIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  // 事件处理器定义（提取为独立函数以便复用）
  const createEventHandlers = useCallback(() => {
    const handleSelectionChanged = (_: unknown, args: GC.Spread.Sheets.ISelectionChangedEventArgs) => {
      const nextRange = normalizeSelectionRange(args.newSelections?.[0]);
      if (!nextRange) return;
      if (isDefaultSelectionRange(nextRange) && (!args.oldSelections || args.oldSelections.length === 0)) {
        return;
      }
      lastSelectionRef.current = {
        sheetName: args.sheetName,
        range: nextRange,
      };
    };

    const handleShapeChanged = (_: unknown, args: { shape: GC.Spread.Sheets.Shapes.Shape }) => {
      if (!args.shape) return;
      if (syncingShapeRef.current) return;
      const shapeId = args.shape.name();

      try {
        const snapped = snapShapeToRange(args.shape);
        const newLocation = rangeToLocation(snapped.row, snapped.col, snapped.rowCount, snapped.colCount);
        syncShapeToRange(args.shape, snapped);

        const comp = componentMapRef.current.get(shapeId);
        if (comp) {
          const updates: Partial<SmartComponent> = {};
          let hasChanges = false;

          // 位置变化
          if (comp.location !== newLocation) {
            const hasConflict = checkConflict(snapped, shapeId);
            if (hasConflict) {
              const msg = '区域与现有组件冲突';
              setConflictWarning(msg);
              onConflict?.(msg);
              setTimeout(() => setConflictWarning(null), 3000);
            }
            updates.location = newLocation;
            hasChanges = true;
          }

          // 文字变化
          const newText = args.shape.text();
          if (newText !== comp.semantic_description) {
            updates.semantic_description = newText;
            hasChanges = true;
          }

          if (hasChanges) {
            const updatedComp = { ...comp, ...updates };
            setComponents(prev => prev.map(c => c.id === shapeId ? updatedComp : c));
            componentMapRef.current.set(shapeId, updatedComp);
          }
        }
      } catch (e) {
        console.error('[ShapeChanged] 错误:', e);
      }
    };

    const handleShapeRemoved = () => {
      if (!spreadRef.current) return;
      const sheet = spreadRef.current.getActiveSheet();
      if (!sheet) return;

      const allShapes = sheet.shapes.all();
      const currentShapeIds = new Set(allShapes.map((s: GC.Spread.Sheets.Shapes.Shape) => s.name()));

      shapesRef.current.forEach((_, id) => {
        if (!currentShapeIds.has(id) && !updatingComponentRef.current.has(id)) {
          setComponents(prev => prev.filter(c => c.id !== id));
          shapesRef.current.delete(id);
          componentMapRef.current.delete(id);
          createdShapesRef.current.delete(id);
        }
      });
    };

    const handleShapeSelectionChanged = (_: unknown, args: { shape?: GC.Spread.Sheets.Shapes.Shape }) => {
      if (isInternalSelectionRef.current) return;

      if (!spreadRef.current) return;
      const sheet = spreadRef.current.getActiveSheet();
      if (!sheet) return;

      const allShapes = sheet.shapes.all();
      const currentShapeIds = new Set(allShapes.map((s: GC.Spread.Sheets.Shapes.Shape) => s.name()));

      const deletedIds: string[] = [];
      shapesRef.current.forEach((_, id) => {
        if (!currentShapeIds.has(id) && !updatingComponentRef.current.has(id)) {
          deletedIds.push(id);
        }
      });

      if (deletedIds.length > 0) {
        deletedIds.forEach(id => {
          shapesRef.current.delete(id);
          componentMapRef.current.delete(id);
          createdShapesRef.current.delete(id);
          setComponents(prev => prev.filter(c => c.id !== id));
        });
      }

      if (args.shape) {
        const shapeId = args.shape.name();
        if (componentMapRef.current.has(shapeId) && shapesRef.current.has(shapeId)) {
          setSelectedId(shapeId);
        }
      } else {
        if (selectedIdRef.current && shapesRef.current.has(selectedIdRef.current)) {
          setSelectedId(null);
        }
      }
    };

    return { handleSelectionChanged, handleShapeChanged, handleShapeRemoved, handleShapeSelectionChanged };
  }, [normalizeSelectionRange, isDefaultSelectionRange, snapShapeToRange, rangeToLocation, checkConflict, onConflict, syncShapeToRange]);

  // 绑定事件到 sheet
  const bindSheetEvents = useCallback(() => {
    if (!spreadRef.current) return;

    const sheet = spreadRef.current.getActiveSheet();
    if (!sheet) return;

    const handlers = createEventHandlers();

    try {
      // 先解绑旧的事件（避免重复绑定）
      sheet.unbind(GC.Spread.Sheets.Events.SelectionChanged);
      sheet.unbind(GC.Spread.Sheets.Events.ShapeChanged);
      sheet.unbind(GC.Spread.Sheets.Events.ShapeRemoved);
      sheet.unbind(GC.Spread.Sheets.Events.ShapeSelectionChanged);

      // 绑定新的事件
      sheet.bind(GC.Spread.Sheets.Events.SelectionChanged, handlers.handleSelectionChanged);
      sheet.bind(GC.Spread.Sheets.Events.ShapeChanged, handlers.handleShapeChanged);
      sheet.bind(GC.Spread.Sheets.Events.ShapeRemoved, handlers.handleShapeRemoved);
      sheet.bind(GC.Spread.Sheets.Events.ShapeSelectionChanged, handlers.handleShapeSelectionChanged);
    } catch (e) {
      console.error('[EventBinding] 绑定事件失败:', e);
    }

    return () => {
      try {
        sheet.unbind(GC.Spread.Sheets.Events.SelectionChanged, handlers.handleSelectionChanged);
        sheet.unbind(GC.Spread.Sheets.Events.ShapeChanged, handlers.handleShapeChanged);
        sheet.unbind(GC.Spread.Sheets.Events.ShapeRemoved, handlers.handleShapeRemoved);
        sheet.unbind(GC.Spread.Sheets.Events.ShapeSelectionChanged, handlers.handleShapeSelectionChanged);
      } catch {
        // Ignore cleanup failures when the active sheet has already changed.
      }
    };
  }, [createEventHandlers]);

  // 处理 Designer 的文件加载完成事件
  const handleFileLoaded = useCallback(() => {
    // 更新 spreadRef
    if (spread) {
      spreadRef.current = spread;
    }

    // 清除旧的 shape 引用（因为 Excel 已经被替换）
    shapesRef.current.clear();
    createdShapesRef.current.clear();
    lastSelectionRef.current = null;

    // 延迟重新绑定事件并重新创建 shapes
    setTimeout(() => {
      bindSheetEvents();

      // 重新创建所有组件的 shapes
      const currentComponents = componentsRef.current;
      if (currentComponents.length > 0) {
        currentComponents.forEach((comp: SmartComponent) => {
          createShape(comp);
        });
      }
    }, 200);
  }, [spread, bindSheetEvents, createShape]);

  // Bind events to sheet
  useEffect(() => {
    if (!spread) return;

    // 初始绑定
    const cleanup = bindSheetEvents();

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spread]);

  useEffect(() => {
    if (!spread) return;

    const sheet = spread.getActiveSheet();
    if (!sheet) return;

    components.forEach(comp => {
      componentMapRef.current.set(comp.id, comp);
      const existingShape = shapesRef.current.get(comp.id);
      const range = parseRange(comp.location);

      if (existingShape && range) {
        syncShapeToRange(existingShape, range, sheet);
        return;
      }

      createShape(comp);
    });
  }, [spread, components, createShape, parseRange, syncShapeToRange]);

  useEffect(() => {
    if (!spread) return;

    isInternalSelectionRef.current = true;

    shapesRef.current.forEach((shape) => {
      try {
        shape.isSelected(false);
      } catch {
        // Ignore selection sync issues while shapes are being recreated.
      }
    });

    if (selectedId) {
      const shape = shapesRef.current.get(selectedId);
      if (shape) {
        try {
          shape.isSelected(true);
        } catch {
          // Ignore selection sync issues while shapes are being recreated.
        }
      }
    }

    setTimeout(() => {
      isInternalSelectionRef.current = false;
    }, 100);
  }, [spread, selectedId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setDraggingType(null);

    if (!spread) return;
    const componentType = e.dataTransfer.getData('componentType');
    if (!componentType) return;

    const sheet = spread.getActiveSheet();
    if (!sheet) {
      console.error('无法获取活动 sheet');
      return;
    }

    const designerHost =
      e.currentTarget.parentElement?.querySelector('.gc-spread-sheets') ||
      document.querySelector('.gc-spread-sheets') ||
      document.querySelector('.designer') ||
      document.querySelector('.ss-viewport');

    const rect = designerHost?.getBoundingClientRect();
    if (!rect) return;

    const rememberedSelection = lastSelectionRef.current?.sheetName === sheet.name()
      ? lastSelectionRef.current.range
      : null;
    const currentSelection = getSelectionRange();
    const selection = rememberedSelection ?? (
      currentSelection && !isDefaultSelectionRange(currentSelection)
        ? currentSelection
        : null
    );
    let targetRange: { row: number; col: number; rowCount: number; colCount: number };

    if (selection && selection.rowCount > 0 && selection.colCount > 0) {
      targetRange = selection;
    } else {
      const dropX = e.clientX - rect.left;
      const dropY = e.clientY - rect.top;
      const defaultSize = DefaultSizeMap[componentType] || { rows: 2, cols: 2 };
      const hitInfo = typeof spread.hitTest === 'function' ? spread.hitTest(dropX, dropY) : null;
      const worksheetHit = hitInfo?.worksheetHitInfo;

      if (
        worksheetHit?.hitTestType === GC.Spread.Sheets.SheetArea.viewport &&
        typeof worksheetHit.row === 'number' &&
        worksheetHit.row >= 0 &&
        typeof worksheetHit.col === 'number' &&
        worksheetHit.col >= 0
      ) {
        targetRange = {
          row: worksheetHit.row,
          col: worksheetHit.col,
          rowCount: defaultSize.rows,
          colCount: defaultSize.cols,
        };
      } else {
        const zoom = getSheetZoom(sheet);
        const normalizedX = dropX / zoom;
        const normalizedY = dropY / zoom;
        const maxCols = Math.max(sheet.getColumnCount(), 1);
        const maxRows = Math.max(sheet.getRowCount(), 1);

        let accX = 0;
        let col = 0;
        while (col < maxCols) {
          const colWidth = sheet.getColumnWidth(col);
          if (normalizedX < accX + colWidth) break;
          accX += colWidth;
          col++;
        }
        if (col >= maxCols) col = maxCols - 1;

        let accY = 0;
        let row = 0;
        while (row < maxRows) {
          const rowHeight = sheet.getRowHeight(row);
          if (normalizedY < accY + rowHeight) break;
          accY += rowHeight;
          row++;
        }
        if (row >= maxRows) row = maxRows - 1;

        targetRange = { row, col, rowCount: defaultSize.rows, colCount: defaultSize.cols };
      }
    }

    if (checkConflict(targetRange)) {
      const msg = '区域与现有组件冲突';
      setConflictWarning(msg);
      onConflict?.(msg);
      setTimeout(() => setConflictWarning(null), 3000);
      return;
    }

    const location = rangeToLocation(targetRange.row, targetRange.col, targetRange.rowCount, targetRange.colCount);

    const newComp: SmartComponent = {
      id: uuidv4(),
      location,
      type: componentType as SmartComponent['type'],
      prompt: '',
      semantic_description: `${TypeNames[componentType] || componentType} ${components.length + 1}`,
    };

    setComponents(prev => [...prev, newComp]);
    setSelectedId(newComp.id);
    setTimeout(() => createShape(newComp), 50);
  }, [spread, components.length, createShape, checkConflict, getSelectionRange, getSheetZoom, isDefaultSelectionRange, onConflict, rangeToLocation]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleUpdateComponent = useCallback((updated: SmartComponent) => {
    const oldComp = componentMapRef.current.get(updated.id);

    if (oldComp && oldComp.location !== updated.location) {
      const newRange = parseRange(updated.location);
      if (newRange && checkConflict(newRange, updated.id)) {
        const msg = '区域与现有组件冲突';
        setConflictWarning(msg);
        onConflict?.(msg);
        setTimeout(() => setConflictWarning(null), 3000);
        return;
      }
    }

    setComponents(prev => prev.map(c => c.id === updated.id ? updated : c));
    componentMapRef.current.set(updated.id, updated);

    updatingComponentRef.current.add(updated.id);
    removeShape(updated.id);
    setTimeout(() => {
      createShape(updated);
      updatingComponentRef.current.delete(updated.id);
    }, 50);
  }, [createShape, removeShape, checkConflict, onConflict, parseRange]);

  const handleDeleteComponent = useCallback((id: string) => {
    removeShape(id);
    setComponents(prev => prev.filter(c => c.id !== id));
    setSelectedId(null);
  }, [removeShape]);

  const handleExport = useCallback(() => {
    const config = {
      template_id: '',
      version: '',
      component_list: components.map(({ id, location, type, prompt, semantic_description, style, data_example, data_source }) => ({
        id, location, type, prompt, semantic_description, style, data_example, data_source
      }))
    };
    onExport?.(config);

    // Download as file
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template-config.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [components, onExport]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // 清除所有 shapes（用于导出 Excel）
  const clearAllShapes = useCallback(() => {
    if (!spread) return;
    const sheet = spread.getActiveSheet();
    if (!sheet) return;

    // 临时保存 shapes 以便后续恢复
    const shapeData: { id: string; component: SmartComponent }[] = [];
    shapesRef.current.forEach((_, id) => {
      const comp = componentMapRef.current.get(id);
      if (comp) {
        shapeData.push({ id, component: comp });
      }
      try {
        sheet.shapes.remove(id);
      } catch (e) {
        console.error('移除 shape 失败:', e);
      }
    });
    shapesRef.current.clear();
    componentMapRef.current.clear();
    createdShapesRef.current.clear();

    return shapeData;
  }, [spread]);

  // 恢复所有 shapes
  const restoreAllShapes = useCallback((shapeData: { id: string; component: SmartComponent }[]) => {
    if (!spread) return;

    shapeData.forEach(({ component }) => {
      createShape(component);
    });
  }, [spread, createShape]);

  // 导出 Excel
  const handleExportExcel = useCallback(async () => {
    if (!spread) {
      alert('SpreadJS 尚未初始化');
      return;
    }

    try {
      // 1. 临时移除所有 shapes
      const shapeData = clearAllShapes();

      // 2. 导出 Excel
      const excelIO = new (ExcelIO as any).IO();
      const json = spread.toJSON();

      excelIO.save(json, (blob: Blob) => {
        // 3. 触发回调
        if (onExportExcel) {
          onExportExcel(blob);
        }

        // 4. 下载文件
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'template.xlsx';
        a.click();
        URL.revokeObjectURL(url);

        // 5. 恢复 shapes
        if (shapeData && shapeData.length > 0) {
          setTimeout(() => {
            restoreAllShapes(shapeData);
          }, 100);
        }
      }, (error: any) => {
        console.error('导出 Excel 失败:', error);
        alert('导出 Excel 失败: ' + (error?.errorMessage || '未知错误'));

        // 错误时也要恢复 shapes
        if (shapeData && shapeData.length > 0) {
          restoreAllShapes(shapeData);
        }
      });
    } catch (error) {
      console.error('导出 Excel 失败:', error);
      alert('导出 Excel 失败');
    }
  }, [spread, clearAllShapes, restoreAllShapes, onExportExcel]);

  // Excel 文件输入引用
  const excelFileInputRef = useRef<HTMLInputElement>(null);

  // 导入 Excel
  const handleImportExcel = useCallback(() => {
    excelFileInputRef.current?.click();
  }, []);

  // API 方法 - 允许外部调用
  const getComponents = useCallback(() => componentsRef.current, []);
  const getSpread = useCallback(() => spreadRef.current, []);
  const getDesigner = useCallback(() => designerRef.current, []);
  const setSelectedComponent = useCallback((id: string | null) => setSelectedId(id), []);
  const clearComponents = useCallback(() => {
    componentsRef.current.forEach(comp => removeShape(comp.id));
    setComponents([]);
    setSelectedId(null);
  }, [removeShape]);

  // 加载外部组件（用于从后端恢复）
  const loadComponents = useCallback((newComponents: SmartComponent[]) => {
    // 1. 清除现有组件和 shapes
    componentsRef.current.forEach(comp => removeShape(comp.id));
    shapesRef.current.clear();
    componentMapRef.current.clear();
    createdShapesRef.current.clear();
    lastSelectionRef.current = null;

    // 2. 更新 spreadRef（确保指向最新的 spread）
    if (spread) {
      spreadRef.current = spread;
    }

    // 3. 设置新组件
    setComponents(newComponents);
    setSelectedId(null);

    // 4. 延迟创建 shapes（等待 ActiveSheetChanged 事件触发后再创建）
    setTimeout(() => {
      newComponents.forEach((comp: SmartComponent) => {
        createShape(comp);
      });
    }, 200);
  }, [removeShape, createShape, spread]);

  const buildExportConfig = useCallback((componentList: SmartComponent[] = componentsRef.current): SmartReportTemplateConfig => ({
    template_id: '',
    version: '',
    component_list: componentList.map(({ id, location, type, prompt, semantic_description, style, data_example, data_source }) => ({
      id,
      location,
      type,
      prompt,
      semantic_description,
      style,
      data_example,
      data_source,
    })),
  }), []);

  const loadWorkbookFromExcelSource = useCallback(async (excelSource: SmartReportExcelSource): Promise<void> => {
    const currentSpread = spreadRef.current;
    if (!currentSpread) {
      throw new Error('SpreadJS 尚未初始化');
    }

    const file = normalizeExcelSourceToFile(excelSource);
    const excelIO = new (ExcelIO as any).IO();

    await new Promise<void>((resolve, reject) => {
      excelIO.open(file, (json: any) => {
        componentsRef.current.forEach(comp => {
          removeShape(comp.id);
        });
        shapesRef.current.clear();
        componentMapRef.current.clear();
        createdShapesRef.current.clear();
        lastSelectionRef.current = null;

        currentSpread.fromJSON(json);
        spreadRef.current = currentSpread;

        setTimeout(() => {
          bindSheetEvents();
          resolve();
        }, 100);
      }, (error: any) => {
        reject(new Error(error?.errorMessage || '加载 Excel 失败'));
      });
    });
  }, [bindSheetEvents, removeShape]);

  // 导出干净的 Excel（不含 shapes）
  const exportCleanExcel = useCallback(async (): Promise<Blob> => {
    if (!spread) {
      throw new Error('SpreadJS 尚未初始化');
    }

    return new Promise((resolve, reject) => {
      // 暂停 SpreadJS 事件，避免触发状态更新
      spread.suspendEvent();

      // 1. 临时移除所有 shapes
      const shapeData = clearAllShapes();

      // 2. 导出 Excel
      const excelIO = new (ExcelIO as any).IO();
      const json = spread.toJSON();

      // 使用 Promise 包装 excelIO.save
      const savePromise = new Promise<Blob>((res, rej) => {
        excelIO.save(json, (blob: Blob) => {
          res(blob);
        }, (error: any) => {
          rej(error);
        });
      });

      // 恢复事件
      spread.resumeEvent();

      savePromise.then((blob: Blob) => {
        // 3. 恢复 shapes 后再 resolve（确保 shapes 完全恢复后再继续执行保存逻辑）
        if (shapeData && shapeData.length > 0) {
          setTimeout(() => {
            restoreAllShapes(shapeData);
            resolve(blob);
          }, 50);
        } else {
          resolve(blob);
        }
      }, (error: any) => {
        // 错误时也要恢复 shapes
        if (shapeData && shapeData.length > 0) {
          restoreAllShapes(shapeData);
        }
        reject(error);
      });
    });
  }, [spread, clearAllShapes, restoreAllShapes]);

  const loadTemplateData = useCallback(async ({
    excelFile,
    components: rawComponents,
  }: SmartReportTemplateLoadPayload): Promise<void> => {
    if (excelFile) {
      await loadWorkbookFromExcelSource(excelFile);
    }

    if (rawComponents !== undefined) {
      const nextComponents = normalizeComponentCollection(rawComponents);
      loadComponents(nextComponents);
    } else if (excelFile) {
      loadComponents([]);
    }
  }, [loadWorkbookFromExcelSource, loadComponents, normalizeComponentCollection]);

  const exportTemplateData = useCallback(async (): Promise<SmartReportTemplateExportPayload> => {
    const excelFile = await exportCleanExcel();
    const exportedComponents = [...componentsRef.current];

    return {
      excelFile,
      components: exportedComponents,
      config: buildExportConfig(exportedComponents),
    };
  }, [buildExportConfig, exportCleanExcel]);

  const rebindEvents = useCallback(() => {
    if (spreadRef.current) {
      bindSheetEvents();
    }
  }, [bindSheetEvents]);

  const addComponent = useCallback((comp: Omit<SmartComponent, 'id'>) => {
    const newComp = { ...comp, id: uuidv4() };
    setComponents(prev => [...prev, newComp]);
    setTimeout(() => createShape(newComp), 50);
    return newComp;
  }, [createShape]);

  const debug = useCallback(() => {
    const currentSpread = spreadRef.current;

    console.log('[DEBUG] 当前状态:', {
      spread: !!currentSpread,
      spreadRef: !!spreadRef.current,
      activeSheet: currentSpread ? !!currentSpread.getActiveSheet() : null,
      components: componentsRef.current.length,
      shapesRefSize: shapesRef.current.size,
      componentMapSize: componentMapRef.current.size,
      createdShapesSize: createdShapesRef.current.size,
      selectedId: selectedIdRef.current,
    });

    if (currentSpread) {
      const sheet = currentSpread.getActiveSheet();
      if (sheet) {
        console.log('[DEBUG] Sheet 信息:', {
          name: sheet.name(),
          rowCount: sheet.getRowCount(),
          colCount: sheet.getColumnCount(),
          shapesCount: sheet.shapes.all().length,
        });
      }
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const config = JSON.parse(content);

        if (!config.component_list || !Array.isArray(config.component_list)) {
          alert('配置文件格式错误：缺少 component_list 字段');
          return;
        }

        const importedComponents = normalizeComponentCollection(config);
        loadComponents(importedComponents);
      } catch (error) {
        console.error('导入配置失败:', error);
        alert('导入失败：配置文件格式错误');
      }
    };
    reader.readAsText(file);

    e.target.value = '';
  }, [loadComponents, normalizeComponentCollection]);

  const handleExcelFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await loadTemplateData({
        excelFile: file,
        components: onImportExcel ? await Promise.resolve(onImportExcel(file)) : [],
      });
    } catch (error) {
      console.error('导入 Excel 失败:', error);
      alert('导入 Excel 失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }

    e.target.value = '';
  }, [loadTemplateData, onImportExcel]);

  const selectedComponent = useMemo(() => {
    return components.find(c => c.id === selectedId) || null;
  }, [components, selectedId]);

  // Expose methods via ref if needed
  useEffect(() => {
    if (!spread) {
      return;
    }

    const api: SmartReportDesignerHandle = {
      getComponents,
      getSpread,
      getDesigner,
      setSelectedComponent,
      clearComponents,
      loadComponents,
      loadTemplateData,
      exportCleanExcel,
      exportTemplateData,
      rebindEvents,
      addComponent,
      exportExcel: handleExportExcel,
      importExcel: handleImportExcel,
      debug,
    };

    (window as any).smartReportDesigner = api;
    onApiReady?.(api);

    return () => {
      if ((window as any).smartReportDesigner === api) {
        delete (window as any).smartReportDesigner;
      }
    };
  }, [
    addComponent,
    clearComponents,
    debug,
    exportCleanExcel,
    exportTemplateData,
    getComponents,
    getDesigner,
    getSpread,
    handleExportExcel,
    handleImportExcel,
    loadComponents,
    loadTemplateData,
    onApiReady,
    rebindEvents,
    setSelectedComponent,
    spread,
  ]);

  return (
    <div className={`flex h-screen w-screen overflow-hidden bg-gray-100 ${className}`} style={style}>
      {/* Left: SpreadJS Designer */}
      <div className="flex-1 flex flex-col relative">
        <SpreadDesigner
          onWorkbookReady={handleWorkbookReady}
          onFileLoaded={handleFileLoaded}
          styleInfo={{ height: '100%', width: '100%' }}
        />
        {/* Drop zone overlay */}
        <div
          className={`absolute inset-0 pointer-events-none transition-all ${isDragging ? 'ring-4 ring-blue-400 ring-inset' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          style={{ pointerEvents: isDragging ? 'auto' : 'none' }}
        />
      </div>

      {/* Right Panel */}
      <div
        className="h-full flex flex-col bg-gray-50 border-l border-gray-200"
        style={{ width: rightPanelWidth }}
      >
        {/* Header */}
        <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {extraHeaderActions}
            {!hideImportExport && (
              <>
                <button
                  onClick={handleImport}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                  title="导入配置 (JSON)"
                >
                  <Upload size={14} />
                  导入配置
                </button>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                  title="导出配置 (JSON)"
                >
                  <Download size={14} />
                  导出配置
                </button>
                <button
                  onClick={handleImportExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
                  title="导入 Excel"
                >
                  <FileSpreadsheet size={14} />
                  导入 Excel
                </button>
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm"
                  title="导出 Excel"
                >
                  <FileSpreadsheet size={14} />
                  导出 Excel
                </button>
              </>
            )}
          </div>
        </div>

        {!hideImportExport && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              ref={excelFileInputRef}
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={handleExcelFileChange}
              className="hidden"
            />
          </>
        )}

        {/* Custom Right Panel Content */}
        {customRightPanel ? (
          customRightPanel
        ) : (
          <>
            {/* Component Library */}
            {!hideComponentLibrary && (
              <ComponentLibrary
                onDragStart={(type) => { setIsDragging(true); setDraggingType(type); }}
                onDragEnd={() => { setIsDragging(false); setDraggingType(null); }}
              />
            )}

            {/* Component List */}
            {!hideComponentList && (
              <div className="border-b border-gray-200 bg-white">
                <div className="px-4 py-2 flex items-center justify-between border-b border-gray-100">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    组件列表 ({components.length})
                  </span>
                </div>
                <div className="max-h-[200px] overflow-y-auto">
                  <ComponentList
                    components={components}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                  />
                </div>
              </div>
            )}

            {/* Properties Panel */}
            {!hidePropertiesPanel && (
              <PropertiesPanel
                component={selectedComponent}
                onUpdate={handleUpdateComponent}
                onDelete={handleDeleteComponent}
                conflictWarning={conflictWarning}
              />
            )}
          </>
        )}
      </div>

      {/* Drag Preview Overlay */}
      {isDragging && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium">
            在画布上放置 {TypeNames[draggingType || ''] || draggingType} 组件
          </div>
        </div>
      )}
    </div>
  );
}

export default SmartReportDesigner;
