## ADDED Requirements

### Requirement: 游戏规则与 HTTP 路由分离
后端 SHALL 将游戏规则实现为可以脱离 HTTP 请求直接调用的模块。

#### Scenario: 路由处理聊天请求
- **WHEN** 聊天路由收到有效消息
- **THEN** 路由 SHALL 委托游戏模块和 LLM 模块处理轮次推进、状态变更、Prompt 执行和响应构建，而不是在路由函数中嵌入完整业务流程

### Requirement: 剧本内容通过 Repository 加载
后端 SHALL 通过专门的 Script Repository 加载 `Script/manifest.json` 和 NPC 文本文件，并进行运行时校验。

#### Scenario: 后端使用有效剧本启动
- **WHEN** 后端加载有效 manifest 和被引用的 NPC 文本文件
- **THEN** Repository SHALL 向游戏引擎提供带类型的剧本元信息、NPC 定义、搜索地点、Prompt 模板和 NPC 文本

#### Scenario: 后端使用无效剧本启动
- **WHEN** manifest 缺少必要字段，或包含无效 NPC/搜索地点数据
- **THEN** 后端 SHALL 在提供游戏请求服务前失败，并给出清晰校验错误

### Requirement: 游戏状态通过 Store 管理
后端 SHALL 通过 Store 抽象访问可变游戏状态。

#### Scenario: 新游戏开始
- **WHEN** 调用 `POST /api/new-game`
- **THEN** Store SHALL 将游戏重置为第 1 天、第 0 轮、配置的首个 NPC、空故事、空线索和空的按 NPC 分组聊天历史

#### Scenario: 后续替换存储实现
- **WHEN** 内存 Store 被替换为其他 Store 实现
- **THEN** 路由处理器和游戏规则代码 SHALL 继续使用相同 Store 接口

### Requirement: 保留现有玩法行为
后端 SHALL 保留当前轮次推进、线索发现、NPC 切换、指认、超时、撤回重发行为。

#### Scenario: 轮次推进
- **WHEN** 聊天或成功发现新线索的搜索消耗一轮
- **THEN** 后端 SHALL 增加轮次数，在达到 `rounds_per_day` 后推进天数并追加配置的日期切换故事，在超过 `max_days` 后标记游戏结束

#### Scenario: 玩家搜索地点
- **WHEN** 玩家搜索一个仍有未发现线索的地点
- **THEN** 后端 SHALL 按 manifest 中的顺序揭示第一个未发现线索，将其加入状态，并追加生成或 fallback 的故事正文

#### Scenario: 玩家重复搜索已耗尽地点
- **WHEN** 玩家搜索一个没有未发现线索的地点
- **THEN** 后端 SHALL 返回当前“没有更多线索”的响应，并且不消耗轮次

#### Scenario: 玩家指认目标
- **WHEN** 玩家指认某个 NPC
- **THEN** 后端 SHALL 标记游戏结束，比较目标是否为配置的真凶，追加配置的胜利或失败消息，并返回最终状态

#### Scenario: 玩家撤回并重发消息
- **WHEN** 玩家基于有效玩家消息快照执行重发
- **THEN** 后端 SHALL 在生成替代回复前，恢复天数、轮次、故事、线索、当前 NPC 和聊天历史到快照状态
