# 任务拆分

主体任务已实现；以下 Review Follow-up 仍需处理，完成前不要归档该 change。

## 0. OpenSpec 目录与变更元数据整理

- [x] 0.1 确认 active change 的目录层级可被 OpenSpec CLI 正确识别。
- [x] 0.2 将 change id 调整为合法且不带误导日期的 `detective-case-engine-architecture`。

## 1. Case Manifest 类型与 Schema

- [x] 1.1 在 `shared/` 中定义 `CaseManifestV2`, `PublicCaseManifest`, `EntityDef`, `FactDef`, `EvidenceDef`, `InteractionDef`, `QuestionDef`, `ResolutionDef`, `ProgressionDef`, `PanelDef`。
- [x] 1.2 在后端 `script/schemas.ts` 编写对应 Zod schema（仅 V2，移除 V1）。
- [x] 1.3 定义 redaction 规则：`facts[visibility=hidden]`、`questions.answer`、`questions.rubric`、实体秘密和敏感 Prompt 不进入普通 `/api/info`。

## 2. 现有剧本迁移为探案解密 Case Manifest

- [x] 2.1 将现有 `Li.txt` / `Wang.txt` / `rose.txt` 内联到 `Script/manifest.json`。
- [x] 2.2 将 `npcs[]` 迁移为 `entities[kind=person]`。
- [x] 2.3 将 `search_locations[]` 迁移为 `entities[kind=place, tags=["can-search"]]` 和 `evidence[]`。
- [x] 2.4 将 `is_murderer` 迁移为 `questions[id="culprit"]` 的答案。
- [x] 2.5 将 `win_message`、`lose_message`、`timeout_message` 迁移为 `resolution.endings`。
- [x] 2.6 将 `max_days`、`rounds_per_day` 迁移为 `progression.type="daily-rounds"`。
- [x] 2.7 删除旧外挂文本文件，`Script/manifest.json` 单文件可完整运行。

## 3. 后端 Repository 与公开 Manifest

- [x] 3.1 修改 `script/repository.ts`：读取并校验 Case Manifest（仅 V2）。
- [x] 3.2 内部统一使用 `entity.id` 作为状态 key。
- [x] 3.3 提供按实体查询的 repository helper：脚本、秘密、可交互实体、地点、证据、问题。
- [x] 3.4 实现 `PublicCaseManifest` redaction（隐藏 fact、strip answer/rubric）。
- [x] 3.5 `GET /api/info` 返回 redacted `PublicCaseManifest`。
- [x] 3.6 debug-only API：`GET /api/debug/manifest`、`GET /api/debug/state`、`POST /api/debug/prompt`。

## 4. Progression Driver

- [x] 4.1 `advanceRound()` 从 manifest `progression` 读取配置，移除硬编码 `max_days/rounds_per_day`。
- [x] 4.2 实现 `daily-rounds` 和 `free`。
- [x] 4.3 支持 interaction cost：`cost.progress`，`free` 模式不消耗。
- [x] 4.4 游戏状态使用新字段：`phase`、`step`、`current_entity`、`discovered_evidence`、`revealed_facts`。

## 5. Interaction Handler 实现

- [x] 5.1 统一 interaction 输入结构：`interaction_id`、`target_entity`、`evidence_ids`、`text`、`answers`。
- [x] 5.2 实现 `talk`、`search`、`inspect`、`confront`、`submit-resolution`。
- [x] 5.3 统一 `/api/interact` + `/api/interact/stream` (SSE)。
- [x] 5.4 移除旧 `/api/chat`、`/api/search`、`/api/accuse` 语义。

## 6. Resolution 校验

- [x] 6.1 实现 `questionnaire` 结案规则。
- [x] 6.2 支持 `single-entity`、`multi-entity`、`choice`、`evidence-set` 精确校验。
- [x] 6.3 `text-rubric` 使用关键词包含匹配。
- [x] 6.4 根据 `pass_score` 生成 `perfect`、`partial`、`failed` 结局。
- [x] 6.5 "指认真凶"玩法通过 `questions/resolution` 完成。

## 7. 前端 Panel Registry

- [x] 7.1 创建 `frontend/src/panels/` 目录。
- [x] 7.2 实现 `PanelRegistry`：panel type → React 组件映射表。
- [x] 7.3 `entity-list` → `EntityListPanel`。
- [x] 7.4 `interaction` → `InteractionPanel`。
- [x] 7.5 `narrative` → `NarrativePanel`。
- [x] 7.6 `case-file` → `CaseFilePanel`。
- [x] 7.7 `resolution` → `ResolutionPanel`。
- [x] 7.8 `settings` → `SettingsPanel`（含折叠调试区 + 确认弹窗）。
- [x] 7.9 仅注册 V2 面板类型，不注册旧面板别名。
- [x] 7.10 `App.tsx` 不再包含面板渲染 switch。

## 8. 前端按 Manifest 渲染工作台

