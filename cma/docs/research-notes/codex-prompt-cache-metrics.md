# Codex Prompt Cache 统计口径

日期：2026-05-08

## 背景

分析来源：

- XAI Router 文章：<https://xaicontrol.com/blog/xai-router-codex-cache/>
- OpenAI Prompt Caching：<https://developers.openai.com/api/docs/guides/prompt-caching>
- OpenAI Responses API：<https://developers.openai.com/api/reference/resources/responses/methods/create>
- OpenAI Pricing：<https://platform.openai.com/docs/pricing/>

这篇 XAI Router 文章主要讨论如何提升 Codex 长会话里的 prompt cache 命中。CMA 当前不需要复刻它的路由优化策略，只需要把 cache 命中情况统计出来，用于本地 Insights 和费用估算。

## 结论

“cache hint” 在我们的 UI 和数据字段里应当命名为 `cache hit` 或 `cached input ratio`。它不是用户显式传入的 hint，而是上游模型服务返回的缓存命中结果。

核心统计口径：

```text
input_tokens = usage.input_tokens
cached_input_tokens = usage.input_tokens_details.cached_tokens
uncached_input_tokens = input_tokens - cached_input_tokens
cache_hit_rate = cached_input_tokens / input_tokens
```

如果缺少 `input_tokens_details.cached_tokens`，缓存状态必须显示为 `Unknown`，不能当成 0。缺字段表示“不知道是否命中”，不是“没有命中”。

## Input Cache 与 Output Cache

OpenAI/Codex 的 prompt caching 统计通常只有 input cache：

- `input_tokens`
- `input_tokens_details.cached_tokens`
- `output_tokens`
- `output_tokens_details.reasoning_tokens`

没有可靠的 `output_cached_tokens` 口径。Prompt caching 缓存的是输入 prompt 的稳定前缀，不是模型生成的输出。

因此 CMA 不要设计 “output cache” 卡片。可以展示：

- Input Tokens
- Cached Input Tokens
- Uncached Input Tokens
- Cache Hit Rate
- Output Tokens
- Reasoning Tokens

其中 `reasoning_tokens` 通常是 output token 的子集，不应额外重复计费。

## Cache Read 与 Cache Write

可以概念性理解为：

```text
第一次请求：
  稳定前缀尚未命中缓存
  input_tokens 按普通 input 价格计算
  服务端自动写入可复用缓存

后续请求：
  相同或高度稳定的前缀命中缓存
  cached_input_tokens 按 cached input 价格计算
  uncached_input_tokens 仍按普通 input 价格计算
```

但 OpenAI 官方 usage 字段不会把 input cache 拆成 `cache_write_tokens` 和 `cache_read_tokens`。CMA 不应伪造这两个字段。

更稳妥的 UI 文案：

- `Cached Input`：上游明确返回的缓存命中 input token。
- `Uncached Input`：`input_tokens - cached_input_tokens`。
- `Cache Status`：`Known` 或 `Unknown`。

不要显示 “Cache Write Cost”，除非未来上游明确返回 write/read 分离字段。

## 费用估算

费用只能作为 estimate 展示，不能当成账单。

推荐公式：

```text
estimated_cost_usd =
  uncached_input_tokens / 1_000_000 * input_price
+ cached_input_tokens / 1_000_000 * cached_input_price
+ output_tokens / 1_000_000 * output_price
```

节省估算：

```text
estimated_cache_savings_usd =
  cached_input_tokens / 1_000_000 * (input_price - cached_input_price)
```

如果缺少 cached input 字段：

- 不计算 cache hit rate。
- 不计算 cache savings。
- 费用估算可以退化为 `input_tokens * input_price + output_tokens * output_price`，并标记为 `cache_unknown_estimate`。

## CMA 落地字段

`src/host/usage-ledger.js` 后续可以扩展保存这些可选字段：

```text
input_tokens
cached_input_tokens
uncached_input_tokens
output_tokens
reasoning_output_tokens
total_tokens
cache_hit_rate
cache_known
model
estimated_cost_usd
estimated_cache_savings_usd
usage_source
```

字段约束：

- `cached_input_tokens` 缺失时用 `null`，不要写 0。
- `cache_known` 只有在上游明确返回 cached token 字段时才为 `true`。
- `total_tokens` 继续表示 `input_tokens + output_tokens`。
- `billable_tokens` 如果需要展示，应另起字段，避免和 `total_tokens` 混淆。
- `reasoning_output_tokens` 只做拆分展示，不加入额外总价。

## Insights UI 建议

这些指标适合放在 Insights 页，不适合塞进 Accounts 页。

推荐卡片：

- Today Tokens
- Cached Input
- Cache Hit Rate
- Estimated Cost
- Output / Reasoning Split

显示原则：

- cache 未知时显示 `Unknown`，不要显示 `0%`。
- 预计费用要有 `Estimated` 标签。
- 今日 token 仍可按 `input_tokens + output_tokens` 展示。
- 如果要展示更接近“实际消耗”的输入量，可额外展示 `uncached input`，但不要替代总 token。

## 当前实现状态

当前 `src/host/usage-ledger.js` 已先落地保守统计口径：

- 从 Codex CLI `turn.completed.usage` 读取 `input_tokens_details.cached_tokens`
- 保存 `cached_input_tokens`、`uncached_input_tokens`、`cache_known`、`cache_hit_rate`
- 保存 `output_tokens_details.reasoning_tokens` 到 `reasoning_output_tokens`
- cache 字段缺失时保持 `Unknown`，不当成 0
- 在 persisted usage report 和 Insights range summary 中聚合 cache/reasoning 指标
- Insights 页展示 `Cached Input` 和 `Reasoning Tokens`

仍然刻意不做：

- output cache
- cache read/write 拆分
- 费用估算
- 按 LiteLLM 或外部价格表自动拉取价格

后续如果要做费用估算，测试重点：

- 缺少 `cached_tokens` 时不能被当成 0。
- `cached_tokens` 大于 0 时正确计算 hit rate。
- `reasoning_tokens` 不重复加入 total/cost。
- 不同模型价格缺失时费用显示为 Unknown 或 fallback estimate。
