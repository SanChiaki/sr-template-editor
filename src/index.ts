// 样式导入
import './index.css';

// 类型导出
export type { SmartComponent, SmartComponentType } from './types/SmartComponent';
export { ComponentTypes, DefaultColors } from './types/SmartComponent';

// 组件导出
export { SmartReportDesigner, type SmartReportDesignerProps, setLicenseKey } from './components/SmartReportDesigner';
export { SpreadDesigner, type SpreadDesignerProps } from './components/SpreadDesigner';
export { ComponentLibrary, type ComponentLibraryProps } from './components/ComponentLibrary';
export { ComponentList, type ComponentListProps } from './components/ComponentList';
export { PropertiesPanel, type PropertiesPanelProps } from './components/PropertiesPanel';
export { ErrorBoundary } from './components/ErrorBoundary';

// Hooks 导出
export { useIsMobile } from './hooks/use-mobile';

// 工具函数导出
export { cn } from './lib/utils';