- [x] 8.1 `App.tsx` 从 `/api/info` 读取 `panels[]` 并映射为 WorkspaceShell 列配置。
- [x] 8.2 删除旧 `DEFAULT_COLUMNS` 的 debug 面板，`WorkspaceColumnType` 为普通字符串。
- [x] 8.3 `useWorkspaceLayout` 接受动态列配置。
- [x] 8.4 未知 panel type 显示降级提示。
- [x] 8.5 manifest `panels` 调整后前端自动反映。

## 9. Entity / Evidence / Case File 前端展示

- [x] 9.1 `EntityListPanel` 从 `entities` 渲染人物 + 地点 + 动作入口。
- [x] 9.2 `CaseFilePanel` 展示进度、证据、公开/已揭示 facts、实体、结案问题。
- [x] 9.3 隐藏事实和问题答案不在公开信息中展示。
- [x] 9.4 进度显示由 `progression` 配置驱动。
- [x] 9.5 案件档案只依赖 `entities`、`evidence`、`facts`、`questions` 和运行时状态。
- [x] 9.6 SettingsPanel 调试区默认折叠，确认后才请求 debug-only API。

## 10. 测试与文档

- [x] 10.1 后端测试更新覆盖新 schema、redaction、debug-only API、progression、resolution（24 tests pass）。
- [x] 10.2 前端 Vite build 通过。
- [x] 10.3 README 已更新（本文件作为设计文档）。
- [x] 10.4 `docs/detective-case-engine-design.md` 作为中文设计文档。
- [x] 10.5 后端测试（24 pass）、前端 build（成功）。

## 11. Review Follow-up 修正

- [x] 11.1 移除后端对固定 `questions[id="culprit"]` 的启动校验，只校验 `resolution.required_questions` 引用存在。
- [x] 11.2 `/api/info` 的 public manifest 只返回已发现 evidence，并从公开 evidence 中移除 `reveals`、`contradicts`、敏感 metadata。
- [x] 11.3 debug-only API 增加后端 `debug.enabled` 配置保护；未开启时返回 403。
- [x] 11.4 游戏状态移除 `current_npc`，`chat_history` 统一以 `entity.id` 为 key，撤回快照也保存 entity id。
- [x] 11.5 `/api/interact` 不再预写聊天消息；只有具体 `talk` / `confront` handler 写聊天记录，`search` / `inspect` 不写空聊天。
- [x] 11.6 interaction 先完成目标和前置条件校验，再按 `interaction.cost.progress` 消耗进度；失败交互不消耗进度。
- [x] 11.7 `search` 每次只发现一个未发现 evidence，并只揭示该 evidence 的 `reveals` facts。
- [x] 11.8 `ResolutionPanel` 提交所有已填写的问题答案，调用 `submit-resolution`，不再固定 `culprit` 或 `accuse`。
- [x] 11.9 为 11.1-11.8 增加后端和前端回归测试（23 tests pass，前端 build 成功）。

## 12. Review Follow-up 2 修正

- [x] 12.1 为 `GameActions` 增加 `submitResolution(answers)`，由 App 层调用 `/api/interact` 并 `setState`；`ResolutionPanel` 不得 `Object.assign(state, ...)`。
- [x] 12.2 移除 `EntityListPanel` 中固定"发起指认"入口，以及 App 层硬编码 `question_id: "culprit"` 的 `accuse` action。
- [x] 12.3 `/api/interact/stream` 使用与 `/api/interact` 相同的 interaction cost 计算，支持 `cost.progress=0` 和 `cost.progress>1`。
- [x] 12.4 `search` 无可发现 evidence 时不消耗进度，在前置校验阶段提前返回错误。
- [x] 12.5 定义并使用 `PublicEvidenceDef`，`PublicCaseManifest.evidence` 和前端公开 script 类型不得包含 `reveals` / `contradicts`。
- [x] 12.6 为 12.1-12.5 增加回归测试（23 tests pass，前端 build 成功）。

## 13. Review Follow-up 3 修正

- [x] 13.1 将 `specs/*/spec.md` 改为 OpenSpec delta 格式，使 `openspec validate detective-case-engine-architecture --strict` 通过。
- [x] 13.2 前端在交互、新游戏和结案后刷新公开 `/api/info`，确保公开 facts/evidence 随 `revealed_facts` / `discovered_evidence` 更新。
- [x] 13.3 `ResolutionPanel` 支持 `multi-entity` 和 `evidence-set` 的数组答案提交。
- [x] 13.4 `SettingsPanel` 在后端 debug 未开启时显示不可用状态，并接入 `/api/debug/state`。
- [x] 13.5 `backend/config.example.toml` 显式包含 `[debug] enabled = false`。
- [x] 13.6 使用 Bun 和 OpenSpec 运行验证：`bun test`、`bunx tsc --noEmit`、`bun run build`、`openspec validate detective-case-engine-architecture --strict`。
