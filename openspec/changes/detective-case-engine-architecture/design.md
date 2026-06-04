## Context

项目已完成三轮架构变更：Python 后端迁移到 Bun/TS（模块化 + Zod 校验）、前端引入 CEORL 横向工作台布局、CSS 变量体系 + Lucide 图标。当前所有功能可玩，但剧本格式和前端渲染仍然以“审问 NPC、搜查地点、指认真凶”为中心。

本设计面向探案解密这一封闭类型做抽象，不追求 RPG 级泛用性。目标是：**换一个探案案件不需要改一行前端代码，也不要求案件一定是凶杀案。**

## Decisions

### Decision 1: 单文件 Case Manifest

**现状：** `manifest.json` + 每个 NPC 一个 `.txt` 文件。

**改为：** 单 `manifest.json`，作为案件包的开发态和发行态基础格式。人物脚本、地点描述、证据、问题、结案规则和面板定义都进入同一个结构化 JSON。

理由：
- 加载路径从 N+1 次 IO 降为 1 次。
- 单文件便于本地分发、导入、校验和后续打包。
- JSON 内大段文本不影响当前体量下的解析效率。
- 单文件是后续 PNG 元数据嵌入或压缩包导出的前提。

### Decision 2: 从 NPC 泛化为 Entity，但不让 Entity 承担胜负逻辑

**现状：** `npcs[]` 数组，每个元素有 `{id, name, script_file, core_secret, is_murderer}`。

**改为：** `entities[]` 数组。实体只表示案件世界里的对象，不直接表示答案。

实体使用 `kind` 表示基本对象类型：
- `"person"`：人物
- `"place"`：地点
- `"item"`：物品
- `"document"`：文件、信件、账本、报告等
- `"event"`：时间线事件或可讨论事件
- `"concept"`：抽象概念，例如“遗嘱”“旧案”“公司股权”

实体使用 `tags` 表示业务分类和玩法身份，例如：
- `"suspect"`、`"witness"`、`"victim"`
- `"can-talk"`、`"can-search"`、`"can-inspect"`、`"can-confront"`
- `"locked"`、`"hidden"`、`"red-herring"`

理由：
- `kind` 稳定表达对象类别，`tags` 灵活表达案件语义。
- 非凶杀案也可以有嫌疑对象、证人、关键物品和争议事件。
- 胜负条件不再依赖 `is_murderer`，而是由 `questions` 和 `resolution` 管理。

### Decision 3: 引入 Fact / Evidence，表达“真相层”和“玩家已知层”

探案解密的核心不是角色列表，而是玩家如何从线索还原事实。因此 manifest 增加：

- `facts[]`：案件事实、证词主张、时间线节点、隐藏真相。
- `evidence[]`：玩家可发现或获得的证据。

事实字段包含：
- `id`
- `statement`
- `truth`: `"true" | "false" | "unknown"`
- `visibility`: `"public" | "hidden"`
- `time?`
- `source_entity?`
- `revealed_by?`

证据字段包含：
- `id`
- `title`
- `description`
- `source_entity`
- `reveals`
- `contradicts`

这样可以表达：

```text
证据 A 揭示事实 X
证词 B 声称事实 Y
事实 X 反驳事实 Y
玩家用证据 A 质询人物 B
```

本次不实现自动推理图求解，但这些结构会进入 Prompt 上下文、档案面板和结案校验。

### Decision 4: 从“指认真凶”抽象为 Questions + Resolution

**现状：** `is_murderer` 是唯一答案，`/api/accuse` 判断玩家是否选中真凶。

**改为：** `questions[]` 描述玩家最终需要回答的问题，`resolution` 描述提交规则和结局。

问题类型先支持：
- `"single-entity"`：答案是一个实体 ID。
- `"multi-entity"`：答案是多个实体 ID。
- `"choice"`：答案是选项 ID。
- `"text-rubric"`：答案是文本，由关键词或 rubric 近似评分。
- `"evidence-set"`：答案是一组证据 ID。

