import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Save, FolderOpen, Loader2 } from 'lucide-react';
import { SmartReportDesigner } from './components/SmartReportDesigner';
import type { SmartReportDesignerHandle } from './lib/smart-report-designer-api';
import { saveTemplate, loadTemplate } from './api/templateApi';
import {
  SMART_REPORT_IFRAME_SOURCE,
  SMART_REPORT_IFRAME_MESSAGE_TYPES,
  isSmartReportIframeRequestMessage,
  type SmartReportIframeErrorMessage,
  type SmartReportIframeExportedMessage,
  type SmartReportIframeLoadedMessage,
  type SmartReportIframeReadyMessage,
} from './lib/iframe-messaging';
import './App.css';

function App() {
  const designerApiRef = useRef<SmartReportDesignerHandle | null>(null);
  const readyMessageSentRef = useRef(false);
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const postIframeMessage = useCallback((message: unknown, targetWindow?: Window | null, targetOrigin?: string) => {
    const receiver = targetWindow ?? (window.parent !== window ? window.parent : null);
    if (!receiver) {
      return;
    }

    receiver.postMessage(message, targetOrigin && targetOrigin !== 'null' ? targetOrigin : '*');
  }, []);

  const getDesignerApi = useCallback((): SmartReportDesignerHandle => {
    const api = designerApiRef.current;
    if (!api) {
      throw new Error('编辑器尚未初始化');
    }
    return api;
  }, []);

  const handleApiReady = useCallback((api: SmartReportDesignerHandle) => {
    designerApiRef.current = api;

    if (readyMessageSentRef.current || window.parent === window) {
      return;
    }

    const readyMessage: SmartReportIframeReadyMessage = {
      source: SMART_REPORT_IFRAME_SOURCE,
      type: SMART_REPORT_IFRAME_MESSAGE_TYPES.ready,
      payload: {
        supportedRequests: [
          SMART_REPORT_IFRAME_MESSAGE_TYPES.load,
          SMART_REPORT_IFRAME_MESSAGE_TYPES.export,
        ],
      },
    };

    postIframeMessage(readyMessage);
    readyMessageSentRef.current = true;
  }, [postIframeMessage]);

  const handleSaveToBackend = useCallback(async () => {
    setIsSaving(true);

    try {
      const designer = getDesignerApi();
      const { excelFile, components } = await designer.exportTemplateData();
      const result = await saveTemplate({
        id: currentTemplateId || undefined,
        excelFile,
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
  }, [currentTemplateId, getDesignerApi]);

  const handleLoadFromBackend = useCallback(async () => {
    const templateId = prompt('请输入模板 ID:');
    if (!templateId) {
      return;
    }

    setIsLoading(true);

    try {
      const designer = getDesignerApi();
      const data = await loadTemplate(templateId);

      await designer.loadTemplateData({
        excelFile: data.excelFile,
        components: data.components,
      });

      setCurrentTemplateId(templateId);
      alert('加载成功！');
    } catch (error) {
      console.error('加载失败:', error);
      alert('加载失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsLoading(false);
    }
  }, [getDesignerApi]);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (!isSmartReportIframeRequestMessage(event.data)) {
        return;
      }

      const targetWindow = event.source && 'postMessage' in event.source
        ? event.source as Window
        : null;

      try {
        const designer = getDesignerApi();

        if (event.data.type === SMART_REPORT_IFRAME_MESSAGE_TYPES.load) {
          await designer.loadTemplateData(event.data.payload ?? {});

          const loadedMessage: SmartReportIframeLoadedMessage = {
            source: SMART_REPORT_IFRAME_SOURCE,
            type: SMART_REPORT_IFRAME_MESSAGE_TYPES.loaded,
            requestId: event.data.requestId,
            payload: {
              componentCount: designer.getComponents().length,
            },
          };

          postIframeMessage(loadedMessage, targetWindow, event.origin);
          return;
        }

        if (event.data.type === SMART_REPORT_IFRAME_MESSAGE_TYPES.export) {
          const payload = await designer.exportTemplateData();
          const exportedMessage: SmartReportIframeExportedMessage = {
            source: SMART_REPORT_IFRAME_SOURCE,
            type: SMART_REPORT_IFRAME_MESSAGE_TYPES.exported,
            requestId: event.data.requestId,
            payload,
          };

          postIframeMessage(exportedMessage, targetWindow, event.origin);
        }
      } catch (error) {
        const errorMessage: SmartReportIframeErrorMessage = {
          source: SMART_REPORT_IFRAME_SOURCE,
          type: SMART_REPORT_IFRAME_MESSAGE_TYPES.error,
          requestId: event.data.requestId,
          payload: {
            message: error instanceof Error ? error.message : '未知错误',
          },
        };

        postIframeMessage(errorMessage, targetWindow, event.origin);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [getDesignerApi, postIframeMessage]);

  const extraHeaderActions = useMemo(() => (
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
  ), [currentTemplateId, handleLoadFromBackend, handleSaveToBackend, isLoading, isSaving]);

  return (
    <SmartReportDesigner
      onApiReady={handleApiReady}
      extraHeaderActions={extraHeaderActions}
    />
  );
}

export default App;
