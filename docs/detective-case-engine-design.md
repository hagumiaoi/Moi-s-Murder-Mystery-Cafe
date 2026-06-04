# 探案解密游戏引擎设计文档

## 1. 背景

当前项目最初围绕一个凶杀案剧本杀实现：玩家审问 NPC、搜查地点、获得线索，最后指认真凶。这个模型可以支撑当前剧本，但它把“探案解密”收窄成了“找出凶手”。

后续目标是支持更广义的探案解密类游戏，例如：

- 盗窃案：谁偷了物品、如何偷走、赃物在哪里。
- 失踪案：人在哪里、为何消失、谁隐瞒了关键事实。
- 密室案：密室手法是什么、时间线哪里被伪造。
- 骗局案：骗局结构是什么、主谋是谁、关键破绽在哪里。
- 悬疑调查：还原事件因果，而不一定存在凶手。

因此，新的引擎抽象不应以“NPC + 凶手字段”为中心，而应以“案件、事实、证据、问题、结论”为中心。

## 2. 设计目标

- 剧本可以作为单个 JSON 文件分发和校验。
- 前端工作台布局由剧本声明，而不是写死在 React 代码里。
- 游戏可以表达非凶杀案，不要求一定存在 murderer。
- 结案可以是多问题答案，而不是单个指认目标。
- 线索可以关联事实、反驳证词，并用于质询或结案。
- 当前凶杀案剧本迁移为新 Case Manifest 后继续作为一个探案解密案件运行。

## 3. 核心模型

新的案件 Manifest 由以下部分组成：

```text
Case Manifest
  ├─ entities       案件世界中的对象
  ├─ facts          真相、证词、时间线节点
  ├─ evidence       玩家可发现和使用的证据
  ├─ interactions   可执行动作
  ├─ questions      结案需要回答的问题
  ├─ resolution     结案规则和结局
  ├─ progression    进度和行动成本
  ├─ panels         前端面板布局
  └─ prompts        LLM 提示词模板
```

### 3.1 Entity

Entity 表示案件世界里的对象，不表示答案。

```json
{
  "id": "wang",
  "kind": "person",
  "name": "王先生",
  "tags": ["suspect", "can-talk", "can-confront"],
  "secret": "他隐瞒了凌晨离开山庄的事实。",
  "script": "你叫王先生..."
}
```

`kind` 表示对象类型：

- `person`：人物
- `place`：地点
- `item`：物品
- `document`：文件
- `event`：事件
- `concept`：抽象概念

`tags` 表示案件语义和能力，例如 `suspect`、`witness`、`can-talk`、`can-search`。

### 3.2 Fact

Fact 表示事实、证词或时间线主张。

```json
{
  "id": "fact_wang_left",
  "statement": "王先生在凌晨 1:20 离开过山庄。",
  "truth": "true",
  "visibility": "hidden",
  "time": "01:20",
  "revealed_by": ["ticket_0120"]
}
```

Fact 可以是真，也可以是假。假事实通常对应某人的证词、误导性线索或表象。隐藏事实不能直接展示给玩家，只有被证据或交互揭示后才进入档案。

### 3.3 Evidence

Evidence 表示玩家可以发现、获得、比对或用于质询的证据。

```json
{
  "id": "ticket_0120",
  "title": "凌晨车票",
  "description": "车票显示王先生凌晨 1:20 离开过山庄。",
  "source_entity": "study",
  "reveals": ["fact_wang_left"],
  "contradicts": ["claim_wang_asleep"]
}
```

这样可以表达推理关系：

```text
证据 -> 揭示事实
证据 -> 反驳证词
证据 + 人物 -> 质询
证据集合 -> 结案答案
```

普通前端只能看到已发现证据。未发现证据、证据与隐藏事实的 `reveals` / `contradicts` 关系，只保存在后端完整 manifest 中。

### 3.4 Interaction

Interaction 表示玩家可执行动作。

```json
{
  "id": "talk_person",
  "type": "talk",
  "title": "交谈",
  "target": {
    "kind": ["person"],
    "tags": ["can-talk"]
  },
  "cost": {
    "progress": 1
  },
  "prompt": "talk_prompt"
}
```

首批交互类型：

- `talk`：与人物交谈。
- `search`：搜索地点。
- `inspect`：检查物品、文件、地点。
- `confront`：使用证据质询人物。
- `submit-resolution`：提交结案答案。

### 3.5 Questions

Question 表示玩家最终需要回答的问题。

```json
{
  "id": "culprit",
  "type": "single-entity",
  "title": "谁制造了密室假象？",
  "required": true,
  "answer": "rose"
}
```

问题类型：

