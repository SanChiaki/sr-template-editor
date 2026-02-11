import GC from '@grapecity/spread-sheets';
import { SmartReportDesigner } from './components/SmartReportDesigner';
import { SmartComponent } from './types/SmartComponent';
import './App.css';

// Set license key if available
// setLicenseKey('your-license-key');

function App() {
  // Load saved components from localStorage
  const savedComponents = localStorage.getItem('smartreport_components');
  const initialComponents: SmartComponent[] = savedComponents ? JSON.parse(savedComponents) : [];

  const handleComponentsChange = (components: SmartComponent[]) => {
    // Auto save to localStorage
    localStorage.setItem('smartreport_components', JSON.stringify(components));
  };

  const handleSpreadReady = (workbook: GC.Spread.Sheets.Workbook, designer: any) => {
    console.log('[App] SpreadJS ready:', workbook, designer);
  };

  // 导出 Excel 回调 - 可以在这里上传到服务器
  const handleExportExcel = (blob: Blob) => {
    console.log('[App] Excel exported:', blob);
    // 示例：上传到服务器
    // const formData = new FormData();
    // formData.append('file', blob, 'template.xlsx');
    // fetch('/api/upload', { method: 'POST', body: formData });
  };

  // 导入 Excel 回调 - 从外部系统获取组件配置
  const handleImportExcel = async (file: File): Promise<SmartComponent[]> => {
    console.log('[App] Excel imported:', file);

    // 示例：从服务器获取组件配置
    // 实际项目中，这里可以调用 API 获取与 Excel 文件关联的组件配置
    // const response = await fetch(`/api/components?filename=${file.name}`);
    // return response.json();

    // 示例：从 localStorage 读取上次保存的组件配置
    const saved = localStorage.getItem('smartreport_components');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }

    return [];
  };

  return (
    <SmartReportDesigner
      initialComponents={initialComponents}
      onComponentsChange={handleComponentsChange}
      onSpreadReady={handleSpreadReady}
      onExportExcel={handleExportExcel}
      onImportExcel={handleImportExcel}
    />
  );
}

export default App;
