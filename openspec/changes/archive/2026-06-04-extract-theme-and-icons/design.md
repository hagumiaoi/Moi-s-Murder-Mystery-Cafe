## Context

当前项目前端已完成架构重构（ceorl 横向工作台 + 后端 Bun/TS），但视觉层仍由原始 CSS 驱动：33 个颜色值硬编码在 700 行 CSS 中，零变量复用；13 个 emoji 用作功能图标，跨平台渲染不一致；9 个字体尺寸缺少统一命名体系。现趁代码规模尚小，建立设计系统根基。

ceorl.css 中 `--ceorl-focus-color: #66ccff` 是唯一存在的 CSS 变量，与项目暖金色调冲突。

## Goals / Non-Goals

**Goals:**

- 将 App.css 中所有颜色提取为语义化 CSS 自定义属性。
- 覆盖 ceorl 的 `--ceorl-focus-color` 为项目金色。
- 引入 Lucide 图标库替代所有 emoji。
- 字体尺寸统一为 5 档 CSS 变量体系。
- 调整 dock 和标题字体间距以匹配新尺度。

**Non-Goals:**

- 不实现多主题切换（为后续留 hook point，但本次不做 `[data-theme]` 切换逻辑）。
- 不修改游戏功能、API 或布局结构。
- 不引入 CSS-in-JS 或 Tailwind。
- 不更换字体族（保持系统默认）。

## Decisions

### Decision 1: CSS 变量体系设计

采用语义命名法，按功能分组：

```css
:root {
  /* 背景层次 */
  --bg-primary:       #0a0806;   /* 最深背景（body） */
  --bg-secondary:     #120d0a;   /* 面板背景（header, panel） */
  --bg-tertiary:      #0f0a08;   /* 区块背景（section-header） */
  --bg-surface:       #1a1310;   /* 控件背景（按钮, input） */
  --bg-hover:         #2a1f18;   /* hover 加深 */

  /* 文字层次 */
  --text-primary:     #e8dcc8;   /* 正文 */
  --text-secondary:   #d8ccb8;   /* 次要文字 */
  --text-muted:       #8b7d6b;   /* 辅助/元数据 */
  --text-dim:         #5a4a3a;   /* 占位符/禁用态 */

  /* 强调色（Gold） */
  --accent:           #c9a84c;
  --accent-glow-sm:   rgba(201,168,76,0.1);
  --accent-glow-md:   rgba(201,168,76,0.15);
  --accent-glow-lg:   rgba(201,168,76,0.2);
  --accent-glow-xl:   rgba(201,168,76,0.3);

  /* 告警/行动色（Red） */
  --danger-text:      #d4a090;
  --danger-text-hover: #e8b0a0;
  --danger-bg:        #2a1410;
  --danger-border:    #5a2a20;
  --danger-border-hover: #8a3a2a;
  --danger-glow:      rgba(138,58,42,0.3);

  /* 边框 */
  --border:           #2a2018;
  --border-light:     #3d3028;

  /* 覆盖层 */
  --overlay-bg:       rgba(10,8,6,0.85);

  /* 玩家消息气泡 */
  --player-bg:        #2a1814;
  --player-border:    #4a2a20;

  /* 滚动条 */
  --scrollbar-track:  #0a0806;
  --scrollbar-thumb:  #2a2018;
  --scrollbar-thumb-hover: #3d3028;
}
```

理由：
- 33 个颜色值 → 28 个变量，覆盖所有使用场景。
- 语义命名使替换含义清晰（`--bg-secondary` 而非 `--color-dark-brown`）。
- 后续加 `[data-theme="light"]` 只需重写变量值，不碰任何选择器。

考虑过的替代方案：
- 使用 Tailwind：引入工具链太重，且项目已有 700 行手写 CSS 需迁移。
- 使用 CSS-in-JS：与现有架构不一致，引入额外运行时。
- 不做变量，直接硬编码：失去灵活性。

### Decision 2: Lucide 图标库

使用 `lucide-react`，MIT 许可证，tree-shakable。

emoji → Lucide 映射：

| Emoji | Lucide 组件 | 用途 |
|-------|------------|------|
| 🔄 | `RotateCcw` | 重置 |
| 🎮 | `Gamepad2` | 游戏结束 |
| 📊 | `ChartBar` | 天数统计 |
| 👥 | `Users` | NPC 列表 |
| 🕵️ | `Binoculars` | 线索 |
| 📅 | `Calendar` | 时间线 |
| 🔧 | `Wrench` | 调试 |
| 🔥 | `Flame` | 指认 |
| 🔍 | `Search` | 搜索 |
| 📖 | `BookOpen` | 故事 |
| 💬 | `MessageCircle` | 对话 |
| 🧠 | `Brain` | 思考过程 |
| 📋 | `ClipboardList` | 档案 |

Workspace 列 icon 字段改为 icon 名字符串（如 `"search"`），Dock 组件内部根据 icon 名映射到对应 Lucide 组件渲染。

理由：
- Lucide 是 React 原生组件，无额外 wrapper。
- Tree-shakable：只打包实际引用的 13 个图标，约 5KB gzipped。
- 24px 网格，与 14px 正文搭配比例协调。

考虑过的替代方案：
- Heroicons：图标数 300，够用但风格偏 Tailwind。
- Phosphor：6 种风格权重，但体积更大。
- 保留 emoji：零依赖但渲染丑陋。

### Decision 3: 字体尺寸体系

统一为 5 档 CSS 变量：

```css
:root {
  --text-xs:   10px;  /* 标签 / 元数据 */
  --text-sm:   12px;  /* 按钮 / 辅助文本 */
  --text-base: 14px;  /* 正文 / 输入框 */
  --text-lg:   16px;  /* 段落标题 */
  --text-xl:   20px;  /* 页面标题 */
}
```

替换当前 9/11/12/13/14/15/16/20px 八档分散值。基数从 13 升到 14px，提升可读性。

理由：
- 间距清晰（2px 步进），视觉层次分明。
- 变量名语义化，修改一处全局生效。

## Risks / Trade-offs

- [Risk] 替换过程中可能出现视觉差异（如某个颜色错误映射） → 对照审计报告逐项检查，确保每个选择器颜色与前值一致。
- [Risk] `lucide-react` 增加 ~5KB gzipped → 可接受，项目当前 206KB JS。
- [Risk] 字体增大可能导致某些区域文字溢出 → 检查列宽和文本容器，必要时在 overflow 处加省略号。

## Migration Plan

1. 在 `App.css` 顶部新增 `:root` 变量块，不删除任何原规则。
2. 逐条替换硬编码值为 `var(--xxx)`，每改一处验证构建。
3. 修改 `ceorl.css` 的 `--ceorl-focus-color`。
4. 安装 `lucide-react`，逐个文件替换 emoji 为 Lucide 组件。
5. 更新 workspace types 的 icon 字段和 Dock 组件映射。
6. 字体尺寸替换为变量引用。
7. 全量构建验证，肉眼确认无视觉回归。

回滚策略：变量块独立于选择器，恢复只需删除变量块并 `git checkout` 选择器部分。

## Open Questions

- 是否需要引入 `data-theme` 属性预先 hook，还是等实际多主题需求时再加？
  - 先用 `:root` 直接定义，不加 `data-theme`。多主题时再迁移。
