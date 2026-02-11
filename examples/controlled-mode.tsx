/**
 * 受控模式示例
 * 展示如何在受控模式下使用组件
 */

import { useState, useCallback } from 'react';
import { SmartReportDesigner, SmartComponent } from 'smart-report-designer';
import 'smart-report-designer/style.css';

export default function ControlledExample() {
  const [components, setComponents] = useState<SmartComponent[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<SmartComponent | null>(null);

  const handleComponentsChange = useCallback((newComponents: SmartComponent[]) => {
    setComponents(newComponents);
    // 同步保存到后端
    // await saveToBackend(newComponents);
  }, []);

  const handleSelectComponent = useCallback((comp: SmartComponent | null) => {
    setSelectedComponent(comp);
    console.log('选中组件:', comp);
  }, []);

  // 手动添加组件
  const handleAddComponent = () => {
    const newComp: SmartComponent = {
      id: Date.now().toString(),
      name: `组件 ${components.length + 1}`,
      type: 'Text',
      location: 'A1:B2',
      prompt: '',
    };

    // 通过 window API 添加（或通过 ref 访问组件实例）
    const api = (window as any).smartReportDesigner;
    if (api) {
      api.addComponent(newComp);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 10, borderBottom: '1px solid #eee', background: '#f5f5f5' }}>
        <button onClick={handleAddComponent}>添加组件</button>
        <span style={{ marginLeft: 20 }}>
          组件数: {components.length}
          {selectedComponent && ` | 选中: ${selectedComponent.name}`}
        </span>
      </div>

      <div style={{ flex: 1 }}>
        <SmartReportDesigner
          initialComponents={components}
          onComponentsChange={handleComponentsChange}
          onSelectComponent={handleSelectComponent}
          hideImportExport
          extraHeaderActions={
            <button onClick={handleAddComponent}>+ 添加</button>
          }
        />
      </div>
    </div>
  );
}
