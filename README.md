# Smart Report Designer - 智能报表设计器

基于 SpreadJS 的智能报表设计器 React 组件库，支持可视化组件管理和模板配置。

## 安装

```bash
npm install smart-report-designer
# 或
pnpm add smart-report-designer
# 或
yarn add smart-report-designer
```

## 依赖要求

本库需要以下 peer dependencies：

```bash
npm install react react-dom \
  @grapecity/spread-sheets \
  @grapecity/spread-sheets-designer \
  @grapecity/spread-sheets-designer-react \
  @grapecity/spread-sheets-shapes \
  @grapecity/spread-sheets-charts \
  @grapecity/spread-sheets-resources-zh \
  @grapecity/spread-sheets-designer-resources-cn
```

## 基础用法

```tsx
import { SmartReportDesigner } from 'smart-report-designer';
import 'smart-report-designer/style.css';

function App() {
  return (
    <SmartReportDesigner
      onComponentsChange={(components) => {
        console.log('Components changed:', components);
      }}
    />
  );
}
```

## 高级用法

```tsx
import { SmartReportDesigner, setLicenseKey, SmartComponent } from 'smart-report-designer';
import GC from '@grapecity/spread-sheets';
import 'smart-report-designer/style.css';

// 设置 SpreadJS 许可证（可选）
setLicenseKey('your-spreadjs-license-key', 'your-designer-license-key');

function App() {
  const initialComponents: SmartComponent[] = [
    {
      id: '1',
      name: '销售表格',
      type: 'Table',
      location: 'A1:D10',
      prompt: '生成销售数据表格',
    }
  ];

  const handleSpreadReady = (workbook: GC.Spread.Sheets.Workbook, designer: any) => {
    console.log('SpreadJS ready', workbook);
  };

  return (
    <SmartReportDesigner
      initialComponents={initialComponents}
      onComponentsChange={(comps) => console.log('Changed:', comps)}
      onSelectComponent={(comp) => console.log('Selected:', comp)}
      onSpreadReady={handleSpreadReady}
      onExport={(config) => console.log('Export:', config)}
      onConflict={(msg) => alert(msg)}
    />
  );
}
```

## Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `initialComponents` | `SmartComponent[]` | `[]` | 初始组件列表 |
| `onComponentsChange` | `(components: SmartComponent[]) => void` | - | 组件变更回调 |
| `onSelectComponent` | `(component: SmartComponent \| null) => void` | - | 选中组件变更回调 |
| `onSpreadReady` | `(workbook, designer) => void` | - | SpreadJS 就绪回调 |
| `onExport` | `(config) => void` | - | 导出配置回调 |
| `onConflict` | `(message: string) => void` | - | 区域冲突警告回调 |
| `title` | `ReactNode` | `"SmartReport"` | 头部标题 |
| `rightPanelWidth` | `number` | `340` | 右侧面板宽度(px) |
| `hideComponentLibrary` | `boolean` | `false` | 隐藏组件库 |
| `hideComponentList` | `boolean` | `false` | 隐藏组件列表 |
| `hidePropertiesPanel` | `boolean` | `false` | 隐藏属性面板 |
| `hideImportExport` | `boolean` | `false` | 隐藏导入导出按钮 |
| `extraHeaderActions` | `ReactNode` | - | 额外的头部操作按钮 |
| `customRightPanel` | `ReactNode` | - | 自定义右侧面板内容 |

## 类型定义

```typescript
interface SmartComponent {
  id: string;
  location: string;      // Excel区域，如 "A1:B2"
  type: 'Text' | 'Table' | 'Chart' | 'List' | 'Milestone' | 'Gantt';
  prompt: string;        // AI提示词
  name: string;          // 组件名称
  style?: {
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
  };
}
```

## 导出组件

除了主组件外，还可以单独使用子组件：

```tsx
import {
  SmartReportDesigner,  // 主组件
  SpreadDesigner,       // SpreadJS 设计器
  ComponentLibrary,     // 组件库面板
  ComponentList,        // 组件列表面板
  PropertiesPanel,      // 属性面板
} from 'smart-report-designer';
```

## 许可证

SpreadJS 是 GrapeCity 公司的商业软件产品，需要有效的许可证才能去除水印。获取许可证请访问 [GrapeCity 官网](https://www.grapecity.com/spreadjs)。

```tsx
import { setLicenseKey } from 'smart-report-designer';

// 设置 SpreadJS Sheets 和 Designer 许可证
setLicenseKey('your-spreadjs-sheets-license-key', 'your-spreadjs-designer-license-key');
```

## 开发

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建库
pnpm build:lib

# 构建应用
pnpm build
```
