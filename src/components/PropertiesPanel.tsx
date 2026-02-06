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
        <p className="text-sm text-center">选择一个组件以编辑属性</p>
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
          属性设置
        </h3>
      </div>

      {conflictWarning && (
        <div className="mx-4 mt-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 animate-pulse">
          <AlertCircle size={16} className="text-red-500" />
          <span className="text-xs text-red-600">{conflictWarning}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 名称 */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
            <Type size={12} />
            名称
          </label>
          <input
            type="text"
            value={component.name}
            onChange={e => onUpdate({ ...component, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        {/* 类型 */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
            <FileText size={12} />
            类型
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
                {t === 'Text' ? '文本' :
                 t === 'Table' ? '表格' :
                 t === 'Chart' ? '图表' :
                 t === 'Image' ? '图片' :
                 t === 'Formula' ? '公式' : t}
              </button>
            ))}
          </div>
        </div>

        {/* 位置 */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
            <MapPin size={12} />
            位置
          </label>
          <input
            type="text"
            value={component.location}
            onChange={e => onUpdate({ ...component, location: e.target.value.toUpperCase() })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="例如：A1:C5"
          />
        </div>

        {/* AI 提示词 */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
            <Sparkles size={12} />
            AI 提示词
          </label>
          <textarea
            value={localPrompt}
            onChange={e => setLocalPrompt(e.target.value)}
            onBlur={handlePromptBlur}
            rows={4}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
            placeholder="描述AI应该生成的内容..."
          />
        </div>
      </div>

      {/* 删除按钮 */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={() => {
            if (confirm('确定要删除此组件吗？')) {
              onDelete(component.id);
            }
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all text-sm font-medium"
        >
          <Trash2 size={16} />
          删除组件
        </button>
      </div>
    </div>
  );
};
