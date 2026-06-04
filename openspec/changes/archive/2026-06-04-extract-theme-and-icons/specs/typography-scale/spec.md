## ADDED Requirements

### Requirement: 字体尺寸使用 CSS 变量
前端 SHALL 将所有硬编码的 `font-size` 值替换为 `:root` 中定义的 5 档 CSS 自定义属性引用。

#### Scenario: 变量定义完整档位
- **WHEN** 开发者查看 `:root` 块
- **THEN** SHALL 存在 `--text-xs`(10px)、`--text-sm`(12px)、`--text-base`(14px)、`--text-lg`(16px)、`--text-xl`(20px) 五个变量

#### Scenario: 选择器引用变量而非字面值
- **WHEN** 检查 App.css 中所有 `font-size` 声明
- **THEN** 每个 SHALL 使用 `var(--text-*)` 引用，而非字面 px 值

### Requirement: 统一尺度提升可读性
正文和交互文字 SHALL 使用不低于 12px 的字号，正文段落 SHALL 使用 14px。

#### Scenario: 按钮文字为 12px
- **WHEN** 渲染按钮组件
- **THEN** 其 `font-size` SHALL 为 `var(--text-sm)` = 12px

#### Scenario: 故事正文为 14px
- **WHEN** 渲染 `.story-paragraph` 元素
- **THEN** 其 `font-size` SHALL 为 `var(--text-base)` = 14px