- `single-entity`：答案是一个实体。
- `multi-entity`：答案是多个实体。
- `choice`：答案是预设选项。
- `text-rubric`：答案是文本，由关键词或 rubric 校验。
- `evidence-set`：答案是一组证据。

### 3.6 Resolution

Resolution 描述结案规则。

```json
{
  "type": "questionnaire",
  "required_questions": ["culprit", "method"],
  "pass_score": 2,
  "endings": {
    "perfect": "你完整还原了真相。",
    "partial": "你找到了部分真相，但仍有疑点。",
    "failed": "你的推理无法成立。",
    "timeout": "调查时间耗尽，案件被迫移交。"
  }
}
```

这使“指认真凶”变成结案问题的一种，而不是引擎的唯一胜负条件。

`culprit` 只是当前示例案件的问题 ID，不是引擎必需字段。后端只校验 `resolution.required_questions` 引用的问题存在。

## 4. 前端工作台

前端不再写死列类型，而是从 manifest 读取 `panels`：

```json
{
  "panels": [
    {
      "id": "investigation",
      "type": "entity-list",
      "title": "调查",
      "icon": "search",
      "width": "1/6",
      "filter": {
        "tags": ["can-talk", "can-search", "can-inspect"]
      }
    },
    {
      "id": "case-file",
      "type": "case-file",
      "title": "档案",
      "icon": "clipboard-list",
      "width": "1/4",
      "sections": ["status", "evidence", "facts", "questions"]
    }
  ]
}
```

React 侧只维护 Panel Registry：

```text
entity-list -> EntityListPanel
interaction -> InteractionPanel
narrative   -> NarrativePanel
case-file   -> CaseFilePanel
resolution  -> ResolutionPanel
settings    -> SettingsPanel
```

这样换案件时，可以通过 manifest 调整布局，而不需要修改前端代码。

SettingsPanel 替代默认 DebugPanel。它包含常规设置、重置游戏和开发调试入口。开发调试区默认折叠且不加载敏感数据；用户确认启用后，前端才请求 debug-only API 获取 Prompt、完整 manifest 或状态快照。

## 5. 后端 API 与数据暴露策略

后端内部统一使用 `entity.id`，不保留旧 NPC API 字段兼容层。新前端通过统一 interaction API 运行交谈、搜索、检查、质询和结案提交。

`GET /api/info` 返回 redacted `PublicCaseManifestV2`。普通前端不能通过该接口获得结案答案、隐藏事实、未发现证据、证据到事实的隐藏关系、实体秘密或敏感 Prompt。

完整案件数据只保存在后端内部。调试数据走独立 debug-only API，并且只有在后端显式 `debug.enabled=true`、用户在 SettingsPanel 确认启用后才请求：

```text
GET /api/debug/manifest
GET /api/debug/state
GET /api/debug/prompt
```

SettingsPanel 的确认弹窗只是防误触，不是安全边界；真正的剧透隔离由 `/api/info` redaction 和 debug-only API 保证。

游戏状态使用 `entity.id` 作为唯一运行时 key。聊天记录、当前实体、撤回快照都不应再依赖人物姓名或 `current_npc`。

前端所有状态更新必须经过 App 层 action。Panel 不直接修改 `gameState` props。结案入口统一放在 ResolutionPanel；实体列表只负责选择实体和触发可用交互，不提供固定“指认凶手”快捷入口。

## 6. 进度系统

进度从固定字段改为 driver：

```json
{
  "progression": {
    "type": "daily-rounds",
    "config": {
      "max": 3,
      "per_phase": 5,
      "labels": ["第一天", "第二天", "最终日"]
    }
  }
}
```

首批支持：

- `daily-rounds`：当前天数和轮次玩法的新 driver。
- `free`：无行动次数限制。

交互可以声明行动成本：

```json
{
  "cost": {
    "progress": 1
  }
}
```

流式和非流式 interaction 使用同一套行动成本规则。无可发现证据的搜索按失败交互处理，不消耗进度。

## 7. 当前版本边界

本设计只面向探案解密类游戏，不追求通用游戏引擎。当前不做：

- 通用 RPG 状态机。
- 可视化编辑器。
- 自动推理图求解器。
- 远程插件系统。
- 多案件切换 UI。
- PNG 元数据嵌入实现。

## 8. 推荐实施顺序

1. 定义 Case Manifest 类型和 Zod schema。
2. 迁移当前剧本为单文件 manifest。
3. 后端 repository 改为读取新 manifest，并返回 redacted public manifest。
4. 抽出 progression driver。
5. 实现统一 interaction API 和 resolution 提交。
6. 前端提取 Panel Registry。
7. 前端由 manifest panels 动态渲染工作台。
8. 更新 README、测试和构建检查。
