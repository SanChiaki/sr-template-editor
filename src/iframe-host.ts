import './iframe-host.css';
import type { SmartComponent } from './types/SmartComponent';
import {
  SMART_REPORT_IFRAME_SOURCE,
  SMART_REPORT_IFRAME_MESSAGE_TYPES,
  type SmartReportIframeErrorMessage,
  type SmartReportIframeExportedMessage,
  type SmartReportIframeLoadedMessage,
  type SmartReportIframeReadyMessage,
  type SmartReportIframeRequestMessage,
} from './lib/iframe-messaging';

const root = document.getElementById('iframe-host-root');

if (!root) {
  throw new Error('iframe host root 不存在');
}

root.innerHTML = `
  <main class="host-shell">
    <section class="host-panel">
      <p class="host-eyebrow">External Host Demo</p>
      <h1 class="host-title">iframe 宿主页</h1>
      <p class="host-subtitle">
        这个页面模拟外部系统，以 iframe 嵌入当前编辑器，并通过 postMessage 验证 ready、load、export 三段通信。
      </p>

      <section class="host-status-card">
        <div class="host-status-row">
          <span class="host-status-label">连接状态</span>
          <span id="host-status-pill" class="host-status-pill" data-tone="idle">等待编辑器就绪</span>
        </div>
        <div class="host-status-row">
          <span class="host-status-label">最后一次请求</span>
          <strong id="host-request-id">-</strong>
        </div>
      </section>

      <section class="host-actions">
        <h2 class="host-section-title">操作</h2>
        <button id="host-load-button" class="host-button host-button-primary" disabled>加载示例模板</button>
        <button id="host-export-button" class="host-button host-button-secondary" disabled>导出当前模板</button>
      </section>

      <section class="host-export">
        <h2 class="host-section-title">导出结果</h2>
        <div class="host-metrics">
          <div class="host-metric">
            <span class="host-metric-label">组件数量</span>
            <strong id="host-component-count" class="host-metric-value">0</strong>
          </div>
          <div class="host-metric">
            <span class="host-metric-label">Excel 大小</span>
            <strong id="host-excel-size" class="host-metric-value">0 B</strong>
          </div>
        </div>
        <div class="host-link-row">
          <a id="host-download-excel" class="host-link" href="#" download="exported-template.xlsx" hidden>下载导出 Excel</a>
          <a id="host-download-json" class="host-link" href="#" download="exported-template.json" hidden>下载导出 JSON</a>
        </div>
        <pre id="host-json-preview" class="host-json-preview">等待导出结果...</pre>
      </section>

      <section class="host-log">
        <h2 class="host-section-title">消息日志</h2>
        <ol id="host-log-list" class="host-log-list"></ol>
      </section>
    </section>

    <section class="host-stage">
      <iframe
        id="host-editor-frame"
        class="host-iframe"
        title="SmartReport Editor"
        src="${new URL('./', window.location.href).toString()}"
      ></iframe>
    </section>
  </main>
`;

const frame = document.getElementById('host-editor-frame') as HTMLIFrameElement;
const statusPill = document.getElementById('host-status-pill') as HTMLSpanElement;
const requestIdNode = document.getElementById('host-request-id') as HTMLElement;
const loadButton = document.getElementById('host-load-button') as HTMLButtonElement;
const exportButton = document.getElementById('host-export-button') as HTMLButtonElement;
const componentCountNode = document.getElementById('host-component-count') as HTMLElement;
const excelSizeNode = document.getElementById('host-excel-size') as HTMLElement;
const jsonPreviewNode = document.getElementById('host-json-preview') as HTMLElement;
const downloadExcelLink = document.getElementById('host-download-excel') as HTMLAnchorElement;
const downloadJsonLink = document.getElementById('host-download-json') as HTMLAnchorElement;
const logList = document.getElementById('host-log-list') as HTMLOListElement;

const sampleComponents: SmartComponent[] = [
  {
    id: 'demo-title',
    location: 'A1:E2',
    type: 'Text',
    prompt: '展示报表标题',
    semantic_description: '报表标题',
  },
  {
    id: 'demo-summary-table',
    location: 'A4:F9',
    type: 'Table',
    prompt: '按季度展示销售额和利润',
    semantic_description: '季度经营概览',
  },
  {
    id: 'demo-chart',
    location: 'H4:M12',
    type: 'Chart',
    prompt: '展示季度销售走势',
    semantic_description: '销售趋势图',
  },
];

