import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { SmartComponent, DefaultColors } from './types/SmartComponent';
import { ComponentPanel } from './components/ComponentPanel';

// 声明全局GC类型
declare const GC: any;

// Column letter to index helper
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

function App() {
  const [spread, setSpread] = useState<any>(null);
  const [components, setComponents] = useState<SmartComponent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const shapesRef = useRef<Map<string, any>>(new Map());
  const designerContainerRef = useRef<HTMLDivElement>(null);
  const designerRef = useRef<any>(null);

  useEffect(() => {
    // 等待GC加载完成
    const checkGC = () => {
      if (typeof GC !== 'undefined' && GC.Spread && GC.Spread.Sheets && GC.Spread.Sheets.Designer) {
        setIsReady(true);
      } else {
        setTimeout(checkGC, 100);
      }
    };
    checkGC();
  }, []);

  useEffect(() => {
    if (isReady && designerContainerRef.current && !designerRef.current) {
      try {
        const config = GC.Spread.Sheets.Designer.DefaultConfig;
        designerRef.current = new GC.Spread.Sheets.Designer.Designer(designerContainerRef.current, config);
        // 延迟获取workbook确保完全初始化
        setTimeout(() => {
          if (designerRef.current) {
            const workbook = designerRef.current.getWorkbook();
            setSpread(workbook);
          }
        }, 500);
      } catch (e) {
        console.error('Failed to initialize designer:', e);
      }
    }
    return () => {
      if (designerRef.current) {
        try {
          designerRef.current.destroy();
        } catch (e) {
          console.error('Failed to destroy designer:', e);
        }
        designerRef.current = null;
      }
    };
  }, [isReady]);

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
      return {
        row: startRow,
        col: startCol,
        rowCount: endRow - startRow + 1,
        colCount: endCol - startCol + 1,
      };
    } catch {
      return null;
    }
  };

  const getSelectionRange = (): string => {
    if (!spread) return 'A1:C3';
    try {
      const sheet = spread.getActiveSheet();
      if (!sheet) return 'A1:C3';
      const selections = sheet.getSelections();
      if (!selections || selections.length === 0) return 'A1:C3';
      const sel = selections[0];
      if (!sel) return 'A1:C3';
      
      const startCol = colIndexToLetter(sel.col);
      const endCol = colIndexToLetter(sel.col + sel.colCount - 1);
      return `${startCol}${sel.row + 1}:${endCol}${sel.row + sel.rowCount}`;
    } catch (e) {
      console.error('Error getting selection:', e);
      return 'A1:C3';
    }
  };

  const createShape = useCallback((component: SmartComponent) => {
    if (!spread) return;
    const sheet = spread.getActiveSheet();
    const range = parseRange(component.location);
    if (!range) return;

    const borderColor = component.style?.borderColor || DefaultColors[component.type].border;
    
    // Calculate pixel positions
    let x = 0, y = 0, width = 0, height = 0;
    for (let i = 0; i < range.col; i++) x += sheet.getColumnWidth(i);
    for (let i = 0; i < range.row; i++) y += sheet.getRowHeight(i);
    for (let i = 0; i < range.colCount; i++) width += sheet.getColumnWidth(range.col + i);
    for (let i = 0; i < range.rowCount; i++) height += sheet.getRowHeight(range.row + i);

    try {
      const shape = sheet.shapes.add(component.id, GC.Spread.Sheets.Shapes.AutoShapeType.rectangle, x, y, width, height);
      
      const style = shape.style();
      style.fill = { type: 0, color: 'transparent' };
      style.line = { color: borderColor, width: 2 };
      shape.style(style);
      
      shape.text(component.name);
      shapesRef.current.set(component.id, shape);
    } catch (e) {
      console.error('Error creating shape:', e);
    }
  }, [spread]);

  const removeShape = useCallback((id: string) => {
    if (!spread) return;
    const sheet = spread.getActiveSheet();
    if (shapesRef.current.has(id)) {
      try {
        sheet.shapes.remove(id);
      } catch (e) {
        console.error('Error removing shape:', e);
      }
      shapesRef.current.delete(id);
    }
  }, [spread]);

  const updateShape = useCallback((component: SmartComponent) => {
    removeShape(component.id);
    createShape(component);
  }, [removeShape, createShape]);

  const handleAddComponent = useCallback(() => {
    const location = getSelectionRange();
    const newComp: SmartComponent = {
      id: uuidv4(),
      location,
      type: 'Text',
      prompt: '',
      name: `Component ${components.length + 1}`,
    };
    setComponents(prev => [...prev, newComp]);
    setSelectedId(newComp.id);
    createShape(newComp);
  }, [components.length, createShape, spread]);

  const handleUpdateComponent = useCallback((updated: SmartComponent) => {
    setComponents(prev => prev.map(c => c.id === updated.id ? updated : c));
    updateShape(updated);
  }, [updateShape]);

  const handleDeleteComponent = useCallback((id: string) => {
    removeShape(id);
    setComponents(prev => prev.filter(c => c.id !== id));
    setSelectedId(null);
  }, [removeShape]);

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
    if (spread && components.length > 0) {
      components.forEach(comp => {
        if (!shapesRef.current.has(comp.id)) {
          createShape(comp);
        }
      });
    }
  }, [spread, components, createShape]);

  if (!isReady) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading SpreadJS Designer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <div ref={designerContainerRef} className="w-[70%] h-full" />
      <div className="w-[30%] h-full">
        <ComponentPanel
          components={components}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onAdd={handleAddComponent}
          onUpdate={handleUpdateComponent}
          onDelete={handleDeleteComponent}
          onExport={handleExport}
        />
      </div>
    </div>
  );
}

export default App;
