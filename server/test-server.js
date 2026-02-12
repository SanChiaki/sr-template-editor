const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// 数据存储目录
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 中间件
app.use(cors());
app.use(express.json());

// 配置 multer 用于文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DATA_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// 内存存储（用于临时模板数据）
const templates = new Map();

/**
 * POST /api/template - 保存模板
 * 接收 multipart/form-data:
 * - excel: Excel 文件
 * - config: JSON 配置 (包含 id, name, component_list)
 */
app.post('/api/template', upload.fields([
  { name: 'excel', maxCount: 1 },
  { name: 'config', maxCount: 1 }
]), (req, res) => {
  try {
    const excelFile = req.files?.excel?.[0];
    const configFile = req.files?.config?.[0];

    if (!excelFile || !configFile) {
      return res.status(400).json({ message: '缺少必要文件' });
    }

    // 读取配置
    const configContent = fs.readFileSync(configFile.path, 'utf-8');
    const config = JSON.parse(configContent);

    // 生成 ID
    const id = config.id || `template-${Date.now()}`;

    // 存储模板信息
    const templateInfo = {
      id,
      name: config.name || `模板 ${id}`,
      excelFilename: excelFile.filename,
      configFilename: configFile.filename,
      config: config,
      createdAt: new Date().toISOString()
    };

    templates.set(id, templateInfo);

    console.log(`[保存模板] ID: ${id}, 名称: ${templateInfo.name}`);

    res.json({
      id,
      message: '保存成功'
    });
  } catch (error) {
    console.error('保存失败:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/template/:id - 获取模板信息
 */
app.get('/api/template/:id', (req, res) => {
  const { id } = req.params;
  const template = templates.get(id);

  if (!template) {
    return res.status(404).json({ message: '模板不存在' });
  }

  res.json({
    id: template.id,
    name: template.name,
    createdAt: template.createdAt
  });
});

/**
 * GET /api/template/:id/excel - 获取 Excel 文件
 */
app.get('/api/template/:id/excel', (req, res) => {
  const { id } = req.params;
  const template = templates.get(id);

  if (!template) {
    return res.status(404).json({ message: '模板不存在' });
  }

  const excelPath = path.join(DATA_DIR, template.excelFilename);

  if (!fs.existsSync(excelPath)) {
    return res.status(404).json({ message: 'Excel 文件不存在' });
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${template.id}.xlsx"`);
  res.sendFile(excelPath);
});

/**
 * GET /api/template/:id/config - 获取组件配置
 */
app.get('/api/template/:id/config', (req, res) => {
  const { id } = req.params;
  const template = templates.get(id);

  if (!template) {
    return res.status(404).json({ message: '模板不存在' });
  }

  res.json({
    id: template.id,
    name: template.name,
    component_list: template.config.component_list || []
  });
});

/**
 * GET /api/templates - 获取模板列表
 */
app.get('/api/templates', (req, res) => {
  const list = Array.from(templates.values()).map(t => ({
    id: t.id,
    name: t.name,
    createdAt: t.createdAt
  }));

  res.json(list);
});

/**
 * DELETE /api/template/:id - 删除模板
 */
app.delete('/api/template/:id', (req, res) => {
  const { id } = req.params;
  const template = templates.get(id);

  if (!template) {
    return res.status(404).json({ message: '模板不存在' });
  }

  // 删除文件
  try {
    const excelPath = path.join(DATA_DIR, template.excelFilename);
    const configPath = path.join(DATA_DIR, template.configFilename);

    if (fs.existsSync(excelPath)) fs.unlinkSync(excelPath);
    if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
  } catch (err) {
    console.error('删除文件失败:', err);
  }

  templates.delete(id);
  console.log(`[删除模板] ID: ${id}`);

  res.json({ message: '删除成功' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`\n=================================`);
  console.log(`测试 API 服务器已启动`);
  console.log(`地址: http://localhost:${PORT}`);
  console.log(`=================================\n`);
  console.log(`可用端点:`);
  console.log(`  POST   /api/template          - 保存模板`);
  console.log(`  GET    /api/template/:id      - 获取模板信息`);
  console.log(`  GET    /api/template/:id/excel - 获取 Excel 文件`);
  console.log(`  GET    /api/template/:id/config - 获取组件配置`);
  console.log(`  GET    /api/templates         - 获取模板列表`);
  console.log(`  DELETE /api/template/:id      - 删除模板`);
  console.log(`\n提示: 在前端设置环境变量 VITE_API_BASE_URL=http://localhost:${PORT}/api\n`);
});
