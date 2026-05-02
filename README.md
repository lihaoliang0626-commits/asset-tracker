# 资产追踪应用 (Asset Tracker)

一款网页端优先的资产快照与趋势分析应用。它不是流水记账工具，而是帮助用户定期记录完整资产状态，并从长期变化中获得全局感。

## 当前形态

- Web-only：React + Vite 构建为可部署的静态网页应用。
- 云端数据：Supabase Auth + Postgres，用户登录后读写自己的资产数据。
- 部署目标：Netlify 静态站点 + Netlify Functions。
- AI 总结：前端调用 `/api/asset-summary`，DeepSeek API key 只保存在 Netlify 环境变量中。

## 核心功能

- 周/月/季度资产快照记录
- 多资产类型：现金、银行账户、证券、加密资产、支付账户
- 净资产趋势、资产结构、变化贡献分析
- 资产目标设定与进度追踪
- JSON 数据导出与旧版本导入
- 基准货币与汇率规则设置

## 项目结构

```text
asset-tracker/
├── docs/                  # 产品与开发文档
├── netlify/functions/     # Netlify 后端函数
├── packages/
│   ├── shared/            # 类型、工具函数、Supabase repository
│   └── web/               # React Web 应用
├── supabase/schema.sql    # 数据库表与 RLS 策略
├── netlify.toml
└── pnpm-workspace.yaml
```

## 本地开发

### 前置要求

- Node.js >= 18
- pnpm >= 8
- Supabase 项目

### 环境变量

在 `packages/web/.env.local` 中配置：

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Netlify 环境变量：

```bash
DEEPSEEK_API_KEY=your-deepseek-key
DEEPSEEK_BASE_URL=https://api.deepseek.com # 可选
```

### 数据库初始化

在 Supabase SQL Editor 中执行：

```bash
supabase/schema.sql
```

该脚本会创建 `snapshots`、`settings`、`goals`、`exchange_rates` 表，并开启 Row Level Security。

### 启动

```bash
pnpm install
pnpm dev:web
```

### 检查与构建

```bash
pnpm type-check
pnpm lint
pnpm build:web
```

## 部署

Netlify 使用仓库根目录的 `netlify.toml`：

- build command: `pnpm install --frozen-lockfile && pnpm --filter @asset-tracker/shared build && pnpm build:web`
- publish: `packages/web/dist`
- functions: `netlify/functions`

部署前需要在 Netlify 配置 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`，以及可选的 `DEEPSEEK_API_KEY`。

## 文档

- [云端部署指南](./docs/云端部署指南.md)
- [产品需求文档](./docs/产品需求文档.md)
- [资产分类规范](./docs/资产分类规范.md)
- [设计规范](./docs/设计规范.md)
- [交互设计文档](./docs/交互设计文档.md)
- [数据模型设计](./docs/数据模型设计.md)