结案规则先支持：
- `"questionnaire"`：提交一组问题答案，按正确数和必答项判定结局。

现有凶杀案迁移为：
- `questions[culprit] = single-entity`
- `questions[motive] = text-rubric`
- `questions[method] = choice/text-rubric`
- `resolution.required_questions = ["culprit"]` 或更多问题

`culprit` 只是当前案件的一个问题 ID，不是引擎级必需字段。Manifest 校验只要求 `resolution.required_questions` 中的每个 ID 都存在于 `questions[]`，不得要求固定的 `culprit` 问题。

### Decision 5: 交互方式改为 manifest-driven interactions

**现状：** 后端内建 `/chat`、`/search`、`/accuse`，前端面板写死审问、搜查和指认入口。

**改为：** manifest 中声明 `interactions[]`，后端通过 interaction type 选择处理器，前端根据 interaction 声明渲染动作入口。旧 `/api/chat`、`/api/search`、`/api/accuse` 不作为兼容目标；新前端通过统一 interaction API 工作。

首批交互类型：
- `"talk"`：与人物交谈。
- `"search"`：搜索地点。
- `"inspect"`：检查物品、文件、地点。
- `"confront"`：使用证据质询人物。
- `"submit-resolution"`：提交结案答案。

交互处理边界：
- 统一 interaction API 负责请求入口和校验，具体 handler 负责写入对应状态。
- 只有 `talk` 和 `confront` 可以写入聊天记录。
- `search` / `inspect` 不得向聊天记录写空消息。
- 行动成本应按 interaction 的 `cost.progress` 消耗；无成本交互不应推进进度。
- 流式和非流式交互必须使用同一套行动成本规则，不能让 `/api/interact/stream` 固定消耗 1 次行动。
- 如果交互目标、前置条件或答案校验失败，不应先消耗进度。
- 当 `search` 已无可发现 evidence 时，应按失败交互处理，不消耗进度。
- `search` 每次只发现一个当前未发现 evidence，并只揭示该 evidence 的 `reveals` facts；不能一次性揭示同一地点的全部 evidence。

### Decision 6: 进度系统从固定字段变为可配置 Driver

**现状：** `{max_days, rounds_per_day}` 硬编码在 manifest 顶层，`advanceRound()` 直接使用这两个字段。

**改为：** `progression` 对象，通过 `type` 选择驱动模式。

首批模式：
- `"daily-rounds"`：当前天数和轮次玩法的新 driver。
- `"free"`：无行动次数限制。

`daily-rounds` 使用：

```json
{
  "progression": {
    "type": "daily-rounds",
    "config": {
      "max": 3,
      "per_phase": 5,
      "labels": ["第一天", "第二天", "最终日"],
      "transition_template": "夜幕降临，案件进入{label}。"
    }
  }
}
```

后端实现 progression driver，负责：
- 消耗行动成本。
- 更新阶段和轮次。
- 判断是否超时。
- 生成阶段切换叙事。

### Decision 7: 面板定义从 TypeScript 代码移至 Manifest，并用 Settings 取代默认 Debug

**现状：** `frontend/src/layout/workspace/types.ts` 中 `DEFAULT_COLUMNS` 是硬编码数组，`WorkspaceColumnType` 是 union type，`App.tsx` 用 `switch(col.type)` 分发渲染。

**改为：** `manifest.json` 中声明 `panels[]`，前端从 `/api/info` 获取面板定义后动态渲染。

```json
{
  "panels": [
    { "id": "investigation", "type": "entity-list", "title": "调查", "icon": "search", "width": "1/6", "filter": { "tags": ["can-talk", "can-search", "can-inspect"] } },
    { "id": "conversation", "type": "interaction", "title": "交互", "icon": "message-circle", "width": "1/3", "config": { "default_interaction": "talk" } },
    { "id": "story-log", "type": "narrative", "title": "故事", "icon": "book-open", "width": "1/4" },
    { "id": "case-file", "type": "case-file", "title": "档案", "icon": "clipboard-list", "width": "1/4", "sections": ["status", "evidence", "facts", "timeline", "questions"] },
    { "id": "settings", "type": "settings", "title": "设置", "icon": "settings", "width": "1/4" }
  ]
}
```

