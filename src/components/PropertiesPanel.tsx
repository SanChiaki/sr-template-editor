import React, { useState, useEffect } from 'react';
import { SmartComponent, ComponentTypes, DefaultColors } from '../types/SmartComponent';
import { Trash2, MapPin, Type, FileText, Sparkles, AlertCircle } from 'lucide-react';

interface Props {
  component: SmartComponent | null;
  onUpdate: (component: SmartComponent) => void;
  onDelete: (id: string) => void;
  conflictWarning?: string | null;
}

export const PropertiesPanel: React.FC<Props> = ({ component, onUpdate, onDelete, conflictWarning }) => {
  const [localPrompt, setLocalPrompt] = useState('');

  useEffect(() => {
    if (component) {
      setLocalPrompt(component.prompt);
    }
  }, [component?.id]);

  if (!component) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-gray-400 bg-gray-50">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <Sparkles size={24} />
        </div>
        <p className="text-sm text-center">Select a component to edit properties</p>
      </div>
    );
  }

  const handlePromptBlur = () => {
    if (localPrompt !== component.prompt) {
      onUpdate({ ...component, prompt: localPrompt });
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-orange-500 rounded"></span>
          Properties
        </h3>
      </div>

      {conflictWarning && (
        <div className="mx-4 mt-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 animate-pulse">
          <AlertCircle size={16} className="text-red-500" />
          <span className="text-xs text-red-600">{conflictWarning}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Name */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
            <Type size={12} />
            Name
          </label>
          <input
            type="text"
            value={component.name}
            onChange={e => onUpdate({ ...component, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Type */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
            <FileText size={12} />
            Type
          </label>
          <div className="grid grid-cols-5 gap-1">
            {ComponentTypes.map(t => (
              <button
                key={t}
                onClick={() => onUpdate({ ...component, type: t, style: { ...(component.style || {}), borderColor: undefined } })}
                className={`p-2 rounded-lg text-xs font-medium transition-all ${
                  component.type === t
                    ? 'text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
                style={{
                  backgroundColor: component.type === t ? DefaultColors[t].border : undefined
                }}
              >
                {t.slice(0, 4)}
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
            <MapPin size={12} />
            Location
          </label>
          <input
            type="text"
            value={component.location}
            onChange={e => onUpdate({ ...component, location: e.target.value.toUpperCase() })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="e.g., A1:C5"
          />
        </div>

        {/* Prompt */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
            <Sparkles size={12} />
            AI Prompt
          </label>
          <textarea
            value={localPrompt}
            onChange={e => setLocalPrompt(e.target.value)}
            onBlur={handlePromptBlur}
            rows={4}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
            placeholder="Describe what AI should generate..."
          />
        </div>

        {/* JSON Preview */}
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1.5 block">JSON Preview</label>
          <pre className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600 overflow-x-auto border border-gray-200">
            {JSON.stringify(component, null, 2)}
          </pre>
        </div>
      </div>

      {/* Delete Button */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={() => {
            if (confirm('Delete this component?')) {
              onDelete(component.id);
            }
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all text-sm font-medium"
        >
          <Trash2 size={16} />
          Delete Component
        </button>
      </div>
    </div>
  );
};
