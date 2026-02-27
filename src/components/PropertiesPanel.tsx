import React, { useState, useEffect, useMemo } from 'react';
import { SmartComponent, ComponentTypes, DefaultColors, DataSource } from '../types/SmartComponent';
import { Trash2, MapPin, Type, FileText, Sparkles, AlertCircle, Database, ChevronDown, ChevronRight, Braces, AlertTriangle } from 'lucide-react';

// JSON 校验函数
const isValidJson = (str: string): boolean => {
  if (!str || str.trim() === '') return true; // 空字符串视为有效
  try {
    const parsed = JSON.parse(str);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);
  } catch {
    return false;
  }
};

// JSON对象转字符串（用于显示）
const paramsToString = (params: Record<string, unknown> | undefined): string => {
  if (!params || Object.keys(params).length === 0) return '';
  return JSON.stringify(params, null, 2);
};

// 字符串转JSON对象（用于保存）
const stringToParams = (str: string): Record<string, unknown> => {
  if (!str || str.trim() === '') return {};
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
};

export interface PropertiesPanelProps {
  component: SmartComponent | null;
  onUpdate: (component: SmartComponent) => void;
  onDelete: (id: string) => void;
  conflictWarning?: string | null;
  /** 可选的数据源列表，用于下拉选择 */
  dataSourceOptions?: string[];
}

const TypeNames: Record<string, string> = {
  Text: '文本',
  Table: '表格',
  Chart: '图表',
  List: '列表',
  Milestone: '里程碑',
  GanttChart: '甘特表',
  // 兼容旧类型
  Image: '图片',
  Formula: '公式',
};

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  component,
  onUpdate,
  onDelete,
  conflictWarning,
  dataSourceOptions = [],
}) => {
  const [localPrompt, setLocalPrompt] = useState('');
  const [localDataExample, setLocalDataExample] = useState('');
  const [localDataSourceParams, setLocalDataSourceParams] = useState('');
  const [showDataSource, setShowDataSource] = useState(false);
  const [dataSourceNameInput, setDataSourceNameInput] = useState('');
  const [showDataSourceSuggestions, setShowDataSourceSuggestions] = useState(false);

  // 校验数据源入参 JSON 格式 - 必须在条件返回之前调用
  const isDataSourceParamsValidJson = useMemo(() => isValidJson(localDataSourceParams), [localDataSourceParams]);

  useEffect(() => {
    if (component) {
      setLocalPrompt(component.prompt);
      setLocalDataExample(component.data_example || '');
      setLocalDataSourceParams(paramsToString(component.data_source?.params));
      setShowDataSource(!!component.data_source);
      setDataSourceNameInput(component.data_source?.name || '');
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

  const handleDataExampleBlur = () => {
    if (localDataExample !== (component.data_example || '')) {
      onUpdate({ ...component, data_example: localDataExample || undefined });
    }
  };

  const handleDataSourceParamsBlur = () => {
    const currentParamsStr = paramsToString(component.data_source?.params);
    if (localDataSourceParams !== currentParamsStr) {
      const newParams = stringToParams(localDataSourceParams);
      onUpdate({
        ...component,
        data_source: component.data_source
          ? { ...component.data_source, params: newParams }
          : undefined,
      });
    }
  };

  const handleDataSourceNameChange = (name: string) => {
    setDataSourceNameInput(name);
    const needsPostProcessing = component.data_source?.needs_post_processing ?? true;
    const currentParams = component.data_source?.params || {};
    onUpdate({
      ...component,
      data_source: { name, params: currentParams, needs_post_processing: needsPostProcessing },
    });
  };

  const handleDataSourceToggle = (enabled: boolean) => {
    setShowDataSource(enabled);
    if (enabled && !component.data_source) {
      onUpdate({
        ...component,
        data_source: { name: '', params: {}, needs_post_processing: true },
      });
      setDataSourceNameInput('');
      setLocalDataSourceParams('');
    } else if (!enabled) {
      onUpdate({ ...component, data_source: undefined });
    }
  };

  const handleNeedsPostProcessingChange = (checked: boolean) => {
    if (component.data_source) {
      onUpdate({
        ...component,
        data_source: { ...component.data_source, needs_post_processing: checked },
      });
    }
  };

  // 过滤数据源建议列表
  const filteredSuggestions = dataSourceOptions.filter(opt =>
    opt.toLowerCase().includes(dataSourceNameInput.toLowerCase())
  );

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
            value={component.semantic_description}
            onChange={e => onUpdate({ ...component, semantic_description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        {/* 类型 */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
            <FileText size={12} />
            类型
          </label>
          <div className="grid grid-cols-3 gap-1">
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
                {TypeNames[t]}
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

        {/* 数据示例 */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
            <Braces size={12} />
            数据示例
          </label>
          <textarea
            value={localDataExample}
            onChange={e => setLocalDataExample(e.target.value)}
            onBlur={handleDataExampleBlur}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none font-mono"
            placeholder="提供数据示例，用于约束大模型输出格式..."
          />
        </div>

        {/* 数据源配置 */}
        <div className="border border-gray-200 rounded-lg">
          <button
            onClick={() => handleDataSourceToggle(!showDataSource)}
            className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors rounded-lg"
          >
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
              <Database size={12} />
              数据源配置
            </label>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${showDataSource ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {showDataSource ? '已启用' : '未启用'}
              </span>
              {showDataSource ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
            </div>
          </button>

          {showDataSource && (
            <div className="px-3 pb-3 pt-1 space-y-3 border-t border-gray-100">
              {/* 数据源名称 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">数据源名称</label>
                <div className="relative">
                  <input
                    type="text"
                    value={dataSourceNameInput}
                    onChange={e => {
                      setDataSourceNameInput(e.target.value);
                      setShowDataSourceSuggestions(true);
                    }}
                    onFocus={() => setShowDataSourceSuggestions(true)}
                    onBlur={() => {
                      // 延迟隐藏，允许点击建议项
                      setTimeout(() => setShowDataSourceSuggestions(false), 200);
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="选择或输入数据源名称..."
                  />
                  {/* 下拉建议列表 */}
                  {showDataSourceSuggestions && filteredSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {filteredSuggestions.map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            handleDataSourceNameChange(opt);
                            setShowDataSourceSuggestions(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 数据源入参 */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                  入参配置 (JSON)
                  {!isDataSourceParamsValidJson && (
                    <div className="relative group">
                      <AlertTriangle size={12} className="text-amber-500 cursor-help" />
                      <div className="absolute left-0 top-full mt-1 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                        非JSON格式
                      </div>
                    </div>
                  )}
                </label>
                <textarea
                  value={localDataSourceParams}
                  onChange={e => setLocalDataSourceParams(e.target.value)}
                  onBlur={handleDataSourceParamsBlur}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none transition-all resize-none font-mono ${
                    !isDataSourceParamsValidJson
                      ? 'border-red-400 animate-pulse ring-2 ring-red-200 focus:ring-red-300'
                      : 'border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  }`}
                  placeholder='{"key": "value"}'
                />
              </div>

              {/* 是否需要后处理 */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-medium text-gray-600">大模型后处理</label>
                  <span className="text-xs text-gray-400">关闭后数据源输出将直接使用</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleNeedsPostProcessingChange(!component.data_source?.needs_post_processing)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    component.data_source?.needs_post_processing ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      component.data_source?.needs_post_processing ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
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