Panel Registry 只注册前端能力，manifest 只引用已注册的能力。未知面板类型显示降级提示，不导致应用崩溃。

`settings` 是常规设置面板，包含重置游戏、显示选项和开发调试区。开发调试区默认折叠且不请求敏感数据；用户首次启用时必须确认“将暴露 Prompt、隐藏事实和结案答案”。确认后，前端再调用 debug-only API 获取完整 manifest、Prompt 或状态快照。

`debug` 不再作为面板类型。新 manifest 应使用 `settings`。

### Decision 8: 公开 Manifest 与敏感数据 Redaction

后端持有完整 `CaseManifestV2`，但普通前端只接收 `PublicCaseManifest`。

`GET /api/info` 返回的公开数据必须移除或裁剪：
- `questions.answer`
- `questions.rubric`
- `facts[visibility=hidden]` 的完整内容
- 未发现 `evidence` 的完整内容
- `evidence.reveals` / `evidence.contradicts`
- 仅供 LLM 或开发调试使用的敏感 Prompt 和实体秘密

隐藏事实和证据是否对玩家可见由运行时状态决定：公开 API 只返回 `visibility=public` 的事实、已被 `gameState.revealed_facts` 揭示的事实摘要，以及已在 `gameState.discovered_evidence` 中的证据公开版本。完整 manifest 只允许 debug-only API 返回。

debug-only API 建议包括：
- `GET /api/debug/manifest`
- `GET /api/debug/state`
- `GET /api/debug/prompt`

这些 API 只能在显式后端配置 `debug.enabled=true` 时可用；未开启时必须返回 404 或 403。SettingsPanel 的确认弹窗只用于防误触，不替代后端 redaction 和 debug API 开关。

### Decision 9: API 迁移策略

本变更不要求旧前端或旧 API 字段继续可用。后端直接以新 Case Manifest 和新状态模型作为运行时基础。

具体做法：
- 后端 `script/repository.ts` 加载新的 Case Manifest。
- 内部统一使用 `entity.id` 作为状态 key。
- `GET /api/info` 返回 redacted `PublicCaseManifest`。
- 游戏状态使用 `current_entity`、`discovered_evidence`、`revealed_facts` 等新字段；聊天记录以 `entity.id` 为 key，不再保留 `current_npc` 或姓名 key。
- 前端结案面板必须提交所有已填写的问题答案，不能特殊处理 `culprit`。
- 前端 state 只能通过 App 层 action 更新；Panel 不得直接 mutate `state` props。
- EntityListPanel 不再渲染固定“发起指认”入口；结案统一由 `resolution` panel 承担。
- 前端改动和后台改动同一 PR 内合并完成上线，不保留旧 NPC API 兼容层。

### Decision 10: 剧本分发格式预留 PNG 元数据

本次不做实现，但格式设计保留：

```json
{
  "$schema": "https://...",
  "format": "detective-case-v2",
  "packaging": "standalone-json"
}
```

后续实现 PNG 元数据嵌入时，将上述 JSON 压缩后写入 PNG 的 iTXt 块。PNG 本身可作为案件封面或启动背景。

## 与已归档变更的关系

| 变更 | 与本设计的关系 |
|------|---------------|
| backend-to-bun-ts | 在本设计之上继续保持模块边界，repository、store、handler 层需改动 |
| ceorl-workspace | 本设计的 Panel Registry 从 WorkspaceShell 接收列配置，不改 CEORL 核心 |
| extract-theme-and-icons | 不变，Panel Registry 中的新组件直接使用已有 CSS 变量和图标体系 |
