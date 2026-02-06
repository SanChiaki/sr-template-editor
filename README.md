---
AIGC:
    ContentProducer: Minimax Agent AI
    ContentPropagator: Minimax Agent AI
    Label: AIGC
    ProduceID: "00000000000000000000000000000000"
    PropagateID: "00000000000000000000000000000000"
    ReservedCode1: 3045022100f3ea453608c4d1f4d3942962d09fed6f9edd665ad40d51fa8da8b89aa50ec593022074b1602cdffebda353e747363e6b6180eb3011a58012825b80db0cfe67a26747
    ReservedCode2: 3046022100e6efc0dcf7a881d3c140e3eabf4aa46078986937fa3b70ed4fd2fa9b5f5042db022100ca994bbcf52e852e180be1cd78ec8e80eed4a6e1b42cf412d289d5fd6eed4fa6
---

# SpreadJS Excel模板编辑器 - 智能组件管理系统

## 部署地址
https://ac162do3h3gc.space.minimaxi.com

## 重要说明 - 许可证要求
SpreadJS是GrapeCity公司的商业软件产品，需要有效的部署许可证才能正常运行。

### 配置许可证
1. 访问 [GrapeCity官网](https://www.grapecity.com/spreadjs) 购买许可证
2. 获取许可证密钥后，在 `src/App.tsx` 中添加：

```typescript
// 在Designer初始化之前设置许可证
GC.Spread.Sheets.LicenseKey = "YOUR-LICENSE-KEY-HERE";
```

## 项目结构
```
spreadjs-template-editor/
├── src/
│   ├── App.tsx                    # 主应用组件
│   ├── components/
│   │   └── ComponentPanel.tsx     # 智能组件管理面板
│   └── types/
│       └── SmartComponent.ts      # 类型定义
├── public/
│   └── lib/                       # SpreadJS库文件
└── index.html                     # 入口文件（加载SpreadJS）
```

## 功能特性

### 1. 界面布局
- **左侧70%**: SpreadJS官方设计器（完整Excel编辑功能）
- **右侧30%**: 智能组件管理面板

### 2. 智能组件管理
- **组件类型**: Text, Table, Chart, Image, Formula
- **属性编辑**: 名称、位置(Excel区域)、类型、AI Prompt、边框颜色
- **可视化标记**: 透明形状覆盖在组件区域上

### 3. 核心功能
- 添加/编辑/删除智能组件
- 基于选区自动获取组件位置
- JSON格式配置导出

## 开发指南

### 本地运行
```bash
cd spreadjs-template-editor
pnpm install
pnpm dev
```

### 构建部署
```bash
pnpm build
# dist目录包含所有构建产物
```

## 组件数据模型
```typescript
interface SmartComponent {
  id: string;
  location: string;      // Excel区域，如"A1:B2"
  type: 'Text' | 'Table' | 'Chart' | 'Image' | 'Formula';
  prompt: string;        // AI提示词
  name: string;          // 组件显示名称
  style?: {
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
  };
}
```

## 使用流程
1. 在SpreadJS设计器中编辑Excel模板
2. 选择需要标记的区域
3. 点击"Add"按钮添加智能组件
4. 在右侧面板编辑组件属性
5. 点击"Export"导出模板配置JSON
