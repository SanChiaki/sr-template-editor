import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import GC from '@grapecity/spread-sheets';
import '@grapecity/spread-sheets-shapes';
import '@grapecity/spread-sheets-charts';
import '@grapecity/spread-sheets/styles/gc.spread.sheets.excel2013white.css';

// Import SpreadJS Designer component
import { SpreadDesigner } from './components/SpreadDesigner';

// SpreadJS evaluation mode - will show watermark
(GC.Spread.Sheets as any).LicenseKey = '';

import { SmartComponent, DefaultColors } from './types/SmartComponent';
import { ComponentLibrary } from './components/ComponentLibrary';
import { ComponentList } from './components/ComponentList';
import { PropertiesPanel } from './components/PropertiesPanel';
import { Download, Layers } from 'lucide-react';

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
  // 兼容旧类型
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
  // 兼容旧类型
  Image: '图片',
  Formula: '公式',
};

function App() {
  const [spread, setSpread] = useState<GC.Spread.Sheets.Workbook | null>(null);
  const [components, setComponents] = useState<SmartComponent[]>([]);
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

  // Designer initialization callback
  const handleWorkbookReady = useCallback((workbook: GC.Spread.Sheets.Workbook, designer: any) => {
    designerRef.current = designer;
    setSpread(workbook);
    console.log('[SpreadDesigner] Workbook ready:', workbook);

      // 加载保存的组件
    const savedComponents = localStorage.getItem('smartreport_components');
    if (savedComponents) {
      try {
        setComponents(JSON.parse(savedComponents));
      } catch (e) {
        console.error('加载组件失败:', e);
      }
    }
  }, []);

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
    // Use ref to always get current components
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
      console.log('[createShape] 已创建，跳过:', component.id);
      return;
    }

    console.log('[createShape] 创建形状:', component.id);

    if (!spread) return;
    const sheet = spread.getActiveSheet();
    if (!sheet) {
      console.log('[createShape] 表格未就绪，跳过:', component.id);
      return;
    }
    const range = parseRange(component.location);
    if (!range) return;

    const borderColor = component.style?.borderColor || DefaultColors[component.type]?.border || '#9ca3af';

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
      style.fill = { type: 0, color: 'transparent' };
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

  // Sync refs with current state
  useEffect(() => {
    spreadRef.current = spread;
  }, [spread]);

  useEffect(() => {
    componentsRef.current = components;
  }, [components]);

  // Bind events to sheet
  useEffect(() => {
    if (!spread) return;

    const sheet = spread.getActiveSheet();
    if (!sheet) return;

    console.log('[EventBinding] 绑定事件到表格:', sheet.name?.());

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
            setConflictWarning('区域与现有组件冲突');
            setTimeout(() => setConflictWarning(null), 3000);
          }

          console.log('[ShapeChanged] 更新位置:', shapeId, '从', comp.location, '到', newLocation);
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
      console.log('[ShapeSelectionChanged] args:', args);
      if (isInternalSelectionRef.current) {
        console.log('[ShapeSelectionChanged] 因内部选择而忽略');
        return;
      }

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
        console.log('[ShapeSelectionChanged] 选中形状:', args.shape.name());
        const shape = args.shape;
        const shapeId = shape.name();
        if (componentMapRef.current.has(shapeId) && shapesRef.current.has(shapeId)) {
          setSelectedId(shapeId);
        }
      } else {
        console.log('[ShapeSelectionChanged] 未选中形状');
        if (selectedIdRef.current && shapesRef.current.has(selectedIdRef.current)) {
          setSelectedId(null);
        }
      }
    };

    try {
      sheet.bind(GC.Spread.Sheets.Events.ShapeChanged, handleShapeChanged);
      sheet.bind(GC.Spread.Sheets.Events.ShapeRemoved, handleShapeRemoved);
      sheet.bind(GC.Spread.Sheets.Events.ShapeSelectionChanged, handleShapeSelectionChanged);
      console.log('[EventBinding] 事件绑定成功');
    } catch (e) {
      console.error('[EventBinding] 绑定事件失败:', e);
    }

    return () => {
      try {
        sheet.unbind(GC.Spread.Sheets.Events.ShapeChanged, handleShapeChanged);
        sheet.unbind(GC.Spread.Sheets.Events.ShapeRemoved, handleShapeRemoved);
        sheet.unbind(GC.Spread.Sheets.Events.ShapeSelectionChanged, handleShapeSelectionChanged);
        console.log('[EventBinding] 事件已解绑');
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spread]);

  useEffect(() => {
    if (!spread || components.length === 0) return;

    const sheet = spread.getActiveSheet();
    if (!sheet) {
      console.log('[CreateShapesEffect] 表格未就绪，延迟创建形状');
      return;
    }

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

    // Try multiple selectors to find the designer viewport
    const designerHost =
      document.querySelector('.designer') ||
      document.querySelector('.gc-spread-sheets') ||
      document.querySelector('.ss-viewport');

    const rect = designerHost?.getBoundingClientRect();
    if (!rect) {
      console.error('[handleDrop] 未找到设计器宿主元素');
      return;
    }

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
      setConflictWarning('区域与现有组件冲突');
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
  }, [spread, components.length, createShape, checkConflict]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleUpdateComponent = useCallback((updated: SmartComponent) => {
    const oldComp = componentMapRef.current.get(updated.id);

    if (oldComp && oldComp.location !== updated.location) {
      const newRange = parseRange(updated.location);
      if (newRange && checkConflict(newRange, updated.id)) {
        setConflictWarning('区域与现有组件冲突');
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
  }, [createShape, removeShape, checkConflict]);

  const handleDeleteComponent = useCallback((id: string) => {
    removeShape(id);
    setComponents(prev => prev.filter(c => c.id !== id));
    setSelectedId(null);
  }, [removeShape]);

  const handleSave = useCallback(() => {
    if (spread) {
      localStorage.setItem('smartreport_components', JSON.stringify(components));
    }
  }, [spread, components]);

  const handleExport = useCallback(() => {
    const config = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      components: components.map(({ id, location, type, prompt, name, style }) => ({
        id, location, type, prompt, name, style
      }))
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template-config.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [components]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (spread && components.length > 0) {
        handleSave();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [spread, components, handleSave]);

  const selectedComponent = components.find(c => c.id === selectedId) || null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-100">
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
      <div className="w-[340px] h-full flex flex-col bg-gray-50 border-l border-gray-200">
        {/* Header */}
        <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">SmartReport</h2>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            <Download size={14} />
            导出配置
          </button>
        </div>

        {/* Component Library */}
        <ComponentLibrary
          onDragStart={(type) => { setIsDragging(true); setDraggingType(type); }}
          onDragEnd={() => { setIsDragging(false); setDraggingType(null); }}
        />

        {/* Component List */}
        <div className="border-b border-gray-200 bg-white">
          <div className="px-4 py-2 flex items-center justify-between border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">组件列表 ({components.length})</span>
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            <ComponentList
              components={components}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
        </div>

        {/* Properties Panel */}
        <PropertiesPanel
          component={selectedComponent}
          onUpdate={handleUpdateComponent}
          onDelete={handleDeleteComponent}
          conflictWarning={conflictWarning}
        />
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

export default App;
