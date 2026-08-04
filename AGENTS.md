# AGENTS.md

## 项目概览

**智创Agent** - 科研文献检索与知识服务平台，面向研究生/科研工作者的 NotebookLM 风格文献研究工具。采用三栏布局：左侧文献源管理 → 中间 AI 对话 → 右侧笔记文档。

## 技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI**: shadcn/ui + Tailwind CSS 4
- **Layout**: react-resizable-panels (三栏可拖拽)
- **Database**: Supabase (PostgreSQL)
- **AI**: coze-coding-dev-sdk (LLM + Web Search)

## 目录结构

```
src/
├── app/
│   ├── layout.tsx                    # 根布局（含 Toaster）
│   ├── page.tsx                      # 首页（工作台 - 项目列表）
│   ├── project/[projectId]/
│   │   ├── layout.tsx                # 项目布局（NotebookLM 三栏）
│   │   ├── page.tsx                  # 项目主页（由 layout 渲染）
│   │   ├── discover/page.tsx         # 阶段01：文献发现（保留）
│   │   ├── screening/page.tsx        # 阶段02：筛选分类（保留）
│   │   ├── library/page.tsx          # 阶段03：知识入库（保留）
│   │   ├── evidence/page.tsx         # 阶段04：证据综合（保留）
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
│               ├── export/route.ts   # POST 导出
│               ├── chat/route.ts     # POST AI 对话（SSE 流式）
│               ├── notes/route.ts    # GET/POST 研究笔记
│               ├── notes/[noteId]/route.ts     # DELETE/PUT 笔记
│               ├── notes/[noteId]/export/route.ts  # GET 导出笔记
│               └── upload/route.ts   # POST 上传PDF
├── components/
│   ├── ui/                           # shadcn/ui 组件
│   └── panels/                       # 面板组件
│       ├── notebooklm-layout.tsx      # 三栏布局（Group/Panel/Separator）
│       ├── source-panel.tsx           # 左侧：文献源面板
│       ├── source-card.tsx            # 文献源卡片
│       ├── chat-panel.tsx             # 中间：AI 对话面板
│       ├── chat-message.tsx           # 对话消息气泡
│       ├── notes-panel.tsx            # 右侧：笔记面板
│       └── note-card.tsx              # 笔记卡片
├── lib/utils.ts                      # 工具函数
└── storage/database/
    ├── supabase-client.ts            # Supabase 客户端
    └── shared/schema.ts              # Drizzle schema
```

## 核心架构

### NotebookLM 三栏布局
- **左侧面板（Sources）**：文献导入（网络搜索 + PDF上传）+ 文献管理（筛选/分类/标签/摘要）
- **中间面板（Chat）**：基于选中文献的 AI 对话（流式 SSE 输出）+ 沉淀文档指令
- **右侧面板（Notes）**：研究笔记管理（列表/预览/导出/删除）

### 四阶段流水线（保留）
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
- `paper_notes` - 单篇文献批注
- `research_notes` - 研究笔记（多文献引用，NotebookLM 沉淀文档）
- `search_sessions` - 检索会话

## 设计规范

NotebookLM 风格（详见 DESIGN.md）：
- 三栏布局：左侧 w-72（文献源）→ 中间 flex-1（对话）→ 右侧 w-72（笔记）
- 纯白背景 #FFFFFF，面板 #F8F9FA
- 主色 Google Blue #1a73e8
- 卡片 rounded-xl + shadow-sm + border-[#DADCE0]
- 消息气泡：用户 bg-[#E8F0FE]，AI bg-white border
- 面板可折叠，过渡动画 transition-all duration-300

## 环境变量

- `COZE_SUPABASE_URL` - Supabase 连接地址
- `COZE_SUPABASE_ANON_KEY` - Supabase 匿名密钥
- `COZE_SUPABASE_SERVICE_ROLE_KEY` - Supabase 服务密钥