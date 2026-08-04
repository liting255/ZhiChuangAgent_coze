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

- 整体：左侧栏 + 右侧主内容区
- 侧边栏：w-56, bg-[#F8F9FA], border-r
- 主内容：max-w-3xl, mx-auto, centered
- 卡片：rounded-xl, shadow-sm, border-[#DADCE0]

## 交互与状态

- 过渡：transition-colors duration-150
- 悬停：背景色微变 (bg-[#F8F9FA])
- 加载：骨架屏
- 按钮：bg-[#1a73e8] hover:bg-[#1557b0] text-white
- 轮廓按钮：variant="outline" border-[#DADCE0]

## 设计禁忌

- 不用渐变色背景
- 不用大圆角（max rounded-xl, 12px）
- 不用动画弹跳效果
- 不用 emoji 作为功能图标（用 Lucide icons）
- 不用卡片阴影堆叠（用 border 区分层级）
- 不用深色背景区域
- 不用彩色按钮（统一用 Google 蓝）