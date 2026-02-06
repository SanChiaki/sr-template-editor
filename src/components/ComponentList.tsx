import React from 'react';
import { SmartComponent, DefaultColors } from '../types/SmartComponent';
import { Type, Table2, BarChart3, ImageIcon, Calculator } from 'lucide-react';

interface Props {
  components: SmartComponent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const ComponentIcons: Record<string, React.ReactNode> = {
  Text: <Type size={14} />,
  Table: <Table2 size={14} />,
  Chart: <BarChart3 size={14} />,
  Image: <ImageIcon size={14} />,
  Formula: <Calculator size={14} />,
};

export const ComponentList: React.FC<Props> = ({ components, selectedId, onSelect }) => {
  if (components.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400 text-sm">
        <p>No components yet.</p>
        <p className="text-xs mt-1">Drag from library above</p>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-1">
      {components.map(comp => (
        <div
          key={comp.id}
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
              backgroundColor: DefaultColors[comp.type].bg,
              color: DefaultColors[comp.type].border 
            }}
          >
            {ComponentIcons[comp.type]}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-700 truncate">{comp.name}</div>
            <div className="text-xs text-gray-400 font-mono">{comp.location}</div>
          </div>
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: comp.style?.borderColor || DefaultColors[comp.type].border }}
          />
        </div>
      ))}
    </div>
  );
};
