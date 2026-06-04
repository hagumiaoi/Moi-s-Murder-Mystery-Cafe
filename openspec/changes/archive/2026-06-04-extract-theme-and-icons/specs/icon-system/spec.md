## ADDED Requirements

### Requirement: 使用 Lucide 图标替代所有 emoji
前端 SHALL 使用 `lucide-react` 图标组件替代所有硬编码的 emoji 字符。

#### Scenario: 按钮中的 emoji 被替换
- **WHEN** 审问列中显示"发送"按钮
- **THEN** SHALL 使用 `Send` 图标组件而非 emoji 字符

#### Scenario: 列标题中的 emoji 被替换
- **WHEN** StoryPanel 渲染标题
- **THEN** SHALL 使用 `<BookOpen size={14} />` 替代 `📖` 字面值

#### Scenario: WorkspaceDock 渲染图标
- **WHEN** WorkspaceDock 渲染一个列的缩略导航项
- **THEN** SHALL 根据 `WorkspaceColumn.icon` 字段的字符串标识映射到对应的 Lucide 组件并渲染

### Requirement: icon 字段使用字符串标识
`WorkspaceColumn.icon` 字段的类型 SHALL 为字符串（如 `"search"`, `"message-circle"`），而非 emoji 字面值。

#### Scenario: 默认列配置使用字符串 icon
- **WHEN** 读取 `DEFAULT_COLUMNS` 常量
- **THEN** 每个列的 `icon` SHALL 是 Lucide 图标名的 kebab-case 字符串

### Requirement: 不引入未使用的图标
构建产物 SHALL 仅包含实际使用的 Lucide 图标，不打包未引用的图标。

#### Scenario: 生产构建体积可控
- **WHEN** 执行 `vite build`
- **THEN** JS bundle 增加不超过 10KB gzipped
