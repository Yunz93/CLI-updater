# CLI Updater 产品需求文档

## 1. 背景

很多开发者在命令行环境中使用 AI 编程 CLI 和其他开发工具。此类工具通常依赖 npm、Homebrew、独立安装脚本、二进制包或官方自更新机制，不同工具的版本检测和更新方式不统一。

在实际使用中，用户容易遇到以下问题：

- 不知道本地 CLI 是否已经落后。
- 不同 CLI 的更新命令不一致，需要逐个查询。
- 部分 CLI 没有稳定的自动更新提示。
- 更新前缺少清晰的风险提示和 dry-run 能力。
- 团队或多机器环境中难以统一检查 CLI 版本状态。

CLI Updater 旨在提供一个统一、可扩展、可脚本化的命令行更新管理器，帮助用户检测主流 CLI 工具的安装状态、当前版本、最新版本，并在用户明确确认后执行或引导更新。

## 2. 产品目标

### 2.1 核心目标

- 统一检测多个 CLI 工具的安装与版本状态。
- 清晰展示本地版本、最新版本、更新状态和建议操作。
- 支持 CLI-first 的交互方式，适合终端用户和脚本化场景。
- 首期重点支持 Claude Code 与 Codex CLI。
- 保持 provider/adapter 架构，便于后续扩展更多 CLI。

### 2.2 非目标

- 不做图形界面。
- 不强制接管用户现有安装方式。
- 不在未确认的情况下自动执行更新。
- 不保证覆盖所有第三方 CLI 的私有更新逻辑。
- 不在 MVP 阶段实现企业级设备管理、策略下发或远程编排。

## 3. 目标用户

### 3.1 个人开发者

使用 Claude Code、Codex CLI 等 AI 编程工具，希望快速知道本机工具是否需要更新，并用统一命令完成检查。

### 3.2 高频终端用户

长期在终端中工作，希望把 CLI 版本检查加入 shell alias、dotfiles、定期任务或本地维护脚本。

### 3.3 小团队技术负责人

希望团队成员能够用统一方式检查 AI 编程 CLI 的版本，减少因版本差异导致的行为不一致。

## 4. 核心使用场景

### 4.1 检查全部支持的 CLI

用户执行：

```bash
agent-cli-updater check
```

系统输出所有已支持工具的安装状态、当前版本、最新版本和更新建议。

### 4.2 检查指定 CLI

用户执行：

```bash
agent-cli-updater check codex
agent-cli-updater check claude
```

系统只检查指定 CLI，并输出该工具的版本状态。

### 4.3 以 JSON 输出供脚本使用

用户执行：

```bash
agent-cli-updater check --json
```

系统输出结构化结果，便于 CI、定时任务或其他自动化工具读取。

### 4.4 预览更新操作

用户执行：

```bash
agent-cli-updater update codex --dry-run
```

系统展示将要执行的检测与更新步骤，但不真正修改系统环境。

### 4.5 明确确认后更新

用户执行：

```bash
agent-cli-updater update codex
```

系统展示更新计划，并要求用户确认。只有用户确认后，才执行对应 provider 暴露的安全更新流程。

## 5. 功能需求

### 5.1 CLI 工具检测

系统应支持检测目标 CLI 是否安装。

检测内容包括：

- 可执行文件是否存在。
- 可执行文件路径。
- 当前版本是否可读取。
- 安装来源是否可推断。

MVP 目标工具：

- Claude Code
- Codex CLI

验收标准：

- 未安装时，输出明确的 `not installed` 状态。
- 已安装但版本读取失败时，输出 `unknown version`，并保留错误摘要。
- 不因单个 provider 检测失败导致整个检查流程中断。

### 5.2 版本读取

系统应通过 provider 读取本地 CLI 版本。

设计要求：

- 每个 provider 独立维护版本命令和解析逻辑。
- 版本解析失败时，应返回结构化错误。
- 版本解析逻辑应有单元测试覆盖。

验收标准：

- 能识别常见语义化版本格式。
- 对带前缀的版本输出具备容错能力，例如 `v1.2.3`、`tool 1.2.3`。
- 解析失败时不会输出误导性的版本号。

### 5.3 最新版本查询

系统应查询或推断目标 CLI 的最新版本。

设计要求：

- 最新版本查询逻辑由 provider 管理。
- 支持网络失败、源不可用、限流等错误状态。
- 错误状态应清晰展示，不应被误判为无需更新。

验收标准：

- 查询成功时，展示 latest version。
- 查询失败时，展示 `latest unknown` 和失败原因摘要。
- 不阻塞其他 provider 的检查。

### 5.4 版本比较

系统应比较本地版本与最新版本，得到更新状态。

状态包括：

- `not_installed`
- `up_to_date`
- `update_available`
- `local_newer`
- `unknown`
- `error`

验收标准：

- 语义化版本比较准确。
- 未知版本不参与错误比较。
- 本地版本高于远端版本时，明确标记为 `local_newer`。

### 5.5 更新建议

系统应为每个 provider 输出更新建议。

建议类型包括：

- 可自动执行的更新命令。
- 需要用户手动执行的说明。
- 因安装来源不明而无法安全更新的提示。

验收标准：

- check 命令只展示建议，不执行更新。
- update 命令在执行前展示计划。
- 无法安全自动更新时，退化为手动说明。

### 5.6 更新执行

系统可以在用户明确确认后执行 provider 定义的更新流程。

设计要求：

- 默认要求确认。
- 支持 `--yes` 跳过交互确认，便于脚本使用。
- 支持 `--dry-run` 预览。
- 更新命令失败时展示退出码和错误摘要。

验收标准：

