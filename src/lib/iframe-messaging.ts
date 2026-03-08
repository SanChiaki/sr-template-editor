import type {
  SmartReportTemplateExportPayload,
  SmartReportTemplateLoadPayload,
} from './smart-report-designer-api';

export const SMART_REPORT_IFRAME_SOURCE = 'smart-report-editor';

export const SMART_REPORT_IFRAME_MESSAGE_TYPES = {
  load: 'smart-report:load',
  export: 'smart-report:export',
  ready: 'smart-report:ready',
  loaded: 'smart-report:loaded',
  exported: 'smart-report:exported',
  error: 'smart-report:error',
} as const;

export type SmartReportIframeRequestType =
  | typeof SMART_REPORT_IFRAME_MESSAGE_TYPES.load
  | typeof SMART_REPORT_IFRAME_MESSAGE_TYPES.export;

export type SmartReportIframeResponseType =
  | typeof SMART_REPORT_IFRAME_MESSAGE_TYPES.ready
  | typeof SMART_REPORT_IFRAME_MESSAGE_TYPES.loaded
  | typeof SMART_REPORT_IFRAME_MESSAGE_TYPES.exported
  | typeof SMART_REPORT_IFRAME_MESSAGE_TYPES.error;

export interface SmartReportIframeRequestMessage<TPayload = unknown> {
  type: SmartReportIframeRequestType;
  requestId?: string;
  payload?: TPayload;
}

export interface SmartReportIframeReadyPayload {
  supportedRequests: SmartReportIframeRequestType[];
}

export interface SmartReportIframeLoadedPayload {
  componentCount: number;
}

export interface SmartReportIframeErrorPayload {
  message: string;
}

export interface SmartReportIframeResponseMessage<TPayload = unknown> {
  source: typeof SMART_REPORT_IFRAME_SOURCE;
  type: SmartReportIframeResponseType;
  requestId?: string;
  payload?: TPayload;
}

export type SmartReportIframeLoadMessage = SmartReportIframeRequestMessage<SmartReportTemplateLoadPayload>;
export type SmartReportIframeExportMessage = SmartReportIframeRequestMessage<void>;

export type SmartReportIframeReadyMessage =
  SmartReportIframeResponseMessage<SmartReportIframeReadyPayload>;

export type SmartReportIframeLoadedMessage =
  SmartReportIframeResponseMessage<SmartReportIframeLoadedPayload>;

export type SmartReportIframeExportedMessage =
  SmartReportIframeResponseMessage<SmartReportTemplateExportPayload>;

export type SmartReportIframeErrorMessage =
  SmartReportIframeResponseMessage<SmartReportIframeErrorPayload>;

const REQUEST_TYPES = new Set<SmartReportIframeRequestType>([
  SMART_REPORT_IFRAME_MESSAGE_TYPES.load,
  SMART_REPORT_IFRAME_MESSAGE_TYPES.export,
]);

export const isSmartReportIframeRequestMessage = (
  value: unknown
): value is SmartReportIframeRequestMessage => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const maybeMessage = value as Partial<SmartReportIframeRequestMessage>;

  return typeof maybeMessage.type === 'string' && REQUEST_TYPES.has(maybeMessage.type as SmartReportIframeRequestType);
};
