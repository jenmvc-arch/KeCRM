/*
 * Optional browser configuration example.
 *
 * Copy this file to `supabase-config.local.js` for local use, or configure the
 * same values from the settings UI with FlowTraceSupabase.saveLocalConfig().
 * The local file is ignored by Git.
 *
 * Use the Project URL and browser-safe publishable key from Supabase. A legacy
 * anon JWT is also supported. Never put sb_secret_*, service_role, Meta tokens,
 * WhatsApp tokens, AI keys, or other server secrets in this file.
 */
window.FLOWTRACE_SUPABASE_CONFIG = {
  url: 'https://YOUR_PROJECT_REF.supabase.co',
  publishableKey: 'sb_publishable_REPLACE_ME',
  // Optional. Leave blank to use the first active organization membership.
  organizationId: ''
};
