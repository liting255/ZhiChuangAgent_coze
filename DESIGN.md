# DESIGN.md - 智创Agent 设计规范

## 气质与意象

**意象锚点**：Google NotebookLM — 极简、专注、可信赖的 AI 研究助手。纯白画布上，左侧是紧凑的资料面板，中间是对话式交互区，一切围绕"思考与写作"展开。

**关键词**：极简 / 对话式 / 专注 / 信息密度适中 / 中文科研语境

## 配色方案

### 主色调
- 主色（Google Blue）：`#1a73e8` — 按钮、链接、选中态
- 主色悬停：`#1557b0` — 按钮 hover

### 四阶段色（仅用于彩色小圆点标识）
- 阶段01 文献发现：`#2563EB` (blue-600)
- 阶段02 筛选分类：`#7C3AED` (violet-600)
- 阶段03 知识入库：`#0F766E` (teal-700)
- 阶段04 证据综合：`#D97706` (amber-600)

### 基础色
- 背景：`#FFFFFF` — 纯白
- 侧边栏：`#F8F9FA` — 浅灰
- 卡片：`#FFFFFF` — 纯白
- 卡片悬停：`#F8F9FA`
- 文字主色：`#202124` — Google 黑
- 文字次色：`#5F6368` — Google 灰
- 边框：`#DADCE0` — 微妙边框
- 分割线：`#E8EAED`

### 分诊信号色
- 优先精读：`#DC2626` (red-600)，背景 `#FEF2F2`
- 快速浏览：`#D97706` (amber-600)，背景 `#FFFBEB`
- 暂不纳入：`#6B7280` (gray-500)，背景 `#F9FAFB`

## 字体排版

- 中文：系统默认（"PingFang SC", "Microsoft YaHei", sans-serif）
- 英文/数字：Inter, system-ui, -apple-system
- 代码/DOI：JetBrains Mono, "SF Mono", monospace
- 标题：font-semibold, tracking-tight
- 正文：font-normal, leading-relaxed (1.625)
- 字号体系：text-sm (14px) 为主，text-xs (12px) 辅助

## 布局

### 全局三栏布局（NotebookLM 风格）
- **左侧面板（Sources）**：w-72, bg-[#F8F9FA], border-r, flex flex-col
  - 顶部：文献导入区（搜索框 + 上传按钮）
  - 中部：文献源列表（可勾选、可展开摘要）
  - 底部：筛选/排序工具栏
- **中间面板（Chat）**：flex-1, bg-white, flex flex-col
  - 顶部：标题栏（当前选中文献数 + 新建对话按钮）
  - 中部：对话消息流（聊天气泡式，支持 Markdown 渲染）
  - 底部：输入框 + 发送按钮 + 沉淀文档指令入口
- **右侧面板（Notes）**：w-72, bg-[#F8F9FA], border-l, flex flex-col
  - 顶部：标题栏（"研究笔记" + 新建按钮）
  - 中部：笔记/文档列表（卡片式，可展开预览）
  - 底部：导出/管理工具栏

### 面板折叠
- 左右面板均可通过边栏按钮折叠/展开
- 折叠后中间面板自动扩展填充空间
- 过渡动画：transition-all duration-300

### 卡片
- 圆角：rounded-xl (12px)
- 阴影：shadow-sm
- 边框：border-[#DADCE0]
- 悬停：hover:bg-[#F8F9FA]

## 交互与状态

- 过渡：transition-colors duration-150 / transition-all duration-300（面板折叠）
- 悬停：背景色微变 (bg-[#F8F9FA])
- 加载：骨架屏
- 按钮：bg-[#1a73e8] hover:bg-[#1557b0] text-white
- 轮廓按钮：variant="outline" border-[#DADCE0]
- 选中文献：左侧蓝色边框标记 (border-l-2 border-l-[#1a73e8])
- 消息气泡：用户消息 bg-[#E8F0FE] 右对齐，AI 消息 bg-white border 左对齐
- 面板折叠按钮：圆角小按钮，hover 时显示 tooltip

## 组件规范

### 文献源卡片（SourceCard）
- 高度紧凑，默认显示 2 行标题 + 1 行摘要
- 左侧 checkbox 用于选中对话
- 右侧 tag 标签（分诊级别）
- 展开时显示完整摘要 + 操作按钮

### 对话消息（ChatMessage）
- 用户消息：bg-[#E8F0FE] rounded-2xl rounded-br-md
- AI 消息：bg-white border border-[#DADCE0] rounded-2xl rounded-bl-md
- 支持 Markdown（标题、列表、粗体、代码块）
- 底部显示操作栏（复制、重新生成、沉淀为笔记）

### 笔记文档卡片（NoteCard）
- 紧凑卡片式，显示标题 + 来源 + 创建时间
- 点击展开预览内容
- 支持删除、重命名、导出

## 设计禁忌

- 不用渐变色背景
- 不用大圆角（max rounded-xl, 12px）
- 不用动画弹跳效果
- 不用 emoji 作为功能图标（用 Lucide icons）
- 不用卡片阴影堆叠（用 border 区分层级）
- 不用深色背景区域
- 不用彩色按钮（统一用 Google 蓝）