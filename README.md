# dsh-token-usage-panel

> DeepSeek Harness 插件：左侧栏加一个入口，看 token 总用量、缓存命中率，以及按供应商 / 模型 / 会话拆开的使用情况。

## 这是什么

DSH 会在会话日志里记下每次模型请求的 usage（未命中输入、输出、缓存读、缓存写），以及这次请求走的 provider 和 model。界面上原本只有一个上下文占用比。

这个插件把这些数字摊开成左侧栏的一个面板：

- **汇总**：总 token、输入（未命中缓存）、输出、缓存（读 + 写）、缓存命中率、有用量的会话数
- **按供应商**：请求数、输入、输出、缓存读、缓存写、命中率、合计
- **按模型**：同样的列，一行一个模型，副行标出所属 provider
- **按会话**：上下文占用条、四类 token、命中率、合计

每张表按合计降序，表头吸顶，列宽固定；中英文案跟随界面语言。

## 安装

需要一个能加载本地 bundle 的 DSH（桌面版或 `dsh web`）。

```bash
git clone https://github.com/DAweiD1/dsh-token-usage-panel.git
```

然后在 DSH 会话里让 agent 调用 `plugin_manager` 的 `install_bundle`，`target` 传这个目录的绝对路径；也可以在 Settings → Plugins 里选本地目录安装。装完刷新页面。

Host 半要注册投影，需要一次插件重载（在插件列表里禁用再启用本插件，或重启 DSH）。

## 数字怎么算

- **总 token** = 未命中输入 + 输出 + 缓存读 + 缓存写
- **缓存命中率** = 缓存读 ÷（未命中输入 + 缓存读 + 缓存写），与 DSH 自带统计页同一口径；分母为 0 时显示 `—`，悬停可看分子分母原值
- **请求数** = 回报了 usage 的请求数。同一步里重试的尝试也会计入（与 DSH 的 `tokenUsage` 语义一致，不互相覆盖）

## 实现

| 文件 | 作用 |
| --- | --- |
| `index.js` | Host 半：注册一个 Session projection `tokenUsageByRoute`，把每次 `assistant/message`（或带 usage chunk 的 `assistant/attempt`）按 `provider × model` 折叠 |
| `client.js` | 浏览器半：侧栏图标 + `main` 面板，读 `tokenUsage` 与 `tokenUsageByRoute` 两个投影 |
| `cordis.patch.yml` | 往 Loader 插一行 `token-usage` |

两个投影都随 `session/list` 的 projection hint 一起下发，所以客户端不发额外请求，插件也没有额外的 HTTP 面。

provider / model 优先取消息自己的 `source`，拿不到时回退到最近的 `request/context` 或 `request/header`。

## 已知限制

- **依赖 DSH 内部管线**：`tokenUsageByRoute` 是 `SessionProjectionMap` 之外的 key，客户端还用了 `projectionValues` 和 `refreshProjections`。这些不是稳定的公开 API，DSH 升级后可能需要跟着改。
- **老会话要补算**：`tokenUsageByRoute` 是后加的 key，已有会话的投影缓存里没有它。面板打开时会串行补读缺失的会话（每次最多 60 个，不阻塞渲染），补读期间分解表右上角显示「已统计 N/M 个会话」，两张分解表的合计会小于顶部总合计。
- **没有自动化测试**：折叠逻辑按 DSH `tokenUsage` 的语义实现并手工核对过，仓库里没有测试用例。
- 包名 `@local/dsh-token-usage` 是本地占位；要发到 npm 请自行换 scope。

## License

MIT