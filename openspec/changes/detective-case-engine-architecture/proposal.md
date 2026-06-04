# 探案解密剧本架构解耦 + 泛化设计

## 动机

当前剧本格式与“凶杀案剧本杀”玩法深度耦合。具体表现为：

1. **剧本格式是多文件的**：`manifest.json + Li.txt + Wang.txt + rose.txt`，人物脚本外挂，加载和分发都依赖多个文件。
2. **核心模型仍是 NPC**：`script_file`、`core_secret`、`is_murderer` 都假设游戏围绕“审问嫌疑人并指认真凶”展开。
3. **胜负条件写死为指认真凶**：`is_murderer` 把“答案”绑定到某个角色上，无法自然表达盗窃案、失踪案、骗局案、密室手法题、时间线矛盾题。
4. **进度系统是固定天数和轮次**：`max_days`、`rounds_per_day` 假设所有案件都按“第 N 天 × 每天 M 次行动”推进。
5. **前端 Column Type 是 TypeScript Union**：`"investigation" | "interrogation" | "story-log" | "dossier" | "debug"` 全部编码在前端类型里。
6. **前端渲染是 switch 语句**：`App.tsx` 用 `switch(col.type)` 分发渲染，剧本无法配置面板布局、交互入口和案件档案结构。

项目定位正在从“墨依的一个凶杀案剧本杀玩具”转为“可分发、支持多案件、面向个人用户的探案解密游戏引擎”。新的抽象应覆盖探案解密类游戏，而不只覆盖凶杀案。

## 目标

- 将多文件剧本格式合并为单文件 JSON，便于分发、校验和未来打包。
- 将核心模型从 `NPC` 泛化为 `Entity`，支持人物、地点、物品、文件、事件和抽象概念。
- 引入 `Fact` / `Evidence` / `Question` / `Resolution`，把游戏目标从“找出凶手”抽象为“还原案件真相并提交结论”。
- 抽象交互方式：把审问、搜查、检查、质询、提交结论等动作建模为 manifest-driven interactions。
- 抽象进度系统：从固定 `days + rounds` 变为可配置 progression driver。
- 抽象前端 column：从 TypeScript union + switch 变为 manifest-driven panel registry。
- 将默认 `debug` 面板改为 `settings` 面板；调试内容默认不加载，用户确认启用后才请求调试数据。
- 区分后端完整案件数据和前端公开案件数据，普通 `/api/info` 不返回答案、隐藏真相和敏感 Prompt。
- 公开案件数据必须按运行时发现状态裁剪：未发现证据、未揭示事实、证据到事实的关系不得提前暴露给普通前端。
- 结案流程必须支持任意 `resolution.required_questions`，不能把 `culprit` 作为引擎级必需问题。
- 采用破坏式迁移：旧 NPC 模型、旧 API 字段和旧面板类型不再作为兼容目标。
- 将当前凶杀案剧本迁移为新 Case Manifest，使其作为探案解密案件继续运行。

## 非目标

- 不做通用 RPG、经营、卡牌或开放世界叙事引擎。
- 不实现复杂图推理求解器；事实、证据和问题先用于结构化展示、Prompt 上下文和结案校验。
- 不实现可视化剧本编辑器。
- 不实现多剧本切换 UI。
- 不实现 PNG 元数据嵌入；仅保留单文件打包所需字段。
- 不改 CEORL 布局系统本身。
- 不保留旧 NPC 模型、旧 `/api/chat` / `/api/search` / `/api/accuse` 语义或旧前端字段兼容。
- 不把 `culprit`、`current_npc`、按姓名索引的聊天记录作为新引擎的内部模型。

## 当前 Review Follow-up

最近一轮 Review 后，本 change 进入收尾修正阶段。需要优先处理以下问题：

1. **OpenSpec specs 必须改为 delta 格式**：当前 `specs/*/spec.md` 是完整设计文档写法，`openspec validate detective-case-engine-architecture --strict` 会因为缺少 `## ADDED/MODIFIED/REMOVED/RENAMED Requirements` 和 `#### Scenario:` 失败。归档前必须修正。
2. **前端公开 manifest 需要随状态刷新**：后端 `/api/info` 已按 `revealed_facts` 和 `discovered_evidence` 动态裁剪，但前端目前只在启动时拉取一次，导致新发现证据后案件档案中的公开事实/证据不会更新。
3. **ResolutionPanel 需要真正支持集合题型**：`multi-entity` 和 `evidence-set` 必须能提交数组答案，不能继续用单选控件退化处理。
4. **SettingsPanel 需要显示 debug 不可用状态**：用户确认启用调试后，如果后端 `debug.enabled=false` 返回 403，前端应展示不可用提示，而不是静默吞掉或显示不完整数据。
5. **配置示例补齐 debug 开关**：`backend/config.example.toml` 应显式包含 `[debug] enabled = false`，让开发者知道如何开启 debug-only API。

## 验证方式

本项目包管理器和运行时是 **Bun**，验证命令以 Bun 为准：

- 后端测试：在 `backend/` 下运行 `bun test`。
- 后端类型检查：在 `backend/` 下运行 `bunx tsc --noEmit`。
- 前端构建：在 `frontend/` 下运行 `bun run build`。
- OpenSpec 校验：在仓库根目录运行 `openspec validate detective-case-engine-architecture --strict`。

不使用 `pnpm run check` 作为该 change 的验证标准。
