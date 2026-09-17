# 浏览器端 Supabase 适配层

`supabase-client.js` 为现有静态 CRM 提供独立的 Supabase 数据层。它不包含项目凭证，也不会使用 `service_role`。页面仅应使用 Supabase Project URL 与浏览器安全的 publishable key；旧项目也可使用 legacy anon JWT。

## 加载与配置

在 `app.js` 前加载适配层：

```html
<script src="supabase-client.js"></script>
<script src="app.js"></script>
```

配置优先顺序为：`configure()` 的运行时配置、`window.FLOWTRACE_SUPABASE_CONFIG`、浏览器 `localStorage`。不必引用本地配置文件，设置页面可以直接保存：

```js
FlowTraceSupabase.saveLocalConfig({
  url: 'https://PROJECT_REF.supabase.co',
  publishableKey: 'sb_publishable_...',
  organizationId: '' // 可选；留空会选第一个有效团队
});
```

也可复制 `supabase-config.example.js` 为 `supabase-config.local.js` 并在适配层前加载。该本地文件已被 `.gitignore` 忽略。

适配层会拒绝 `sb_secret_*`、JWT role 为 `service_role` 的密钥，以及无法识别为 publishable/anon 的密钥。Meta、WhatsApp、AI 与 Supabase `service_role` 密钥必须留在服务端 Secrets 中。

## API

所有异步方法均返回 `{ ok, status, data }`，失败时返回 `{ ok: false, status, error: { code, message } }`。未配置和未登录分别返回 `unconfigured`、`unauthenticated`，方便页面继续使用演示数据并说明回退原因。

- `configure(config)`：只设置本次页面运行期间的配置。
- `saveLocalConfig(config)` / `clearLocalConfig()`：保存或清除浏览器本地配置。
- `getStatus()` / `init()`：检查配置、加载 supabase-js 并读取当前 session。
- `getSession()` / `signInWithPassword(email, password)` / `signUpWithPassword(email, password)` / `signOut()`：邮箱注册、登录和退出。若项目启用了邮箱确认，注册后需先完成邮件验证。
- `onAuthStateChange(callback)`：监听 session 变化，返回取消监听函数。
- `loadCurrentContext()`：读取用户、profile、当前 organization 和 membership。
- `createOrganization({ name, defaultCurrency })`：调用 `create_organization` RPC 完成首次团队建立。
- `saveBusinessRules(input)`：调用 `save_business_rule_version` RPC 保存新规则版本。
- `loadWorkspaceData()`：读取并映射 CRM 工作区数据。
- `updateCustomerQuality(customerId, quality)`：支持中文值或数据库枚举。
- `updateSalesStage(customerId, stage)`：支持中文值或数据库枚举。
- `addCustomerNote(customerId, body)`：新增跟进备注。
- `recordOrderAndEnqueuePurchase(input)`：调用幂等 RPC 记录订单，并由数据库判断是否生成 Purchase 队列事件。

`loadWorkspaceData().data` 的主要结构为：

```js
{
  context: { user, profile, organization, membership },
  mode,
  isDemo,
  ads,
  customers,
  callbacks,
  orders,
  rules,
  activeRule,
  members,
  integrations,
  raw
}
```

`ads` 会额外包含一个仅供显示的 `{ id: 'unknown', virtual: true }` 项目；数据库不会建立假的“未知广告”。无花费记录时 `spend` 为 `null`，供界面显示“未接入”。

`customers` 已映射为当前页面常用字段：`id/name/phone/owner/quality/stage/adId/need/budget/region/purchase/first/last/amount/order/currency/orderTime/refund/canceled/orderStandard/audit/clickId/sourceHistory/messages/notes`。`sourceHistory` 为兼容现有页面的来源名称列表，只有发生多次来源记录时才有值；完整结构保存在 `attributionHistory`。对象还保留 `qualityCode`、`stageCode`、`orders`、`conversionEligible`、`aiAnalyses` 与 `raw`。

`callbacks` 是 Meta 事件的页面别名；`deliveryStatus` 保留数据库原始状态。`status: success` 只表示 Meta 接收成功，不表示广告已归因，也不表示账户已启用成交优化。演示组织事件会标记 `simulated: true`，数据库会把外发状态强制设为 `suppressed`。

## 写入示例

```js
await FlowTraceSupabase.updateCustomerQuality(customerId, '合格');
await FlowTraceSupabase.updateSalesStage(customerId, '已报价');
await FlowTraceSupabase.addCustomerNote(customerId, '已电话确认量房时间');

await FlowTraceSupabase.recordOrderAndEnqueuePurchase({
  customerId,
  orderNumber: 'ORDER-1001',
  amount: 12800,
  currency: 'MYR',
  paymentStatus: 'deposit_paid',
  qualifyingPaymentAt: new Date().toISOString(),
  note: '销售人工确认已收到订金'
});
```

订单 RPC 对同一组织的订单编号做严格幂等处理：完全相同的重复请求返回原订单，不重复写审计或 Purchase；相同订单编号但内容不同会返回冲突。未付款、高意向、取消或退款订单不会成为有效成交回传。
