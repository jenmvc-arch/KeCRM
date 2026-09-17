# FlowTrace CRM

这是「WhatsApp 广告客户追踪、AI 分类与 Meta 成交回传系统」的可运行演示版，并已加入可直接使用的 Supabase 数据库与登录适配层。未配置或未登录 Supabase 时，页面明确回退到本地模拟数据；登录后则读取和写入当前公司的 Supabase 数据。

## 运行

```bash
python3 -m http.server 4173
```

打开 `http://localhost:4173/`，或直接打开 `index.html`。

## 连接 Supabase

1. 在 Supabase 建立项目。
2. 在 SQL Editor 运行 `supabase/migrations/20260917_000001_flowtrace_initial_schema.sql`，或在已连接的 Supabase CLI 项目执行 `supabase db push`。
3. 在 Authentication 建立邮箱用户；也可以在本系统的「设置与接入 → 平台接入」创建账户。若项目要求邮箱确认，需先完成验证邮件。
4. 在系统中填写 Project URL 与浏览器安全的 publishable key（旧项目可使用 anon key），然后登录。
5. 首次登录选择「建立公司空间」。系统会创建老板权限和第一版业务规则，之后便会从 Supabase 读取客户、广告、订单和回传记录。

浏览器会拒绝 `service_role` 和 `sb_secret_*`。WhatsApp、Meta、AI 及 Supabase 服务端密钥只能放在 Edge Function Secrets、Vault 或其他服务端 Secret Manager。

浏览器数据适配层位于 `supabase-client.js`，详细 API 与字段映射见 `supabase/BROWSER_CLIENT.md`。通常直接在设置页面配置即可；若要使用被 Git 忽略的 `supabase-config.local.js`，请按该文档说明在适配层之前加载。

## 演示范围

- 30 位模拟客户、3 个广告及来源未知样例。
- 客户详情：来源、点击识别码、来源历史、聊天、AI 建议、订单和回传状态。
- AI 分类只做辅助；信息不足时显示「待了解」，人工修改会写入跟进记录。
- 成交需人工录入订单编号、金额、币种、成交标准和时间；同一客户或订单号重复提交会被拦截。
- 取消/退款订单不会计入有效成交金额，也不会触发 Purchase 回传。
- Meta 页面只展示模拟的成功、待发送、失败和重试状态，并明确「未发送 Meta」。
- 支持客户、订单、回传记录 CSV 导出，导出不含密钥。

## 可替换模块

`adapters.js` 定义了 WhatsApp、AI、外部订单和 Meta 四个独立边界。`supabase-client.js` 负责 Supabase Auth 与 CRM 数据。正式上线时应在服务端替换外部平台适配器，并保留幂等键、Webhook 去重、客户匹配、错误记录和重试队列。

## Supabase 数据库

初始 Supabase 迁移位于 `supabase/migrations/20260917_000001_flowtrace_initial_schema.sql`。它包含多组织 RLS、客户/聊天/来源历史、AI 审核记录、订单、Meta 队列与重试记录，以及防重复约束。运行方法和服务端接入边界见 `supabase/README.md`；该迁移不包含任何真实平台密钥，也不会自行发送 WhatsApp 或 Meta 事件。

目前已真实接通的代码范围：Supabase 配置、邮箱注册/登录、公司初始化、数据读取、客户质量与销售阶段写入、备注、业务规则版本、订单 RPC 和 Meta 事件状态读取。由于仓库没有用户的 Supabase Project URL 或 publishable key，迁移尚未在真实云项目执行。

仍为模拟或未接通：WhatsApp Webhook、AI API 调用、Meta CAPI 外发和真实失败重试工作队列。Supabase 中的演示公司会在数据库层把 Meta 事件标记为 `suppressed`，不会外发。

## 正式接入前清单

1. WhatsApp Business：Business 资产、号码、Webhook 验证、消息权限、重复消息处理。
2. Meta Business Messaging / Conversions API：以最新官方文档核对支持的事件、必填字段、权限、Business Manager/数据集或像素归属及访问令牌；不要把内部广告来源或 `fb.*` 值直接当作 Meta 的点击识别字段。
3. AI 服务：服务端密钥、数据处理授权、脱敏策略、超时和失败回退。
4. 订单系统：成交标准（订金/全款）、币种、退款/取消状态、订单幂等键。
5. 安全：密钥只放服务端 secret manager，不进入页面、导出或日志；上线前补充登录、角色权限、审计日志和备份。

## 验收建议

- 看板筛选 7 天、广告、负责人后，指标和广告明细同步变化。
- 来源未知客户保持「未知」，不自动归入广告。
- 待了解客户不会因为 AI 高意向建议自动成交。
- 修改质量/阶段后查看详情底部跟进记录。
- 对无订单客户记录一次成交，再重复操作，确认出现防重复提示。
- 在 Meta 回传页重试失败事件，确认只更新模拟状态并仍显示未发送真实 Meta。