let isEditorReady = false;
let hasAutoLoaded = false;
let activeExcelUrl: string | null = null;
let activeJsonUrl: string | null = null;

const setStatus = (text: string, tone: 'idle' | 'ready' | 'loaded' | 'exported' | 'error') => {
  statusPill.textContent = text;
  statusPill.dataset.tone = tone;
};

const appendLog = (message: string) => {
  const item = document.createElement('li');
  item.textContent = `${new Date().toLocaleTimeString('zh-CN', { hour12: false })} ${message}`;
  logList.prepend(item);
};

const updateButtons = () => {
  loadButton.disabled = !isEditorReady;
  exportButton.disabled = !isEditorReady;
};

const setLastRequest = (requestId: string) => {
  requestIdNode.textContent = requestId;
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const revokeExportUrls = () => {
  if (activeExcelUrl) {
    URL.revokeObjectURL(activeExcelUrl);
    activeExcelUrl = null;
  }

  if (activeJsonUrl) {
    URL.revokeObjectURL(activeJsonUrl);
    activeJsonUrl = null;
  }
};

const postToEditor = (message: SmartReportIframeRequestMessage) => {
  if (!frame.contentWindow) {
    throw new Error('iframe 尚未准备好');
  }

  frame.contentWindow.postMessage(message, window.location.origin);
};

const createRequestId = (prefix: string) => {
  const randomPart = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${randomPart}`;
};

const createSampleExcelBlob = async (): Promise<Blob> => {
  const spreadModule = await import('@grapecity/spread-sheets');
  const excelIOModule = await import('@grapecity/spread-excelio');
  const GC = spreadModule.default ?? spreadModule;
  const excelIO = new (excelIOModule as any).IO();
  const tempHost = document.createElement('div');

  tempHost.style.position = 'fixed';
  tempHost.style.left = '-20000px';
  tempHost.style.top = '0';
  tempHost.style.width = '1280px';
  tempHost.style.height = '720px';
  document.body.appendChild(tempHost);

  try {
    const workbook = new GC.Spread.Sheets.Workbook(tempHost);
    const sheet = workbook.getActiveSheet();

    sheet.name('经营概览');
    sheet.setValue(0, 0, '2026 年经营分析');
    sheet.setValue(2, 0, '季度');
    sheet.setValue(2, 1, '销售额');
    sheet.setValue(2, 2, '利润');
    sheet.setValue(3, 0, 'Q1');
    sheet.setValue(3, 1, 1280);
    sheet.setValue(3, 2, 286);
    sheet.setValue(4, 0, 'Q2');
    sheet.setValue(4, 1, 1560);
    sheet.setValue(4, 2, 332);
    sheet.setValue(5, 0, 'Q3');
    sheet.setValue(5, 1, 1490);
    sheet.setValue(5, 2, 301);
    sheet.setValue(6, 0, 'Q4');
    sheet.setValue(6, 1, 1720);
    sheet.setValue(6, 2, 388);
    sheet.setFormula(8, 1, 'SUM(B4:B7)');
    sheet.setFormula(8, 2, 'SUM(C4:C7)');
    sheet.setValue(8, 0, '全年');
    sheet.getCell(0, 0).font('bold 18px Arial');
    sheet.getRange(2, 0, 1, 3).font('bold 12px Arial');
    sheet.autoFitColumn(0);
    sheet.autoFitColumn(1);
    sheet.autoFitColumn(2);

    const json = workbook.toJSON();

    return await new Promise<Blob>((resolve, reject) => {
      excelIO.save(json, (blob: Blob) => resolve(blob), (error: any) => {
        reject(new Error(error?.errorMessage || '生成示例 Excel 失败'));
      });
    });
  } finally {
    tempHost.remove();
  }
};

const loadSampleTemplate = async () => {
  const requestId = createRequestId('load');
  setLastRequest(requestId);
  setStatus('正在发送 load 请求', 'ready');
  appendLog(`发送 load 请求 ${requestId}`);

  const excelFile = await createSampleExcelBlob();
  postToEditor({
    type: SMART_REPORT_IFRAME_MESSAGE_TYPES.load,
    requestId,
    payload: {
      excelFile,
      components: {
        template_id: 'iframe-demo-template',
        version: '1.0.0',
        component_list: sampleComponents,
      },
    },
  });
};

const exportCurrentTemplate = () => {
  const requestId = createRequestId('export');
  setLastRequest(requestId);
  setStatus('正在发送 export 请求', 'ready');
  appendLog(`发送 export 请求 ${requestId}`);

  postToEditor({
    type: SMART_REPORT_IFRAME_MESSAGE_TYPES.export,
    requestId,
  });
};

loadButton.addEventListener('click', () => {
  void loadSampleTemplate().catch((error) => {
    setStatus('load 请求失败', 'error');
    appendLog(`load 请求异常: ${error instanceof Error ? error.message : '未知错误'}`);
  });
});

exportButton.addEventListener('click', () => {
  try {
    exportCurrentTemplate();
  } catch (error) {
    setStatus('export 请求失败', 'error');
    appendLog(`export 请求异常: ${error instanceof Error ? error.message : '未知错误'}`);
  }
});

window.addEventListener('message', (event: MessageEvent) => {
  if (event.source !== frame.contentWindow) {
    return;
  }

  const message = event.data as
    | SmartReportIframeReadyMessage
    | SmartReportIframeLoadedMessage
    | SmartReportIframeExportedMessage
    | SmartReportIframeErrorMessage
    | undefined;

  if (!message || message.source !== SMART_REPORT_IFRAME_SOURCE) {
    return;
  }

  if (message.requestId) {
    setLastRequest(message.requestId);
  }

  if (message.type === SMART_REPORT_IFRAME_MESSAGE_TYPES.ready) {
    isEditorReady = true;
    updateButtons();
    setStatus('编辑器已就绪', 'ready');
    appendLog('收到 ready 事件');

    if (!hasAutoLoaded) {
      hasAutoLoaded = true;
      void loadSampleTemplate().catch((error) => {
        setStatus('自动 load 失败', 'error');
        appendLog(`自动 load 失败: ${error instanceof Error ? error.message : '未知错误'}`);
      });
    }

    return;
  }

  if (message.type === SMART_REPORT_IFRAME_MESSAGE_TYPES.loaded) {
    const payload = (message as SmartReportIframeLoadedMessage).payload;
    const componentCount = payload?.componentCount ?? 0;
    componentCountNode.textContent = String(componentCount);
    setStatus('模板加载完成', 'loaded');
    appendLog(`收到 loaded 事件，组件数 ${componentCount}`);
    return;
  }

  if (message.type === SMART_REPORT_IFRAME_MESSAGE_TYPES.exported) {
    const payload = (message as SmartReportIframeExportedMessage).payload;
    if (!payload) {
      return;
    }

    revokeExportUrls();
    activeExcelUrl = URL.createObjectURL(payload.excelFile);
    activeJsonUrl = URL.createObjectURL(new Blob([JSON.stringify(payload.config, null, 2)], {
      type: 'application/json',
    }));

    downloadExcelLink.href = activeExcelUrl;
    downloadExcelLink.hidden = false;
    downloadJsonLink.href = activeJsonUrl;
    downloadJsonLink.hidden = false;
    componentCountNode.textContent = String(payload.components.length);
    excelSizeNode.textContent = formatBytes(payload.excelFile.size);
    jsonPreviewNode.textContent = JSON.stringify(payload.config, null, 2);
    setStatus('导出完成', 'exported');
    appendLog(`收到 exported 事件，Excel ${formatBytes(payload.excelFile.size)}`);
    return;
  }

  if (message.type === SMART_REPORT_IFRAME_MESSAGE_TYPES.error) {
    const payload = (message as SmartReportIframeErrorMessage).payload;
    setStatus('编辑器返回错误', 'error');
    appendLog(`收到 error 事件: ${payload?.message || '未知错误'}`);
  }
});

window.addEventListener('beforeunload', () => {
  revokeExportUrls();
});

updateButtons();
appendLog('宿主页已启动，等待 iframe 中的编辑器发送 ready 事件');
