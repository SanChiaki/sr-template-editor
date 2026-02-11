import * as ExcelIO from '@grapecity/spread-excelio';
import type { SmartComponent } from '../types/SmartComponent';

export interface ExcelExportOptions {
  /** 文件名 */
  filename?: string;
  /** 导出密码 */
  password?: string;
  /** 是否使用 xlsx 严格模式 */
  xlsxStrictMode?: boolean;
}

export interface ExcelImportOptions {
  /** 导入密码 */
  password?: string;
  /** 是否将图片作为浮动对象导入 */
  importPictureAsFloatingObject?: boolean;
}

/**
 * 导出 Excel 文件
 * @param spread SpreadJS Workbook 实例
 * @param options 导出选项
 * @returns Promise<Blob>
 */
export function exportExcel(
  spread: any,
  options: ExcelExportOptions = {}
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const excelIO = new (ExcelIO as any).IO();
      const json = spread.toJSON();

      const saveOptions: any = {};
      if (options.password) saveOptions.password = options.password;
      if (options.xlsxStrictMode !== undefined) saveOptions.xlsxStrictMode = options.xlsxStrictMode;

      excelIO.save(
        json,
        (blob: Blob) => {
          // 自动下载
          const filename = options.filename || 'template.xlsx';
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);

          resolve(blob);
        },
        (error: any) => {
          reject(new Error(error?.errorMessage || '导出 Excel 失败'));
        },
        saveOptions
      );
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 导入 Excel 文件
 * @param file Excel 文件
 * @param spread SpreadJS Workbook 实例
 * @param options 导入选项
 * @returns Promise<void>
 */
export function importExcel(
  file: File,
  spread: any,
  options: ExcelImportOptions = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const excelIO = new (ExcelIO as any).IO();

      const openOptions: any = {};
      if (options.password) openOptions.password = options.password;
      if (options.importPictureAsFloatingObject !== undefined) {
        openOptions.importPictureAsFloatingObject = options.importPictureAsFloatingObject;
      }

      excelIO.open(
        file,
        (json: any) => {
          spread.fromJSON(json);
          resolve();
        },
        (error: any) => {
          reject(new Error(error?.errorMessage || '导入 Excel 失败'));
        },
        openOptions
      );
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 解析 Excel 文件为 JSON
 * @param file Excel 文件
 * @param options 导入选项
 * @returns Promise<any> SpreadJS JSON
 */
export function parseExcelToJSON(
  file: File,
  options: ExcelImportOptions = {}
): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      const excelIO = new (ExcelIO as any).IO();

      const openOptions: any = {};
      if (options.password) openOptions.password = options.password;
      if (options.importPictureAsFloatingObject !== undefined) {
        openOptions.importPictureAsFloatingObject = options.importPictureAsFloatingObject;
      }

      excelIO.open(
        file,
        (json: any) => {
          resolve(json);
        },
        (error: any) => {
          reject(new Error(error?.errorMessage || '解析 Excel 失败'));
        },
        openOptions
      );
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 将组件数据嵌入到 Excel 的自定义属性中
 * 用于在导入时恢复组件信息
 * @param spread SpreadJS Workbook 实例
 * @param components 组件列表
 */
export function embedComponentsToExcel(
  spread: any,
  components: SmartComponent[]
): void {
  const json = spread.toJSON();
  if (!json.customProperties) {
    json.customProperties = {};
  }
  json.customProperties['smartReportComponents'] = JSON.stringify(components);
  spread.fromJSON(json);
}

/**
 * 从 Excel 的自定义属性中提取组件数据
 * @param spread SpreadJS Workbook 实例
 * @returns SmartComponent[] 组件列表
 */
export function extractComponentsFromExcel(
  spread: any
): SmartComponent[] {
  const json = spread.toJSON();
  const customProps = json.customProperties || {};
  const componentsStr = customProps['smartReportComponents'];

  if (componentsStr) {
    try {
      return JSON.parse(componentsStr) as SmartComponent[];
    } catch {
      return [];
    }
  }
  return [];
}
