# AGENTS.md

## 项目概览

**智创Agent** - 科研文献检索与知识服务平台，面向研究生/科研工作者的四阶段流水线式文献检索工具。

## 技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI**: shadcn/ui + Tailwind CSS 4
- **Database**: Supabase (PostgreSQL) + Drizzle ORM
- **AI**: coze-coding-dev-sdk (LLM + Web Search)

## 目录结构

```
src/
├── app/
│   ├── layout.tsx                    # 根布局
│   ├── page.tsx                      # 首页（工作台）
│   ├── project/[projectId]/
│   │   ├── layout.tsx                # 项目布局（侧边栏导航）
│   │   ├── discover/page.tsx         # 阶段01：文献发现
│   │   ├── screening/page.tsx        # 阶段02：筛选分类
│   │   ├── library/page.tsx          # 阶段03：知识入库
│   │   ├── evidence/page.tsx         # 阶段04：证据综合
│   │   └── paper/[paperId]/page.tsx  # 文献详情
│   └── api/
│       └── projects/
│           ├── route.ts              # GET/POST 项目
│           └── [projectId]/
│               ├── search/route.ts   # POST 文献检索（双通道）
│               ├── papers/route.ts   # GET 文献列表
│               ├── papers/[paperId]/route.ts  # GET/PUT 文献详情
│               ├── analyze/route.ts  # POST 分析/分类
│               ├── evidence/route.ts # POST 证据综合
│               └── export/route.ts   # POST 导出
├── components/ui/                    # shadcn/ui 组件
├── lib/utils.ts                      # 工具函数
└── storage/database/
    ├── supabase-client.ts            # Supabase 客户端
    └── shared/schema.ts              # Drizzle schema
```

## 核心架构

四阶段流水线：
1. **文献发现** → 双通道检索（AI语义 + 布尔检索）→ 候选论文池
2. **筛选分类** → AI分诊 + 人工确认 + 主题标签生成
3. **知识入库** → 结构解析 + 向量化 + 证据抽取 → 统一知识库
4. **证据综合** → 二次检索 + 迭代闭环 + 比较矩阵 + 可追溯输出

## 开发命令

```bash
pnpm dev          # 开发环境
pnpm build        # 生产构建
pnpm start        # 生产启动
pnpm ts-check     # TypeScript 检查
pnpm lint         # ESLint 检查
```

## 数据库

使用 Supabase PostgreSQL，表结构：
- `projects` - 研究项目
- `papers` - 文献记录（含分诊、标签、证据）
- `paper_terms` - 术语解释
- `paper_notes` - 人工批注
- `search_sessions` - 检索会话

## 设计规范

NotebookLM 风格（详见 DESIGN.md）：
- 纯白背景 #FFFFFF，侧边栏 #F8F9FA
- 主色 Google Blue #1a73e8
- 卡片 rounded-xl + shadow-sm + border-[#DADCE0]
- 主内容 max-w-3xl 居中，聊天式输入
- 阶段色仅用于小圆点标识，不用于大面积

## 环境变量

- `SUPABASE_SERVICE_URL` - Supabase 连接地址
- `SUPABASE_SERVICE_KEY` - Supabase 服务密钥
