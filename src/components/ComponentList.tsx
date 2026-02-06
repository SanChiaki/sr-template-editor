import React, { useRef, useEffect } from 'react';
import { SmartComponent, DefaultColors } from '../types/SmartComponent';
import { Type, Table2, BarChart3, List, Flag, Calendar, ImageIcon, Calculator } from 'lucide-react';

interface Props {
  components: SmartComponent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const ComponentIcons: Record<string, React.ReactNode> = {
  Text: <Type size={14} />,
  Table: <Table2 size={14} />,
  Chart: <BarChart3 size={14} />,
  List: <List size={14} />,
  Milestone: <Flag size={14} />,
  Gantt: <Calendar size={14} />,
  // 兼容旧类型
  Image: <ImageIcon size={14} />,
  Formula: <Calculator size={14} />,
};

// 默认颜色（用于兼容旧类型）
const FallbackColor = { bg: 'rgba(156, 163, 175, 0.1)', border: '#9ca3af' };

export const ComponentList: React.FC<Props> = ({ components, selectedId, onSelect }) => {
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // 当 selectedId 变化时，自动滚动到对应的组件
  useEffect(() => {
    if (selectedId) {
      const element = itemRefs.current.get(selectedId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedId]);

  if (components.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400 text-sm">
        <p>暂无组件</p>
        <p className="text-xs mt-1">从上方库中拖拽添加</p>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-1">
      {components.map(comp => {
        const color = DefaultColors[comp.type] || FallbackColor;
        return (
          <div
            key={comp.id}
            ref={el => {
              if (el) {
                itemRefs.current.set(comp.id, el);
              }
            }}
            onClick={() => onSelect(comp.id)}
            className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all ${
              selectedId === comp.id
                ? 'bg-blue-50 border-2 border-blue-500'
                : 'bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <span
              className="w-6 h-6 rounded flex items-center justify-center"
              style={{
                backgroundColor: color.bg,
                color: color.border
              }}
            >
              {ComponentIcons[comp.type] || <span>?</span>}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-700 truncate">{comp.name}</div>
              <div className="text-xs text-gray-400 font-mono">{comp.location}</div>
            </div>
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: comp.style?.borderColor || color.border }}
            />
          </div>
        );
      })}
    </div>
  );
};
