import { useState, useRef, useCallback } from 'react';
import GC from '@grapecity/spread-sheets';
import { SmartReportDesigner, setLicenseKey } from './components/SmartReportDesigner';
import { SmartComponent } from './types/SmartComponent';
import { saveTemplate, loadTemplate } from './api/templateApi';
import { Save, FolderOpen, Loader2 } from 'lucide-react';
import './App.css';

// Set license key if available
// setLicenseKey('your-spreadjs-sheets-license-key', 'your-spreadjs-designer-license-key');

function App() {
  // Load saved components from localStorage
  const savedComponents = localStorage.getItem('smartreport_components');
  const initialComponents: SmartComponent[] = savedComponents ? JSON.parse(savedComponents) : [];

  // 保存当前的 Excel Blob 引用
  const currentExcelBlobRef = useRef<Blob | null>(null);
  // 当前的模板 ID（用于更新）
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);
  // 加载/保存状态
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleComponentsChange = (components: SmartComponent[]) => {
    // Auto save to localStorage
    localStorage.setItem('smartreport_components', JSON.stringify(components));
  };

  const handleSpreadReady = (workbook: GC.Spread.Sheets.Workbook, designer: any) => {
    console.log('[App] SpreadJS ready:', workbook, designer);
  };

  // 导出 Excel 回调 - 保存 Blob 引用
  const handleExportExcel = (blob: Blob) => {
    console.log('[App] Excel exported:', blob);
    currentExcelBlobRef.current = blob;
  };

  // 导入 Excel 回调 - 从外部系统获取组件配置
  const handleImportExcel = async (file: File): Promise<SmartComponent[]> => {
    console.log('[App] Excel imported:', file);
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

  // 保存到后端
  const handleSaveToBackend = useCallback(async () => {
    const designer = (window as any).smartReportDesigner;
    if (!designer) {
      alert('编辑器尚未初始化');
      return;
    }

    setIsSaving(true);
    try {
      // 1. 获取当前的 Excel Blob
      let excelBlob = currentExcelBlobRef.current;

      if (!excelBlob) {
        // 如果没有缓存的 Blob，重新导出
        excelBlob = await new Promise<Blob>((resolve, reject) => {
          const spread = designer.getSpread();
          if (!spread) {
            reject(new Error('SpreadJS 尚未初始化'));
            return;
          }

          // 动态导入 ExcelIO
          import('@grapecity/spread-excelio').then((ExcelIO) => {
            const excelIO = new (ExcelIO as any).IO();
            const json = spread.toJSON();
            excelIO.save(json, (blob: Blob) => resolve(blob), (error: any) => reject(error));
          });
        });
      }

      // 2. 获取当前的组件列表
      const components = designer.getComponents();

      // 3. 调用 API 保存
      const result = await saveTemplate({
        id: currentTemplateId || undefined,
        excelFile: excelBlob,
        components,
      });

      setCurrentTemplateId(result.id);
      alert('保存成功！模板 ID: ' + result.id);
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsSaving(false);
    }
  }, [currentTemplateId]);

  // 从后端加载
  const handleLoadFromBackend = useCallback(async () => {
    const templateId = prompt('请输入模板 ID:');
    if (!templateId) return;

    setIsLoading(true);
    try {
      const designer = (window as any).smartReportDesigner;
      if (!designer) {
        alert('编辑器尚未初始化');
        return;
      }

      // 1. 从后端加载数据
      const data = await loadTemplate(templateId);

      // 2. 加载 Excel 到 SpreadJS
      const spread = designer.getSpread();
      if (!spread) {
        alert('SpreadJS 尚未初始化');
        return;
      }

      // 动态导入 ExcelIO
      const ExcelIO = await import('@grapecity/spread-excelio');
      const excelIO = new (ExcelIO as any).IO();

      // 读取 Excel Blob
      const file = new File([data.excelFile], 'template.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      excelIO.open(file, (json: any) => {
        spread.fromJSON(json);

        // 3. 清除现有 shapes
        designer.clearComponents();

        // 4. 设置新组件
        localStorage.setItem('smartreport_components', JSON.stringify(data.components));
        setCurrentTemplateId(templateId);

        // 5. 触发重新渲染（需要等待 SpreadJS 完成）
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }, (error: any) => {
        console.error('加载 Excel 失败:', error);
        alert('加载 Excel 失败: ' + (error?.errorMessage || '未知错误'));
      });
    } catch (error) {
      console.error('加载失败:', error);
      alert('加载失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 自定义头部按钮
  const extraHeaderActions = (
    <>
      <button
        onClick={handleSaveToBackend}
        disabled={isSaving || isLoading}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        title="保存到后端"
      >
        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        {isSaving ? '保存中...' : '保存到后端'}
      </button>
      <button
        onClick={handleLoadFromBackend}
        disabled={isSaving || isLoading}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-100 text-cyan-700 rounded-lg hover:bg-cyan-200 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        title="从后端加载"
      >
        {isLoading ? <Loader2 size={14} className="animate-spin" /> : <FolderOpen size={14} />}
        {isLoading ? '加载中...' : '从后端加载'}
      </button>
      {currentTemplateId && (
        <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
          当前模板: {currentTemplateId}
        </span>
      )}
    </>
  );

  return (
    <SmartReportDesigner
      initialComponents={initialComponents}
      onComponentsChange={handleComponentsChange}
      onSpreadReady={handleSpreadReady}
      onExportExcel={handleExportExcel}
      onImportExcel={handleImportExcel}
      extraHeaderActions={extraHeaderActions}
    />
  );
}

export default App;
