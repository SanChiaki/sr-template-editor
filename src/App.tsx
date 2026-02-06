import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import GC from '@grapecity/spread-sheets';
import '@grapecity/spread-sheets-shapes';
import '@grapecity/spread-sheets-charts';
import '@grapecity/spread-sheets/styles/gc.spread.sheets.excel2013white.css';

// SpreadJS evaluation mode - will show watermark
(GC.Spread.Sheets as any).LicenseKey = '';
import { SmartComponent, DefaultColors } from './types/SmartComponent';
import { ComponentLibrary } from './components/ComponentLibrary';
import { ComponentList } from './components/ComponentList';
import { PropertiesPanel } from './components/PropertiesPanel';
import { Download, Layers, Save, Undo, Redo } from 'lucide-react';

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
  Image: { rows: 3, cols: 3 },
  Formula: { rows: 1, cols: 2 },
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
  const hostRef = useRef<HTMLDivElement>(null);
  const spreadRef = useRef<GC.Spread.Sheets.Workbook | null>(null);
  const isInternalSelectionRef = useRef(false);
  const createdShapesRef = useRef<Set<string>>(new Set()); // 追踪已创建的 shape
  const updatingComponentRef = useRef<Set<string>>(new Set()); // 追踪正在更新的组件

  useEffect(() => {
    if (hostRef.current && !spreadRef.current) {
      try {
        const newSpread = new GC.Spread.Sheets.Workbook(hostRef.current, {
          sheetCount: 1,
          allowCopyPasteExcelStyle: true,
          allowUserDragDrop: true,
          allowUserDragFill: true,
          allowUserResize: true,
          allowUserZoom: true,
          showHorizontalScrollbar: true,
          showVerticalScrollbar: true,
          tabStripVisible: true,
        });
        spreadRef.current = newSpread;
        setSpread(newSpread);

        // Load saved components
        const savedComponents = localStorage.getItem('smartreport_components');
        if (savedComponents) {
          try {
            setComponents(JSON.parse(savedComponents));
          } catch (e) {
            console.error('Load components error:', e);
          }
        }
      } catch (e) {
        console.error('Failed to initialize:', e);
      }
    }
    return () => {
      if (spreadRef.current) {
        try { spreadRef.current.destroy(); } catch {}
        spreadRef.current = null;
      }
    };
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
    for (const comp of components) {
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
  }, [components]);

  const createShape = useCallback((component: SmartComponent) => {
    // 检查是否已创建过
    if (createdShapesRef.current.has(component.id)) {
      console.log('[createShape] Already created, skipping:', component.id);
      return;
    }

    console.log('[createShape] Creating shape for:', component.id);

    if (!spread) return;
    const sheet = spread.getActiveSheet();
    const range = parseRange(component.location);
    if (!range) return;

    const borderColor = component.style?.borderColor || DefaultColors[component.type].border;

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

      // 先添加到 shapesRef，这样 ShapeSelectionChanged 事件不会误删组件
      shapesRef.current.set(component.id, shape);
      componentMapRef.current.set(component.id, component);
      // 标记为已创建
      createdShapesRef.current.add(component.id);
    } catch (e) {
      console.error('Error creating shape:', e);
    }
  }, [spread]);

  const removeShape = useCallback((id: string) => {
    if (!spread) return;
    const sheet = spread.getActiveSheet();
    if (shapesRef.current.has(id)) {
      try { sheet.shapes.remove(id); } catch {}
      shapesRef.current.delete(id);
      componentMapRef.current.delete(id);
      createdShapesRef.current.delete(id); // 从已创建列表中移除
    }
  }, [spread]);

  const snapToCell = useCallback((x: number, y: number, width: number, height: number) => {
    if (!spread) return { row: 0, col: 0, rowCount: 1, colCount: 1 };
    const sheet = spread.getActiveSheet();

    // 找到起始列：x 所在的列
    let accX = 0, col = 0;
    while (col < 100) {
      const colWidth = sheet.getColumnWidth(col);
      if (x >= accX && x < accX + colWidth) {
        break;
      }
      accX += colWidth;
      col++;
    }

    // 找到起始行：y 所在的行
    let accY = 0, row = 0;
    while (row < 100) {
      const rowHeight = sheet.getRowHeight(row);
      if (y >= accY && y < accY + rowHeight) {
        break;
      }
      accY += rowHeight;
      row++;
    }

    // 计算跨越的列数
    let accW = 0, colCount = 0;
    let c = col;
    while (accW < width && c < 100) {
      accW += sheet.getColumnWidth(c);
      colCount++;
      c++;
    }
    if (colCount === 0) colCount = 1;

    // 计算跨越的行数
    let accH = 0, rowCount = 0;
    let r = row;
    while (accH < height && r < 100) {
      accH += sheet.getRowHeight(r);
      rowCount++;
      r++;
    }
    if (rowCount === 0) rowCount = 1;

    return { row, col, rowCount, colCount };
  }, [spread]);

  const selectedIdRef = useRef<string | null>(null);

  // 同步 selectedId 到 ref
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);
  useEffect(() => {
    if (!spread) return;
    const sheet = spread.getActiveSheet();

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
            setConflictWarning('Area conflicts with existing component');
            setTimeout(() => setConflictWarning(null), 3000);
          }

          console.log('[ShapeChanged] Updating location for:', shapeId, 'from', comp.location, 'to', newLocation);
          setComponents(prev => prev.map(c => c.id === shapeId ? { ...c, location: newLocation } : c));
          componentMapRef.current.set(shapeId, { ...comp, location: newLocation });
        }
      } catch (e) {
        console.error('[ShapeChanged] Error:', e);
      }
    };

    const handleShapeRemoved = () => {
      // 检测是否有 shape 被删除
      const allShapes = sheet.shapes.all();
      const currentShapeIds = new Set(allShapes.map((s: GC.Spread.Sheets.Shapes.Shape) => s.name()));

      // 找出已被删除的 shape（跳过正在更新的组件）
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
      // 如果是内部触发的选中，忽略事件以防止循环
      if (isInternalSelectionRef.current) {
        console.log('[ShapeSelectionChanged] Ignored due to internal selection');
        return;
      }

      // 检测是否有 shape 被删除
      const allShapes = sheet.shapes.all();
      const currentShapeIds = new Set(allShapes.map((s: GC.Spread.Sheets.Shapes.Shape) => s.name()));

      // 找出需要删除的 id（只删除 shapesRef 中有但当前没有的）
      const deletedIds: string[] = [];
      shapesRef.current.forEach((_, id) => {
        // 跳过正在更新的组件
        if (!currentShapeIds.has(id) && !updatingComponentRef.current.has(id)) {
          deletedIds.push(id);
        }
      });

      // 删除对应的组件（只删除 shapesRef 中有这个 id 的组件）
      if (deletedIds.length > 0) {
        deletedIds.forEach(id => {
          // 先从 shapesRef 中删除，这样后面的代码不会误判
          shapesRef.current.delete(id);
          componentMapRef.current.delete(id);
          createdShapesRef.current.delete(id);
          // 同时从 components 中删除
          setComponents(prev => prev.filter(c => c.id !== id));
        });
      }

      // 同步选中状态
      if (args.shape) {
        console.log('[ShapeSelectionChanged] Shape selected:', args.shape.name());
        const shape = args.shape;
        const shapeId = shape.name();
        // 同时检查 componentMapRef 和 shapesRef 中是否有该 id
        if (componentMapRef.current.has(shapeId) && shapesRef.current.has(shapeId)) {
          setSelectedId(shapeId);
        }
      } else {
        console.log('[ShapeSelectionChanged] No shape selected');
        // 只有在有选中组件时才清空，使用 ref 避免依赖
        if (selectedIdRef.current && shapesRef.current.has(selectedIdRef.current)) {
          setSelectedId(null);
        }
      }
    };

    try {
      sheet.bind(GC.Spread.Sheets.Events.ShapeChanged, handleShapeChanged);
      sheet.bind(GC.Spread.Sheets.Events.ShapeRemoved, handleShapeRemoved);
      sheet.bind(GC.Spread.Sheets.Events.ShapeSelectionChanged, handleShapeSelectionChanged);
    } catch {}

    return () => {
      try {
        sheet.unbind(GC.Spread.Sheets.Events.ShapeChanged, handleShapeChanged);
        sheet.unbind(GC.Spread.Sheets.Events.ShapeRemoved, handleShapeRemoved);
        sheet.unbind(GC.Spread.Sheets.Events.ShapeSelectionChanged, handleShapeSelectionChanged);
      } catch {}
    };
  }, [spread, snapToCell, checkConflict]);

  // Create shapes for all components when they are loaded
  useEffect(() => {
    if (!spread || components.length === 0) return;

    components.forEach(comp => {
      createShape(comp);
    });
  }, [spread, components, createShape]);

  // When selectedId changes, select the corresponding shape
  useEffect(() => {
    if (!spread) return;

    // 设置标志，防止 shape 选中变化触发 ShapeSelectionChanged 事件
    isInternalSelectionRef.current = true;

    // 先取消所有 shape 的选中
    shapesRef.current.forEach((shape) => {
      try {
        shape.isSelected(false);
      } catch {}
    });

    // 然后选中目标 shape
    if (selectedId) {
      const shape = shapesRef.current.get(selectedId);
      if (shape) {
        try {
          shape.isSelected(true);
        } catch {}
      }
    }

    // 延迟重置标志，确保所有事件都被忽略
    setTimeout(() => {
      isInternalSelectionRef.current = false;
    }, 100);
  }, [spread, selectedId]);

  // Handle drop from component library
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setDraggingType(null);
    
    if (!spread) return;
    const componentType = e.dataTransfer.getData('componentType');
    if (!componentType) return;

    const sheet = spread.getActiveSheet();
    const rect = hostRef.current?.getBoundingClientRect();
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
      setConflictWarning('Area conflicts with existing component');
      setTimeout(() => setConflictWarning(null), 3000);
      return;
    }

    const location = rangeToLocation(targetRange.row, targetRange.col, targetRange.rowCount, targetRange.colCount);

    const newComp: SmartComponent = {
      id: uuidv4(),
      location,
      type: componentType as SmartComponent['type'],
      prompt: '',
      name: `${componentType} ${components.length + 1}`,
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
        setConflictWarning('Area conflicts with existing component');
        setTimeout(() => setConflictWarning(null), 3000);
        return;
      }
    }

    setComponents(prev => prev.map(c => c.id === updated.id ? updated : c));
    componentMapRef.current.set(updated.id, updated);

    // 标记组件正在更新，防止 ShapeSelectionChanged 事件删除它
    updatingComponentRef.current.add(updated.id);
    removeShape(updated.id);
    setTimeout(() => {
      createShape(updated);
      // 更新完成后移除标记
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
      // 只保存组件数据，shape 每次根据组件重新渲染
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

  // Auto-save
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
      {/* Left: SpreadJS Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
          >
            <Save size={16} />
            Save
          </button>
          <button
            onClick={() => spread?.undoManager().undo()}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            <Undo size={16} />
          </button>
          <button
            onClick={() => spread?.undoManager().redo()}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            <Redo size={16} />
          </button>
        </div>
        
        {/* Canvas with License Notice */}
        <div className="flex-1 relative">
          <div 
            ref={hostRef} 
            className={`absolute inset-0 transition-all ${isDragging ? 'ring-4 ring-blue-400 ring-inset' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          />
          {/* License Notice Overlay */}
          {!spread && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-md text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Layers size={24} className="text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">SpreadJS License Required</h3>
                <p className="text-sm text-gray-600 mb-4">
                  To use the spreadsheet editor, please obtain a deployment license key from GrapeCity.
                </p>
                <a 
                  href="https://www.grapecity.com.cn/developer/spreadjs/deploy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Request Free Trial Key
                </a>
              </div>
            </div>
          )}
        </div>
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
            Export
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
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Components ({components.length})</span>
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
            Drop {draggingType} component on canvas
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
