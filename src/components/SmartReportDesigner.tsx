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
import { Download, Layers, Upload, FileSpreadsheet } from 'lucide-react';

// License key - can be set from outside
export const setLicenseKey = (sheetsLicenseKey: string, designerLicenseKey: string) => {
  (GC.Spread.Sheets as any).LicenseKey = sheetsLicenseKey;
  (GC.Spread.Sheets as any).Designer.LicenseKey = designerLicenseKey;
};

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
  Gantt: { rows: 4, cols: 6 },
  Image: { rows: 3, cols: 3 },
  Formula: { rows: 1, cols: 2 },
};

const TypeNames: Record<string, string> = {
  Text: '文本',
  Table: '表格',
  Chart: '图表',
  List: '列表',
  Milestone: '里程碑',
  Gantt: '甘特表',
  Image: '图片',
  Formula: '公式',
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

  const parseRange = (location: string): { row: number; col: number; rowCount: number; colCount: number } | null => {
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
  };

  const rangeToLocation = (row: number, col: number, rowCount: number, colCount: number): string => {
    const startCol = colIndexToLetter(col);
    const endCol = colIndexToLetter(col + colCount - 1);
    return `${startCol}${row + 1}:${endCol}${row + rowCount}`;
  };

  const getSelectionRange = (): { row: number; col: number; rowCount: number; colCount: number } | null => {
    if (!spread) return null;
    try {
      const sheet = spread.getActiveSheet();
      if (!sheet) return null;
      const selections = sheet.getSelections();
      if (!selections || selections.length === 0) return null;
      const sel = selections[0];
      if (!sel || sel.rowCount <= 0 || sel.colCount <= 0) return null;
      return { row: sel.row, col: sel.col, rowCount: sel.rowCount, colCount: sel.colCount };
    } catch { return null; }
  };

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
  }, []);

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

    let x = 0, y = 0, width = 0, height = 0;
    for (let i = 0; i < range.col; i++) x += sheet.getColumnWidth(i);
    for (let i = 0; i < range.row; i++) y += sheet.getRowHeight(i);
    for (let i = 0; i < range.colCount; i++) width += sheet.getColumnWidth(range.col + i);
    for (let i = 0; i < range.rowCount; i++) height += sheet.getRowHeight(range.row + i);

    try {
      const shape = sheet.shapes.add(
        component.id,
        GC.Spread.Sheets.Shapes.AutoShapeType.rectangle,
        x, y, width, height
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
      shape.text(component.name);
      shape.allowMove(true);
      shape.allowResize(true);

      shapesRef.current.set(component.id, shape);
      componentMapRef.current.set(component.id, component);
      createdShapesRef.current.add(component.id);
    } catch (e) {
      console.error('创建形状失败:', e);
    }
  }, [spread]);

  const removeShape = useCallback((id: string) => {
    if (!spread) return;
    const sheet = spread.getActiveSheet();
    if (!sheet) return;
    if (shapesRef.current.has(id)) {
      try { sheet.shapes.remove(id); } catch {}
      shapesRef.current.delete(id);
      componentMapRef.current.delete(id);
      createdShapesRef.current.delete(id);
    }
  }, [spread]);

  const snapToCell = useCallback((x: number, y: number, width: number, height: number) => {
    if (!spreadRef.current) return { row: 0, col: 0, rowCount: 1, colCount: 1 };
    const sheet = spreadRef.current.getActiveSheet();

    let accX = 0, col = 0;
    while (col < 100) {
      const colWidth = sheet.getColumnWidth(col);
      if (x >= accX && x < accX + colWidth) {
        break;
      }
      accX += colWidth;
      col++;
    }

    let accY = 0, row = 0;
    while (row < 100) {
      const rowHeight = sheet.getRowHeight(row);
      if (y >= accY && y < accY + rowHeight) {
        break;
      }
      accY += rowHeight;
      row++;
    }

    let accW = 0, colCount = 0;
    let c = col;
    while (accW < width && c < 100) {
      accW += sheet.getColumnWidth(c);
      colCount++;
      c++;
    }
    if (colCount === 0) colCount = 1;

    let accH = 0, rowCount = 0;
    let r = row;
    while (accH < height && r < 100) {
      accH += sheet.getRowHeight(r);
      rowCount++;
      r++;
    }
    if (rowCount === 0) rowCount = 1;

    return { row, col, rowCount, colCount };
  }, []);

  const selectedIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  // Bind events to sheet
  useEffect(() => {
    if (!spread) return;

    const sheet = spread.getActiveSheet();
    if (!sheet) return;

    const handleShapeChanged = (_: unknown, args: { shape: GC.Spread.Sheets.Shapes.Shape }) => {
      if (!args.shape) return;
      const shapeId = args.shape.name();

      try {
        const bounds = { x: args.shape.x(), y: args.shape.y(), width: args.shape.width(), height: args.shape.height() };
        const snapped = snapToCell(bounds.x, bounds.y, bounds.width, bounds.height);
        const newLocation = rangeToLocation(snapped.row, snapped.col, snapped.rowCount, snapped.colCount);

        const comp = componentMapRef.current.get(shapeId);
        if (comp && comp.location !== newLocation) {
          const hasConflict = checkConflict(snapped, shapeId);
          if (hasConflict) {
            const msg = '区域与现有组件冲突';
            setConflictWarning(msg);
            onConflict?.(msg);
            setTimeout(() => setConflictWarning(null), 3000);
          }

          setComponents(prev => prev.map(c => c.id === shapeId ? { ...c, location: newLocation } : c));
          componentMapRef.current.set(shapeId, { ...comp, location: newLocation });
        }
      } catch (e) {
        console.error('[ShapeChanged] 错误:', e);
      }
    };

    const handleShapeRemoved = () => {
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
        const shape = args.shape;
        const shapeId = shape.name();
        if (componentMapRef.current.has(shapeId) && shapesRef.current.has(shapeId)) {
          setSelectedId(shapeId);
        }
      } else {
        if (selectedIdRef.current && shapesRef.current.has(selectedIdRef.current)) {
          setSelectedId(null);
        }
      }
    };

    try {
      sheet.bind(GC.Spread.Sheets.Events.ShapeChanged, handleShapeChanged);
      sheet.bind(GC.Spread.Sheets.Events.ShapeRemoved, handleShapeRemoved);
      sheet.bind(GC.Spread.Sheets.Events.ShapeSelectionChanged, handleShapeSelectionChanged);
    } catch (e) {
      console.error('[EventBinding] 绑定事件失败:', e);
    }

    return () => {
      try {
        sheet.unbind(GC.Spread.Sheets.Events.ShapeChanged, handleShapeChanged);
        sheet.unbind(GC.Spread.Sheets.Events.ShapeRemoved, handleShapeRemoved);
        sheet.unbind(GC.Spread.Sheets.Events.ShapeSelectionChanged, handleShapeSelectionChanged);
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spread]);

  useEffect(() => {
    if (!spread || components.length === 0) return;

    const sheet = spread.getActiveSheet();
    if (!sheet) return;

    components.forEach(comp => {
      createShape(comp);
    });
  }, [spread, components, createShape]);

  useEffect(() => {
    if (!spread) return;

    isInternalSelectionRef.current = true;

    shapesRef.current.forEach((shape) => {
      try {
        shape.isSelected(false);
      } catch {}
    });

    if (selectedId) {
      const shape = shapesRef.current.get(selectedId);
      if (shape) {
        try {
          shape.isSelected(true);
        } catch {}
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

    const designerHost =
      document.querySelector('.designer') ||
      document.querySelector('.gc-spread-sheets') ||
      document.querySelector('.ss-viewport');

    const rect = designerHost?.getBoundingClientRect();
    if (!rect) return;

    const selection = getSelectionRange();
    let targetRange: { row: number; col: number; rowCount: number; colCount: number };

    if (selection && selection.rowCount > 0 && selection.colCount > 0) {
      targetRange = selection;
    } else {
      const dropX = e.clientX - rect.left;
      const dropY = e.clientY - rect.top;
      const defaultSize = DefaultSizeMap[componentType] || { rows: 2, cols: 2 };

      let accX = 0, col = 0;
      while (accX < dropX && col < 100) {
        accX += sheet.getColumnWidth(col);
        col++;
      }
      if (col > 0) col--;

      let accY = 0, row = 0;
      while (accY < dropY && row < 100) {
        accY += sheet.getRowHeight(row);
        row++;
      }
      if (row > 0) row--;

      targetRange = { row, col, rowCount: defaultSize.rows, colCount: defaultSize.cols };
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
      name: `${TypeNames[componentType] || componentType} ${components.length + 1}`,
    };

    setComponents(prev => [...prev, newComp]);
    setSelectedId(newComp.id);
    setTimeout(() => createShape(newComp), 50);
  }, [spread, components.length, createShape, checkConflict, onConflict]);

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
  }, [createShape, removeShape, checkConflict, onConflict]);

  const handleDeleteComponent = useCallback((id: string) => {
    removeShape(id);
    setComponents(prev => prev.filter(c => c.id !== id));
    setSelectedId(null);
  }, [removeShape]);

  const handleExport = useCallback(() => {
    const config = {
      template_id: '',
      version: '',
      component_list: components.map(({ id, location, type, prompt, name, style }) => ({
        id, location, type, prompt, name, style
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

        // 清除现有组件和形状
        components.forEach(comp => {
          removeShape(comp.id);
        });
        createdShapesRef.current.clear();

        // 设置新组件
        const importedComponents: SmartComponent[] = config.component_list.map((comp: SmartComponent) => ({
          id: comp.id || uuidv4(),
          location: comp.location,
          type: comp.type,
          prompt: comp.prompt || '',
          name: comp.name,
          style: comp.style
        }));

        setComponents(importedComponents);
        setSelectedId(null);

        // 延迟创建形状，等待表格准备就绪
        setTimeout(() => {
          importedComponents.forEach((comp: SmartComponent) => {
            createShape(comp);
          });
        }, 100);
      } catch (error) {
        console.error('导入配置失败:', error);
        alert('导入失败：配置文件格式错误');
      }
    };
    reader.readAsText(file);

    e.target.value = '';
  }, [components, createShape, removeShape]);

  // 清除所有 shapes（用于导出 Excel）
  const clearAllShapes = useCallback(() => {
    if (!spread) return;
    const sheet = spread.getActiveSheet();
    if (!sheet) return;

    // 临时保存 shapes 以便后续恢复
    const shapeData: { id: string; component: SmartComponent }[] = [];
    shapesRef.current.forEach((shape, id) => {
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

  // 处理 Excel 文件导入
  const handleExcelFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (!spread) {
        alert('SpreadJS 尚未初始化');
        return;
      }

      const excelIO = new (ExcelIO as any).IO();

      // 1. 加载 Excel 到 SpreadJS
      excelIO.open(file, async (json: any) => {
        // 清除现有 shapes
        componentsRef.current.forEach(comp => {
          removeShape(comp.id);
        });
        shapesRef.current.clear();
        componentMapRef.current.clear();
        createdShapesRef.current.clear();

        // 加载 JSON 到 workbook
        spread.fromJSON(json);

        // 2. 获取导入的组件列表（通过回调）
        let importedComponents: SmartComponent[] = [];
        if (onImportExcel) {
          try {
            const result = onImportExcel(file);
            importedComponents = await Promise.resolve(result);
          } catch (error) {
            console.error('获取组件列表失败:', error);
          }
        }

        // 3. 设置组件状态
        setComponents(importedComponents);
        setSelectedId(null);

        // 4. 根据组件渲染 shapes
        if (importedComponents.length > 0) {
          setTimeout(() => {
            importedComponents.forEach((comp: SmartComponent) => {
              createShape(comp);
            });
          }, 100);
        }
      }, (error: any) => {
        console.error('加载 Excel 失败:', error);
        alert('加载 Excel 失败: ' + (error?.errorMessage || '未知错误'));
      });
    } catch (error) {
      console.error('导入 Excel 失败:', error);
      alert('导入 Excel 失败');
    }

    e.target.value = '';
  }, [spread, createShape, removeShape, onImportExcel]);

  const selectedComponent = useMemo(() => {
    return components.find(c => c.id === selectedId) || null;
  }, [components, selectedId]);

  // API 方法 - 允许外部调用
  const getComponents = useCallback(() => components, [components]);
  const getSpread = useCallback(() => spread, [spread]);
  const getDesigner = useCallback(() => designerRef.current, []);
  const setSelectedComponent = useCallback((id: string | null) => setSelectedId(id), []);
  const clearComponents = useCallback(() => {
    components.forEach(comp => removeShape(comp.id));
    setComponents([]);
    setSelectedId(null);
  }, [components, removeShape]);

  // 加载外部组件（用于从后端恢复）
  const loadComponents = useCallback((newComponents: SmartComponent[]) => {
    // 1. 清除现有组件和 shapes
    components.forEach(comp => removeShape(comp.id));
    createdShapesRef.current.clear();

    // 2. 设置新组件
    setComponents(newComponents);
    setSelectedId(null);

    // 3. 延迟创建 shapes
    setTimeout(() => {
      newComponents.forEach((comp: SmartComponent) => {
        createShape(comp);
      });
    }, 100);
  }, [components, removeShape, createShape]);

  // 导出干净的 Excel（不含 shapes）
  const exportCleanExcel = useCallback(async (): Promise<Blob> => {
    if (!spread) {
      throw new Error('SpreadJS 尚未初始化');
    }

    return new Promise((resolve, reject) => {
      // 1. 临时移除所有 shapes
      const shapeData = clearAllShapes();

      // 2. 导出 Excel
      const excelIO = new (ExcelIO as any).IO();
      const json = spread.toJSON();

      excelIO.save(json, (blob: Blob) => {
        // 3. 恢复 shapes
        if (shapeData && shapeData.length > 0) {
          setTimeout(() => {
            restoreAllShapes(shapeData);
          }, 50);
        }
        resolve(blob);
      }, (error: any) => {
        // 错误时也要恢复 shapes
        if (shapeData && shapeData.length > 0) {
          restoreAllShapes(shapeData);
        }
        reject(error);
      });
    });
  }, [spread, clearAllShapes, restoreAllShapes]);

  // Expose methods via ref if needed
  useEffect(() => {
    // Expose to window for debugging (optional)
    (window as any).smartReportDesigner = {
      getComponents,
      getSpread,
      getDesigner,
      setSelectedComponent,
      clearComponents,
      loadComponents,
      exportCleanExcel,
      addComponent: (comp: Omit<SmartComponent, 'id'>) => {
        const newComp = { ...comp, id: uuidv4() };
        setComponents(prev => [...prev, newComp]);
        setTimeout(() => createShape(newComp), 50);
        return newComp;
      },
      exportExcel: handleExportExcel,
      importExcel: handleImportExcel,
    };
  }, [getComponents, getSpread, getDesigner, createShape, clearComponents, loadComponents, exportCleanExcel, handleExportExcel, handleImportExcel]);

  return (
    <div className={`flex h-screen w-screen overflow-hidden bg-gray-100 ${className}`} style={style}>
      {/* Left: SpreadJS Designer */}
      <div className="flex-1 flex flex-col relative">
        <SpreadDesigner
          onWorkbookReady={handleWorkbookReady}
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
