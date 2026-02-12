# 测试 API 服务器

用于验证 `loadTemplate` 和 `saveTemplate` 功能的本地测试服务器。

## 安装依赖

```bash
cd server
npm install
```

## 启动服务器

```bash
npm start
```

服务器将在 `http://localhost:3001` 启动。

## 前端配置

在前端项目中创建 `.env.local` 文件：

```
VITE_API_BASE_URL=http://localhost:3001/api
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/template` | 保存模板（Excel + 配置） |
| GET | `/api/template/:id` | 获取模板基本信息 |
| GET | `/api/template/:id/excel` | 获取 Excel 文件 |
| GET | `/api/template/:id/config` | 获取组件配置 JSON |
| GET | `/api/templates` | 获取模板列表 |
| DELETE | `/api/template/:id` | 删除模板 |

## 数据存储

模板数据存储在 `server/data/` 目录下：
- `excel-*` - Excel 文件
- `config-*` - JSON 配置文件

## 测试流程

1. 启动服务器
2. 配置前端环境变量
3. 启动前端项目 `npm run dev`
4. 在编辑器中操作，点击"保存到后端"按钮
5. 复制返回的模板 ID
6. 点击"从后端加载"，输入模板 ID 验证加载
