/**
 * 基础用法示例
 * 展示如何在项目中引入和使用 smart-report-designer
 */

import { SmartReportDesigner, setLicenseKey, SmartComponent } from 'smart-report-designer';
import GC from '@grapecity/spread-sheets';
import 'smart-report-designer/style.css';

// 设置 SpreadJS 许可证（如果有的话）
// setLicenseKey('your-spreadjs-sheets-license-key', 'your-spreadjs-designer-license-key');

export default function Example() {
  // 可选：加载初始组件
  const initialComponents: SmartComponent[] = [
    {
      id: '1',
      name: '标题文本',
      type: 'Text',
      location: 'B2:D2',
      prompt: '生成报表标题',
    },
    {
      id: '2',
      name: '数据表格',
      type: 'Table',
      location: 'B4:F15',
      prompt: '生成销售数据表格，包含产品名称、销量、金额',
    },
  ];

  const handleComponentsChange = (components: SmartComponent[]) => {
    console.log('组件列表变更:', components);
    // 可以在这里保存到后端或 localStorage
  };

  const handleSpreadReady = (workbook: GC.Spread.Sheets.Workbook, designer: any) => {
    console.log('SpreadJS 就绪', workbook);
    // 可以在这里操作 workbook
  };

  const handleExport = (config: { component_list: SmartComponent[] }) => {
    console.log('导出配置:', config);
    // 可以自定义导出逻辑
  };

  return (
    <div style={{ height: '100vh' }}>
      <SmartReportDesigner
        initialComponents={initialComponents}
        onComponentsChange={handleComponentsChange}
        onSpreadReady={handleSpreadReady}
        onExport={handleExport}
        title="我的报表"
      />
    </div>
  );
}