- 未确认时不修改系统环境。
- `--dry-run` 不执行真实更新命令。
- 更新失败时不会吞掉错误。

### 5.7 结构化输出

系统应支持 JSON 输出。

示例结构：

```json
{
  "tools": [
    {
      "id": "codex",
      "name": "Codex CLI",
      "installed": true,
      "path": "/usr/local/bin/codex",
      "currentVersion": "1.2.3",
      "latestVersion": "1.3.0",
      "status": "update_available",
      "updateAvailable": true,
      "message": "Update available"
    }
  ]
}
```

验收标准：

- JSON 输出不包含终端颜色控制字符。
- 字段命名稳定。
- 单个 provider 失败时，也返回该 provider 的错误字段。

## 6. 命令设计

### 6.1 基础命令

```bash
agent-cli-updater check
agent-cli-updater check <tool>
agent-cli-updater update <tool>
agent-cli-updater list
agent-cli-updater doctor
```

### 6.2 全局选项

```bash
--json
--verbose
--no-color
--config <path>
```

### 6.3 check 选项

```bash
--all
--only-installed
--include-not-installed
```

### 6.4 update 选项

```bash
--dry-run
--yes
--strategy <auto|manual>
```

### 6.5 退出码

- `0`: 命令执行成功，无严重错误。
- `1`: 命令执行失败。
- `2`: 检测到可更新版本。
- `3`: 参数错误。
- `4`: 部分 provider 检查失败。

退出码设计需要兼顾人类使用和脚本使用。MVP 可先实现 `0`、`1`、`2`，后续再细化。

## 7. 信息架构

### 7.1 Provider 模型

每个 provider 应暴露统一接口：

```text
id
displayName
detect()
getCurrentVersion()
getLatestVersion()
getUpdatePlan()
runUpdate()
```

### 7.2 检查结果模型

```text
tool id
display name
installed
executable path
current version
latest version
status
update available
install source
message
errors
```

### 7.3 更新计划模型

```text
tool id
current version
target version
strategy
commands
requires confirmation
manual instructions
risk notes
```

## 8. 配置需求

MVP 可以先不要求配置文件，但架构上应预留配置能力。

未来可支持：

- 禁用指定 provider。
- 自定义 provider 检测路径。
- 配置网络超时。
- 配置镜像源或版本源。
- 配置默认输出格式。
- 配置是否允许自动更新。

## 9. 安全与风险控制

- 更新执行必须由用户显式触发。
- 默认不使用 sudo。
- 如果 provider 需要高权限，应提示用户原因并给出手动命令。
- 输出将要执行的命令，避免隐藏操作。
- 不记录敏感环境变量。
- 不上传本地 CLI 清单。

## 10. MVP 范围

MVP 必须包含：

- `check` 命令。
- `check <tool>` 命令。
- Claude Code provider。
- Codex CLI provider。
- 本地版本读取。
- 最新版本查询。
- 版本比较。
- 人类可读输出。
- JSON 输出。
- 基础错误处理。
- 版本解析与比较测试。

MVP 可选包含：

- `update <tool> --dry-run`
- `list`
- `doctor`

MVP 暂不包含：

- 后台自动更新。
- 图形界面。
- 多机器远程管理。
- 自定义第三方 provider 插件系统。
- 自动安装未安装的 CLI。

## 11. 后续版本规划

### 11.1 v0.2

- 增加 `update <tool> --dry-run`。
- 增加 `list` 展示支持的 provider。
- 增加 `doctor` 检查运行环境。
- 增加更多安装来源识别。

### 11.2 v0.3

- 增加安全的自动更新执行。
- 支持配置文件。
- 支持更多 AI CLI 与开发 CLI。
- 增加缓存，减少重复网络请求。

### 11.3 v1.0

- 稳定 provider 接口。
- 稳定 JSON schema。
- 完整测试覆盖核心 provider。
- 明确跨平台支持策略。

## 12. 体验要求

### 12.1 人类可读输出

默认输出应简洁、可扫描。

示例：

```text
CLI Updater

Codex CLI    1.2.3 -> 1.3.0    update available
Claude Code  0.8.1             up to date
```

### 12.2 错误输出

错误应可理解，并给出下一步。

示例：

```text
Codex CLI: installed, but version could not be parsed.
Run with --verbose to see raw command output.
```

### 12.3 脚本友好

- JSON 输出稳定。
- 退出码有意义。
- 支持无颜色输出。
- 不在 JSON 模式输出交互提示。

## 13. 测试要求

必须覆盖：

- provider 检测成功。
- provider 检测失败。
- 版本输出解析。
- latest version 查询失败。
- 版本比较。
- JSON 输出结构。
- dry-run 不执行真实命令。

建议使用 fixtures 保存真实或模拟命令输出，避免测试依赖用户机器环境。

## 14. 验收标准

MVP 完成时，应满足：

- 用户可以运行一个命令检查 Claude Code 和 Codex CLI 的版本状态。
- 未安装、已安装、版本未知、可更新、已最新等状态均能正确表达。
- 任一 provider 失败不会导致其他 provider 结果丢失。
- JSON 输出可以被脚本稳定解析。
- 更新执行路径不会在用户未确认时修改环境。
- 核心解析和比较逻辑有自动化测试。

## 15. 开放问题

- 首个实现语言与包管理方式如何选择。
- CLI 工具自身的发布渠道如何确定和验证。
- Claude Code 与 Codex CLI 的安装来源是否需要在 MVP 阶段区分。
- 是否需要支持 Windows，还是先聚焦 macOS/Linux。
- 更新命令是否由本工具执行，还是长期只提供明确指引。
