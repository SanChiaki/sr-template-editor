import React, { useState } from 'react';
import { SmartComponent, ComponentTypes, DefaultColors } from '../types/SmartComponent';
import { Plus, Trash2, Download, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  components: SmartComponent[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: () => void;
  onUpdate: (component: SmartComponent) => void;
  onDelete: (id: string) => void;
  onExport: () => void;
}

export const ComponentPanel: React.FC<Props> = ({
  components,
  selectedId,
  onSelect,
  onAdd,
  onUpdate,
  onDelete,
  onExport,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const selected = components.find(c => c.id === selectedId);

  return (
    <div className="h-full flex flex-col bg-gray-50 border-l border-gray-200">
      {/* Header */}
      <div className="p-4 bg-white border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Smart Components</h2>
        <div className="flex gap-2">
          <button
            onClick={onAdd}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus size={16} />
            Add
          </button>
          <button
            onClick={onExport}
            className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Component List */}
      <div className="flex-1 overflow-y-auto p-3">
        {components.length === 0 ? (
          <div className="text-center text-gray-500 py-8 text-sm">
            No components yet.<br />Select a range and click "Add".
          </div>
        ) : (
          <div className="space-y-2">
            {components.map(comp => (
              <div
                key={comp.id}
                className={`rounded-lg border transition-all ${
                  selectedId === comp.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div
                  className="p-3 cursor-pointer flex items-center justify-between"
                  onClick={() => onSelect(comp.id === selectedId ? null : comp.id)}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: DefaultColors[comp.type].border }}
                    />
                    <span className="font-medium text-sm">{comp.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {comp.location}
                    </span>
                    {expandedId === comp.id ? (
                      <ChevronUp size={16} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-400" />
                    )}
                  </div>
                </div>
                
                {selectedId === comp.id && (
                  <div className="px-3 pb-3 border-t border-gray-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedId(expandedId === comp.id ? null : comp.id);
                      }}
                      className="w-full text-xs text-blue-600 py-2 hover:underline"
                    >
                      {expandedId === comp.id ? 'Hide Details' : 'Show Details'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Property Editor */}
      {selected && expandedId === selected.id && (
        <div className="border-t border-gray-200 bg-white p-4 max-h-[50%] overflow-y-auto">
          <h3 className="font-semibold text-gray-700 mb-3">Properties</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
              <input
                type="text"
                value={selected.name}
                onChange={e => onUpdate({ ...selected, name: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
              <input
                type="text"
                value={selected.location}
                onChange={e => onUpdate({ ...selected, location: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g., A1:C5"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select
                value={selected.type}
                onChange={e => onUpdate({ ...selected, type: e.target.value as SmartComponent['type'] })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {ComponentTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">AI Prompt</label>
              <textarea
                value={selected.prompt}
                onChange={e => onUpdate({ ...selected, prompt: e.target.value })}
                rows={3}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                placeholder="Describe what AI should generate..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Border Color</label>
              <input
                type="color"
                value={selected.style?.borderColor || DefaultColors[selected.type].border}
                onChange={e => onUpdate({
                  ...selected,
                  style: { ...selected.style, borderColor: e.target.value }
                })}
                className="w-full h-8 rounded cursor-pointer"
              />
            </div>

            <button
              onClick={() => onDelete(selected.id)}
              className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm mt-4"
            >
              <Trash2 size={14} />
              Delete Component
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
