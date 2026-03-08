import GC from '@grapecity/spread-sheets';
import * as ExcelIO from '@grapecity/spread-excelio';
import type { SmartComponent } from '../types/SmartComponent';

export const setLicenseKey = (sheetsLicenseKey: string, designerLicenseKey: string) => {
  (GC.Spread.Sheets as any).LicenseKey = (ExcelIO as any).LicenseKey = sheetsLicenseKey;
  (GC.Spread.Sheets as any).Designer.LicenseKey = designerLicenseKey;
};

export type SmartReportExcelSource = Blob | File | ArrayBuffer | ArrayBufferView | string;

export interface SmartReportTemplateConfig {
  template_id?: string;
  version?: string;
  component_list: SmartComponent[];
}

export interface SmartReportTemplateLoadPayload {
  excelFile?: SmartReportExcelSource;
  components?: SmartComponent[] | SmartReportTemplateConfig | string;
}

export interface SmartReportTemplateExportPayload {
  excelFile: Blob;
  components: SmartComponent[];
  config: SmartReportTemplateConfig;
}

export interface SmartReportDesignerHandle {
  getComponents: () => SmartComponent[];
  getSpread: () => GC.Spread.Sheets.Workbook | null;
  getDesigner: () => any;
  setSelectedComponent: (id: string | null) => void;
  clearComponents: () => void;
  loadComponents: (components: SmartComponent[]) => void;
  loadTemplateData: (payload: SmartReportTemplateLoadPayload) => Promise<void>;
  exportCleanExcel: () => Promise<Blob>;
  exportTemplateData: () => Promise<SmartReportTemplateExportPayload>;
  rebindEvents: () => void;
  addComponent: (comp: Omit<SmartComponent, 'id'>) => SmartComponent;
  exportExcel: () => Promise<void>;
  importExcel: () => void;
  debug: () => void;
}
