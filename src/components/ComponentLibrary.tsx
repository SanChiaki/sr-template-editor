import React from 'react';
import { ComponentTypes, DefaultColors } from '../types/SmartComponent';
import { Type, Table2, BarChart3, ImageIcon, Calculator, GripVertical } from 'lucide-react';

interface Props {
  onDragStart: (type: string) => void;
  onDragEnd: () => void;
}

const ComponentIcons: Record<string, React.ReactNode> = {
  Text: <Type size={20} />,
  Table: <Table2 size={20} />,
  Chart: <BarChart3 size={20} />,
  Image: <ImageIcon size={20} />,
  Formula: <Calculator size={20} />,
};

const TypeNames: Record<string, string> = {
  Text: '文本',
  Table: '表格',
  Chart: '图表',
  Image: '图片',
  Formula: '公式',
};

const DefaultSizes: Record<string, string> = {
  Text: '2x1',
  Table: '5x4',
  Chart: '4x3',
  Image: '3x3',
  Formula: '2x1',
};

export const ComponentLibrary: React.FC<Props> = ({ onDragStart, onDragEnd }) => {
  const handleDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('componentType', type);
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart(type);
  };

  return (
    <div className="p-4 bg-white border-b border-gray-200">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <span className="w-1.5 h-4 bg-blue-500 rounded"></span>
        组件库
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {ComponentTypes.map(type => (
          <div
            key={type}
            draggable
            onDragStart={(e) => handleDragStart(e, type)}
            onDragEnd={onDragEnd}
            className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-lg cursor-grab hover:bg-gray-100 hover:border-gray-300 transition-all active:cursor-grabbing group"
            style={{ borderLeftColor: DefaultColors[type].border, borderLeftWidth: 3 }}
          >
            <GripVertical size={14} className="text-gray-400 group-hover:text-gray-600" />
            <span style={{ color: DefaultColors[type].border }}>{ComponentIcons[type]}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-700 truncate">{TypeNames[type]}</div>
              <div className="text-xs text-gray-400">{DefaultSizes[type]}</div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-3 text-center">
        拖拽到画布或选中区域
      </p>
    </div>
  );
};
