## Why

当前前端 700 行 CSS 中 33 个颜色值全部硬编码，零 CSS 变量。ceorl 的 `--ceorl-focus-color` (#66ccff 冷蓝) 与项目暖金色调冲突。13 个 emoji 在不同操作系统渲染不一致，视觉廉价。9 个字体尺寸缺乏统一尺度。这些问题阻碍后续主题切换和视觉升级。

现在架构重构已经完成（后端 Bun/TS、前端 ceorl 工作台），是提取设计系统的最佳时机——趁代码还少，烙下变量体系，后续加主题只需追加一套 `data-theme`。

## What Changes

- 将所有硬编码颜色值提取为 CSS 自定义属性，按语义（背景/文字/强调/告警/边框）分组到 `:root`。
- 覆盖 ceorl 的 `--ceorl-focus-color` 为项目金色，统一焦点指示色。
- 引入 Lucide 图标库替代所有 emoji，workspace 列 icon 改为字符串标识。
- 统一字体尺寸为 5 档变量体系（`--text-xs` ~ `--text-xl`），替代当前 9 档零散值。
- 调整 dock 和列标题的字体和间距以匹配新尺度。
- 不改变任何游戏功能、API 行为或布局结构。

## Capabilities

### New Capabilities

- `css-theme-variables`: 将 App.css 中所有颜色值提取为语义化 CSS 自定义属性，覆盖 ceorl 焦点颜色，使后续主题切换只需追加 `[data-theme]` 变量声明。
- `icon-system`: 引入 Lucide React 图标库，替换所有 emoji 用法，workspace 列 icon 字段从 emoji 字符串改为 Lucide 图标名。
- `typography-scale`: 统一字体尺寸为 5 档 CSS 变量，替代分散的 9 个硬编码值。

### Modified Capabilities

无。当前 `openspec/specs/` 中无已归档规格。

## Impact

- Affected code:
  - `frontend/src/App.css` — 新增 `:root` 变量块，替换所有硬编码色值和字号为 `var(--xxx)`
  - `frontend/src/layout/ceorl/ceorl.css` — `--ceorl-focus-color` 改为引用 `var(--accent)`
  - `frontend/src/layout/workspace/types.ts` — `icon: string` 字段从 emoji 改为 Lucide 图标名
  - `frontend/src/layout/workspace/WorkspaceDock.tsx` — 渲染 Lucide 组件替代 emoji
  - `frontend/src/App.tsx` — 替换内联 emoji 为 Lucide 组件
  - `frontend/src/components/ChatBox.tsx` — `💬` → `<MessageCircle />`
  - `frontend/src/components/StoryPanel.tsx` — `📖` `🧠` → `<BookOpen />` `<Brain />`
- Dependencies:
  - 新增 `lucide-react` npm 包
- APIs:
  - 不修改后端
- UX:
  - 图标渲染统一，跨平台一致
  - 字体略微增大（基数 13→14px），提升可读性
