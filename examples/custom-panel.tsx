/**
 * 自定义面板示例
 * 展示如何使用自定义右侧面板
 */

import { SmartReportDesigner, SmartComponent } from 'smart-report-designer';
import 'smart-report-designer/style.css';

export default function CustomPanelExample() {
  const handleComponentsChange = (components: SmartComponent[]) => {
    console.log('Components:', components);
  };

  // 自定义右侧面板内容
  const CustomRightPanel = (
    <div style={{ padding: 20 }}>
      <h3>自定义面板</h3>
      <p>这里可以完全自定义右侧面板内容</p>
    </div>
  );

  return (
    <div style={{ height: '100vh' }}>
      <SmartReportDesigner
        onComponentsChange={handleComponentsChange}
        customRightPanel={CustomRightPanel}
        hideComponentLibrary
        hideComponentList
        hidePropertiesPanel
      />
    </div>
  );
}
