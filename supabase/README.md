# FlowTrace Supabase Setup

`migrations/20260917_000001_flowtrace_initial_schema.sql` is the production-oriented database foundation for this CRM. It creates tables, database constraints, RLS policies, audit triggers, and three safe client RPCs. It does not connect to WhatsApp, Meta, or an AI provider by itself.

## Apply the schema

For a Supabase CLI project:

```bash
supabase db push
```

For a new hosted project, open **SQL Editor**, paste the migration, and run it once. Do not run it against a project that already has tables with the same names without first reviewing the migration plan.

## First organization

After a user has signed in through Supabase Auth, call the RPC from an authenticated client or SQL session that has an authenticated JWT context:

```sql
select public.create_organization('My Kitchen Business', 'MYR');
```

This creates the organization, makes the current user its `owner`, and creates version 1 of the business rules with `deposit_paid` as the conversion standard.

The CRM settings page performs this same operation through `FlowTraceSupabase.createOrganization(...)`. After applying the migration, open **设置与接入 → 平台接入**, enter the Project URL and publishable/anon key, sign in, and use **建立公司空间**. Do not place a `service_role` or secret key in the browser.

## Browser integration

The browser adapter is implemented in `../supabase-client.js`. It supports Supabase Auth, organization context, RLS-backed reads, customer quality and stage updates, notes, business rule versions, and the idempotent order RPC. See `BROWSER_CLIENT.md` for its API and UI data mapping.

The browser never writes Meta delivery attempts or WhatsApp messages directly. Those remain server-side responsibilities for Edge Functions or another trusted worker.

## Included safeguards

- Every business row has an `organization_id`; RLS separates owners and sales staff.
- WhatsApp delivery IDs and external message IDs have unique constraints, so webhook retries cannot create duplicate messages.
- Contacts are normalized and unique within an organization to prevent duplicate customers from the same WhatsApp number.
- Attribution is browser-read-only and written by the trusted Webhook/service role. A first-touch record cannot be overwritten by CRM users, while later ad clicks become history. Unknown sources require `ad_id`, `ctwa_clid`, and internal click ID to stay `NULL`.
- Orders use `numeric`, a unique per-organization order number, and a database trigger to calculate conversion eligibility from the active business rule.
- `record_order_and_enqueue_purchase(...)` is strictly idempotent: the same order number and payload return the original record, while conflicting details are rejected. It creates no more than one `Purchase` event per order. A demo organization suppresses outbound Meta delivery at the database layer.
- Cancelling or refunding an eligible order cancels any unsent Meta event. Successfully delivered events remain immutable and require a separate, documented production reconciliation process.
- Meta receipt state, CRM source tracking, and Meta attribution/optimization are separate records and must be reported separately.
- AI analysis is append-only and advisory. It cannot update customer quality, create an order, send a WhatsApp message, or send a Meta event on its own.

## Server-side work still required

Implement these as Supabase Edge Functions or another server-side service using the service role only on the server:

1. WhatsApp webhook verification, signature validation, delivery-ID idempotency, contact matching, and message ingestion.
2. AI analysis with a fixed output schema; treat chats as untrusted analysis material, not executable instructions.
3. Order-system synchronization and `record_order_and_enqueue_purchase(...)` calls.
4. A Meta queue worker that sends only production, eligible `Purchase` records, writes attempts, and reuses the existing event ID on retry.

Keep WhatsApp, Meta, and AI credentials in Supabase Edge Function Secrets or Vault. Never put them in SQL rows, `safe_config`, frontend code, CSV exports, or logs.
