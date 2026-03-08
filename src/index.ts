// 样式导入
import './index.css';

// 类型导出
export type { SmartComponent, SmartComponentType, DataSource } from './types/SmartComponent';
export { ComponentTypes, DefaultColors } from './types/SmartComponent';

// 组件导出
export {
  SmartReportDesigner,
  type SmartReportDesignerProps,
} from './components/SmartReportDesigner';
export {
  setLicenseKey,
  type SmartReportDesignerHandle,
  type SmartReportExcelSource,
  type SmartReportTemplateConfig,
  type SmartReportTemplateExportPayload,
  type SmartReportTemplateLoadPayload,
} from './lib/smart-report-designer-api';
export { SpreadDesigner, type SpreadDesignerProps } from './components/SpreadDesigner';
export { ComponentLibrary, type ComponentLibraryProps } from './components/ComponentLibrary';
export { ComponentList, type ComponentListProps } from './components/ComponentList';
export { PropertiesPanel, type PropertiesPanelProps } from './components/PropertiesPanel';
export { ErrorBoundary } from './components/ErrorBoundary';

// Hooks 导出
export { useIsMobile } from './hooks/use-mobile';

// 工具函数导出
export { cn } from './lib/utils';
export {
  SMART_REPORT_IFRAME_MESSAGE_TYPES,
  SMART_REPORT_IFRAME_SOURCE,
  isSmartReportIframeRequestMessage,
  type SmartReportIframeErrorMessage,
  type SmartReportIframeExportMessage,
  type SmartReportIframeExportedMessage,
  type SmartReportIframeLoadedMessage,
  type SmartReportIframeLoadMessage,
  type SmartReportIframeReadyMessage,
  type SmartReportIframeRequestMessage,
  type SmartReportIframeRequestType,
  type SmartReportIframeResponseMessage,
  type SmartReportIframeResponseType,
} from './lib/iframe-messaging';

// Excel 导入导出工具函数
export { exportExcel, importExcel, type ExcelExportOptions, type ExcelImportOptions } from './lib/excel-utils';
