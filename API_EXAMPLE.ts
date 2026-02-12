/**
 * 后端 API 宥口规范示例
 *
 * 这是一个示例文件，说明后端应该如何实现 API 接口
 * 实际项目中，请根据你的后端技术栈（Node.js/Java/Python 等）进行实现
 */

// ============================================
// POST /api/template - 保存模板
// ============================================
// 请求: multipart/form-data
// - excel: Excel 文件 (Blob)
// - config: JSON 配置文件，包含组件列表
//
// 响应:
// {
//   "id": "template-123",
//   "message": "保存成功"
// }

// ============================================
// GET /api/template/:id - 获取模板
// ============================================
// 响应: 包含 Excel 文件和配置信息

// ============================================
// GET /api/template/:id/excel - 获取 Excel 文件
// ============================================
// 响应: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet

// ============================================
// GET /api/template/:id/config - 获取组件配置
// ============================================
// 响应:
// {
//   "id": "template-123",
//   "name": "报表模板名称",
//   "component_list": [
//     {
//       "id": "component-1",
//       "location": "A1:B2",
//       "type": "Text",
//       "prompt": "标题文本",
//       "name": "文本 1",
//       "style": {
//         "backgroundColor": "#fff",
//         "borderColor": "#3b82f6",
//         "textColor": "#000"
//       }
//     }
//   ]
// }

// ============================================
// GET /api/templates - 获取模板列表
// ============================================
// 响应:
// [
//   {
//     "id": "template-123",
//     "name": "报表模板1",
//     "createdAt": "2024-01-15T10:30:00Z"
//   }
// ]

// ============================================
// DELETE /api/template/:id - 删除模板
// ============================================
// 响应: 204 No Content

/**
 * Node.js Express 示例实现
 *
 * ```javascript
 * const express = require('express');
 * const multer = require('multer');
 * const fs = require('fs');
 * const path = require('path');
 *
 * const app = express();
 * const upload = multer({ dest: 'uploads/' });
 *
 * // 保存模板
 * app.post('/api/template', upload.fields([
 *   { name: 'excel', maxCount: 1 },
 *   { name: 'config', maxCount: 1 }
 * ]), async (req, res) => {
 *   const id = Date.now().toString();
 *   const excelFile = req.files['excel'][0];
 *   const configFile = req.files['config'][0];
 *
 *   // 保存文件
 *   const templateDir = path.join('templates', id);
 *   fs.mkdirSync(templateDir, { recursive: true });
 *
 *   fs.renameSync(excelFile.path, path.join(templateDir, 'template.xlsx'));
 *   fs.renameSync(configFile.path, path.join(templateDir, 'config.json'));
 *
 *   res.json({ id, message: '保存成功' });
 * });
 *
 * // 获取 Excel 文件
 * app.get('/api/template/:id/excel', (req, res) => {
 *   const filePath = path.join('templates', req.params.id, 'template.xlsx');
 *   res.download(filePath);
 * });
 *
 * // 获取配置
 * app.get('/api/template/:id/config', (req, res) => {
 *   const filePath = path.join('templates', req.params.id, 'config.json');
 *   res.sendFile(filePath);
 * });
 *
 * app.listen(3000);
 * ```
 */
export {};
