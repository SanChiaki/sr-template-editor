import { SmartComponent } from '../types/SmartComponent';

export interface TemplateData {
  id?: string;
  name?: string;
  excelFile: Blob;
  components: SmartComponent[];
}

export interface TemplateConfig {
  id?: string;
  name?: string;
  component_list: SmartComponent[];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * 保存模板到后端（Excel + 组件配置）
 */
export async function saveTemplate(data: TemplateData): Promise<{ id: string; message: string }> {
  const formData = new FormData();

  // 添加 Excel 文件
  formData.append('excel', data.excelFile, 'template.xlsx');

  // 添加组件配置
  const config: TemplateConfig = {
    id: data.id,
    name: data.name,
    component_list: data.components,
  };
  formData.append('config', new Blob([JSON.stringify(config)], { type: 'application/json' }));

  const response = await fetch(`${API_BASE_URL}/template`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: '保存失败' }));
    throw new Error(error.message || '保存失败');
  }

  return response.json();
}

/**
 * 从后端加载模板（Excel + 组件配置）
 */
export async function loadTemplate(id: string): Promise<TemplateData> {
  const response = await fetch(`${API_BASE_URL}/template/${id}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: '加载失败' }));
    throw new Error(error.message || '加载失败');
  }

  // 假设后端返回一个包含 Excel 文件和组件配置的响应
  // 方式1: 分别请求 Excel 和配置
  const [excelBlob, configJson] = await Promise.all([
    fetch(`${API_BASE_URL}/template/${id}/excel`).then(r => {
      if (!r.ok) throw new Error('加载 Excel 失败');
      return r.blob();
    }),
    fetch(`${API_BASE_URL}/template/${id}/config`).then(r => {
      if (!r.ok) throw new Error('加载配置失败');
      return r.json() as Promise<TemplateConfig>;
    }),
  ]);

  return {
    id,
    excelFile: excelBlob,
    components: configJson.component_list || [],
  };
}

/**
 * 获取模板列表
 */
export async function getTemplateList(): Promise<Array<{ id: string; name: string; createdAt: string }>> {
  const response = await fetch(`${API_BASE_URL}/templates`);

  if (!response.ok) {
    throw new Error('获取模板列表失败');
  }

  return response.json();
}

/**
 * 删除模板
 */
export async function deleteTemplate(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/template/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('删除失败');
  }
}
