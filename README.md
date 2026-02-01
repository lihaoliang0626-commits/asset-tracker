# 资产追踪应用 (Asset Tracker)

一款帮助用户通过**低频、结构化的资产快照**方式，清晰了解自己资产状态和变化趋势的应用。

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/yourusername/asset-tracker)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## 产品定位

### 我们不是什么
- ❌ 不是流水记账工具
- ❌ 不是专业投资分析平台
- ❌ 不是理财建议软件

### 我们是什么
- ✅ 周期性资产状态记录工具
- ✅ 长期趋势分析工具
- ✅ 资产全局感呈现工具

---

## 核心特性

### 🎯 低频记录，高效洞察

- **周/月快照**: 不需要每天记账，定期记录即可
- **一键继承**: 快速记录模式，只改变化项
- **3分钟完成**: 简化流程，降低使用负担

### 📊 智能分析

- **趋势可视化**: 清晰的折线图展示资产变化
- **变化归因**: 瀑布图拆解资产变化来源
- **结构洞察**: 环形图展示资产配置
- **AI 分析**: 一句话总结变化原因

### 💰 多资产支持

- 💵 现金（多币种）
- 🏦 银行账户（活期/定期）
- 📈 证券（股票/基金/ETF/债券）
- ₿ 加密资产
- 💳 日常支付账户（微信/支付宝/PayLah）

### 🎨 克制设计

- **冷静配色**: 金融灰 × 深蓝，不制造焦虑
- **无红绿色**: 避免情绪暗示
- **数据优先**: 让数据本身说话
- **简洁专业**: 金融级的可信感

### 🔒 隐私优先

- **本地存储**: 数据完全存储在本地
- **可选备份**: 支持端到端加密云备份
- **无追踪**: 不收集任何使用数据

---

## 项目结构

```
asset-tracker/
├── docs/                      # 文档目录
│   ├── 产品需求文档.md
│   ├── 资产分类规范.md
│   ├── 设计规范.md
│   ├── 交互设计文档.md
│   └── 数据模型设计.md
├── packages/                  # Monorepo 包目录
│   ├── shared/               # 共享代码
│   │   ├── types/           # TypeScript 类型定义
│   │   ├── utils/           # 工具函数
│   │   └── constants/       # 常量
│   ├── web/                 # Web 应用
│   └── mobile/              # 移动应用
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.json
```

---

## 快速开始

### 前置要求

- Node.js >= 18
- pnpm >= 8

### 安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/asset-tracker.git
cd asset-tracker

# 安装依赖
pnpm install
```

### 开发

```bash
# 启动 Web 应用
pnpm dev:web

# 启动移动应用
pnpm dev:mobile
```

### 构建

```bash
# 构建 Web 应用
pnpm build:web

# 构建移动应用
pnpm build:mobile
```

---

## 核心概念

### 资产快照（Snapshot）

资产快照是用户在某个时间点记录的完整资产状态。

**关键特性**:
- 不可变（immutable）
- 独立存在，便于对比
- 包含用户备注

### 分析周期

- **周**: 适合关注短期变化
- **月**: 适合了解中期趋势
- **季度**: 适合把握长期方向

### 数据分析的3个核心问题

1. **我这段时间是变多了，还是变少了？**
   → 折线图展示趋势

2. **主要是哪一类资产在影响变化？**
   → 瀑布图拆解贡献

3. **我的资产结构有没有发生值得注意的变化？**
   → 环形图 + 对比分析

---

## 技术栈

### 前端

- **框架**: React / React Native
- **状态管理**: Zustand / Jotai
- **图表库**: Recharts / Victory
- **样式**: TailwindCSS
- **TypeScript**: 完整类型支持

### 数据存储

- **Web**: IndexedDB
- **Mobile**: SQLite
- **备份**: 可选云端加密备份

### 汇率数据

- 自动调用汇率 API
- 每日更新
- 支持手动设置

---

## 路线图

### V1.0（当前版本）✅

- [x] 基础资产快照记录
- [x] 5大资产类别支持
- [x] 周/月趋势分析
- [x] 基础图表展示
- [x] 本地数据存储

### V1.1（计划中）🚧

- [ ] AI 分析集成
- [ ] 数据导出功能
- [ ] 云端备份
- [ ] 多设备同步

### V2.0（规划中）📋

- [ ] 季度分析
- [ ] 更多资产类型（房产、负债）
- [ ] 资产目标设定
- [ ] 配置优化建议

---

## 文档

详细文档请查看 `docs/` 目录：

- [产品需求文档](./docs/产品需求文档.md) - 完整的产品设计思路
- [资产分类规范](./docs/资产分类规范.md) - 资产类型定义和使用说明
- [设计规范](./docs/设计规范.md) - UI/UX 设计标准
- [交互设计文档](./docs/交互设计文档.md) - 详细的交互流程
- [数据模型设计](./docs/数据模型设计.md) - 数据结构和存储策略

---

## 贡献指南

我们欢迎所有形式的贡献！

### 如何贡献

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

### 开发规范

- 遵循 TypeScript 类型规范
- 编写清晰的提交信息
- 更新相关文档
- 添加必要的测试

---

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

---

## 联系方式

- 项目主页: [https://github.com/yourusername/asset-tracker](https://github.com/yourusername/asset-tracker)
- 问题反馈: [Issues](https://github.com/yourusername/asset-tracker/issues)

---

## 致谢

感谢所有为这个项目做出贡献的开发者！

### 设计理念来源

- **低频记账**: 受《反脆弱》启发，避免过度干预
- **数据可视化**: 参考 Apple Health 的设计理念
- **克制设计**: 借鉴金融级应用的设计标准

---

## 常见问题

### Q: 为什么不做日级记账？

A: 我们刻意选择低频记录，目的是：
- 减轻用户负担
- 强化"周期感"
- 避免焦虑
- 关注长期趋势而非短期波动

### Q: 数据存储在哪里？

A: 默认完全本地存储，你可以选择启用加密云备份。

### Q: 支持哪些币种？

A: 支持所有主流币种，通过 API 自动获取汇率。

### Q: 可以导出数据吗？

A: 支持导出为 CSV 和 JSON 格式。

### Q: 会有广告吗？

A: 永远不会。这是一个专注于用户体验的工具。

---

<p align="center">
  用心记录，清晰洞察 📊
</p>
