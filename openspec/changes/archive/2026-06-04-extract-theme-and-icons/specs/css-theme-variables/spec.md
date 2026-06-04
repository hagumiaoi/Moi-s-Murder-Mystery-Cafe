## ADDED Requirements

### Requirement: 所有颜色值使用 CSS 自定义属性
前端 SHALL 将所有硬编码颜色值替换为 `:root` 中定义的 CSS 自定义属性引用。

#### Scenario: 主题变量覆盖默认背景
- **WHEN** 在 `:root` 中定义 `--bg-primary: #0a0806`
- **THEN** `body` 的 `background` SHALL 引用 `var(--bg-primary)` 而非字面值

#### Scenario: 变量按语义分组
- **WHEN** 开发者查看 `:root` 块
- **THEN** SHALL 看到按背景/文字/强调/告警/边框/覆盖层分组的变量声明，每组有注释说明用途

### Requirement: ceorl 焦点颜色使用项目金色
前端 SHALL 将 ceorl.css 中 `--ceorl-focus-color` 的值从 `#66ccff` 改为引用项目 accent 变量。

#### Scenario: 活动列焦点环颜色与主题一致
- **WHEN** 某个工作台列处于活动状态
- **THEN** 该列的焦点环 box-shadow SHALL 使用项目金色（`var(--accent)`）而非冷蓝色

### Requirement: 变量覆盖所有现有颜色使用点
`:root` 中定义的变量 SHALL 覆盖 App.css 中所有 33 个颜色值的每一个使用点。

#### Scenario: 构建后不存在硬编码颜色
- **WHEN** 执行 `grep '#[0-9a-fA-F]\{6\}' App.css` 排除 `:root` 块
- **THEN** SHALL 不返回任何匹配行
