/*
 * FlowTrace browser-side Supabase adapter.
 *
 * This file intentionally contains no project credentials. Configure it at
 * runtime with FlowTraceSupabase.configure(), window.FLOWTRACE_SUPABASE_CONFIG,
 * or the localStorage helper below. Only a publishable key (or legacy anon
 * key) belongs in a browser. Never use service_role or sb_secret_* here.
 */
(function attachFlowTraceSupabase(global) {
  'use strict';

  const STORAGE_KEY = 'flowtrace.supabase.config';
  const DEFAULT_SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

  const QUALITY_TO_DB = Object.freeze({
    '待了解': 'unknown',
    '合格': 'qualified',
    '不合格': 'disqualified',
    unknown: 'unknown',
    qualified: 'qualified',
    disqualified: 'disqualified'
  });
  const QUALITY_TO_UI = Object.freeze({
    unknown: '待了解',
    qualified: '合格',
    disqualified: '不合格'
  });
  const STAGE_TO_DB = Object.freeze({
    '新咨询': 'new',
    '已确认需求': 'needs_confirmed',
    '已报价': 'quoted',
    '已预约': 'booked',
    '已成交': 'won',
    '未成交': 'lost',
    new: 'new',
    needs_confirmed: 'needs_confirmed',
    quoted: 'quoted',
    booked: 'booked',
    won: 'won',
    lost: 'lost'
  });
  const STAGE_TO_UI = Object.freeze({
    new: '新咨询',
    needs_confirmed: '已确认需求',
    quoted: '已报价',
    booked: '已预约',
    won: '已成交',
    lost: '未成交'
  });
  const META_STATUS_TO_UI = Object.freeze({
    queued: 'pending',
    processing: 'pending',
    succeeded: 'success',
    failed: 'failed',
    blocked: 'failed',
    suppressed: 'pending',
    cancelled: 'failed'
  });
  const PAYMENT_STATUS_TO_UI = Object.freeze({
    unpaid: '未付款',
    deposit_paid: '已付订金',
    paid_in_full: '已付全款',
    cancelled: '已取消',
    refunded: '已退款'
  });

  let runtimeConfig = null;
  let client = null;
  let activeConfig = null;
  let sdkPromise = null;
  let contextCache = null;

  class FlowTraceSupabaseError extends Error {
    constructor(code, message, cause) {
      super(message);
      this.name = 'FlowTraceSupabaseError';
      this.code = code;
      if (cause) this.cause = cause;
    }
  }

  function ok(data, status) {
    return { ok: true, status: status || 'ready', data };
  }

  function fail(status, code, message, cause) {
    return {
      ok: false,
      status,
      error: { code, message, cause: cause ? String(cause.message || cause) : undefined }
    };
  }

  function asError(error, fallbackCode) {
    if (error instanceof FlowTraceSupabaseError) return error;
    return new FlowTraceSupabaseError(
      error?.code || fallbackCode || 'supabase_error',
      error?.message || 'Supabase request failed.',
      error
    );
  }

  function errorResult(error, fallbackCode) {
    const normalized = asError(error, fallbackCode);
    const status = normalized.code === 'not_configured'
      ? 'unconfigured'
      : normalized.code === 'not_authenticated'
        ? 'unauthenticated'
        : 'error';
    return fail(status, normalized.code, normalized.message, normalized.cause);
  }

  function readLocalConfig() {
    try {
      const raw = global.localStorage?.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function normalizeConfig(input) {
    const source = input && typeof input === 'object' ? input : {};
    return {
      url: String(source.url || source.supabaseUrl || '').trim().replace(/\/$/, ''),
      publishableKey: String(
        source.publishableKey || source.anonKey || source.supabaseKey || ''
      ).trim(),
      organizationId: String(source.organizationId || '').trim() || null,
      sdkUrl: String(source.sdkUrl || DEFAULT_SDK_URL).trim()
    };
  }

  function resolveConfig() {
    return normalizeConfig(
      runtimeConfig || global.FLOWTRACE_SUPABASE_CONFIG || readLocalConfig() || {}
    );
  }

  function decodeJwtPayload(token) {
    if (!token || token.split('.').length !== 3) return null;
    try {
      const segment = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = segment.padEnd(Math.ceil(segment.length / 4) * 4, '=');
      return JSON.parse(global.atob(padded));
    } catch (error) {
      return null;
    }
  }

  function validateConfig(config) {
    if (!config.url || !config.publishableKey) {
      throw new FlowTraceSupabaseError(
        'not_configured',
        'Supabase is not configured. Provide the Project URL and publishable (or legacy anon) key.'
      );
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(config.url);
    } catch (error) {
      throw new FlowTraceSupabaseError('invalid_url', 'The Supabase Project URL is invalid.', error);
    }
    if (parsedUrl.protocol !== 'https:' && parsedUrl.hostname !== 'localhost' && parsedUrl.hostname !== '127.0.0.1') {
      throw new FlowTraceSupabaseError('invalid_url', 'Use an HTTPS Supabase Project URL.');
    }

    const key = config.publishableKey;
    const jwt = decodeJwtPayload(key);
    const jwtRole = String(jwt?.role || '').toLowerCase();
    if (/^sb_secret_/i.test(key) || jwtRole === 'service_role' || /service[_-]?role/i.test(key)) {
      throw new FlowTraceSupabaseError(
        'unsafe_key',
        'A server secret/service_role key cannot be used in the browser. Use a publishable key or legacy anon key.'
      );
    }
    if (!/^sb_publishable_/i.test(key) && jwtRole !== 'anon') {
      throw new FlowTraceSupabaseError(
        'invalid_publishable_key',
        'The browser adapter only accepts a Supabase publishable key or legacy anon JWT.'
      );
    }
    return config;
  }

  async function loadSdk(config) {
    if (global.supabase?.createClient) return global.supabase;
    if (!sdkPromise) {
      sdkPromise = import(config.sdkUrl || DEFAULT_SDK_URL).catch(error => {
        sdkPromise = null;
        throw new FlowTraceSupabaseError(
          'sdk_load_failed',
          'Could not load supabase-js. Check the internet connection or include the SDK before this adapter.',
          error
        );
      });
    }
    return sdkPromise;
  }

  async function getClient() {
    const config = validateConfig(resolveConfig());
    if (client && activeConfig?.url === config.url && activeConfig?.publishableKey === config.publishableKey) {
      return client;
    }
    const sdk = await loadSdk(config);
    client = sdk.createClient(config.url, config.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'flowtrace.auth'
      }
    });
    activeConfig = config;
    contextCache = null;
    return client;
  }

  async function requireSession() {
    const supabase = await getClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!data.session) {
      throw new FlowTraceSupabaseError('not_authenticated', 'Please sign in to Supabase first.');
    }
    return { supabase, session: data.session };
  }

  function mapQuality(value) {
    return QUALITY_TO_UI[value] || '待了解';
  }

  function mapStage(value) {
    return STAGE_TO_UI[value] || '新咨询';
  }

  function mapMember(row, profilesById) {
    const profile = profilesById.get(row.user_id) || {};
    return {
      id: row.id,
      organizationId: row.organization_id,
      userId: row.user_id,
      role: row.role,
      isActive: row.is_active,
      name: profile.display_name || profile.email || '未命名成员',
      email: profile.email || null,
      profile
    };
  }

  function formatBudget(row) {
    if (row.budget_min == null && row.budget_max == null) return 'Not provided';
    const currency = row.budget_currency || 'MYR';
    const format = value => Number(value).toLocaleString('en-MY', { maximumFractionDigits: 2 });
    if (row.budget_min != null && row.budget_max != null) {
      return `${currency} ${format(row.budget_min)}–${format(row.budget_max)}`;
    }
    if (row.budget_min != null) return `${currency} ${format(row.budget_min)}+`;
    return `Up to ${currency} ${format(row.budget_max)}`;
  }

  function firstPrimaryContact(contacts, customerId) {
    const list = contacts.filter(contact => contact.customer_id === customerId);
    return list.find(contact => contact.channel === 'whatsapp' && contact.is_primary)
      || list.find(contact => contact.channel === 'whatsapp')
      || list.find(contact => contact.is_primary)
      || list[0]
      || null;
  }

  function mapAttribution(row, adsById) {
    if (!row) return null;
    const ad = row.ad_id ? adsById.get(row.ad_id) : null;
    return {
      id: row.id,
      customerId: row.customer_id,
      status: row.attribution_status,
      adId: row.ad_id,
      adName: ad?.name || '未知',
      clickId: row.ctwa_clid || row.internal_click_id || null,
      capturedAt: row.captured_at,
      isFirstTouch: row.is_first_touch,
      raw: row
    };
  }

  function mapOrder(row) {
    return {
      id: row.id,
      organizationId: row.organization_id,
      customerId: row.customer_id,
      orderNumber: row.order_number,
      amount: Number(row.amount),
      currency: row.currency,
      paymentStatus: row.payment_status,
      qualifyingPaymentAt: row.qualifying_payment_at,
      conversionEligible: row.conversion_eligible,
      conversionEligibleAt: row.conversion_eligible_at,
      cancelledAt: row.cancelled_at,
      refundedAt: row.refunded_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      raw: row
    };
  }

  function mapMetaEvent(row, ordersById, customersById) {
    const order = ordersById.get(row.order_id);
    const customer = customersById.get(row.customer_id);
    const displayTime = row.sent_at || row.last_attempt_at || row.next_retry_at || row.created_at;
    const note = row.blocked_reason
      || (row.delivery_status === 'succeeded'
        ? 'Meta 已接收事件；这不代表已完成广告归因或启用成交优化。'
        : row.delivery_status === 'suppressed'
          ? '演示组织已阻止外发，事件没有发送到 Meta。'
          : '等待服务端处理。');
    return {
      id: row.id,
      orderId: row.order_id,
      order: order?.orderNumber || null,
      customerId: row.customer_id,
      customer: customer?.name || null,
      event: row.event_name,
      eventId: row.event_id,
      amount: order ? `${order.currency} ${Number(order.amount).toLocaleString('en-MY')}` : null,
      status: META_STATUS_TO_UI[row.delivery_status] || 'pending',
      time: displayTime,
      note,
      deliveryStatus: row.delivery_status,
      blockedReason: row.blocked_reason,
      attemptCount: row.attempt_count,
      nextRetryAt: row.next_retry_at,
      lastAttemptAt: row.last_attempt_at,
      sentAt: row.sent_at,
      metaEventReference: row.meta_event_reference,
      simulated: row.delivery_status === 'suppressed',
      raw: row
    };
  }

  async function queryAll(supabase, table, columns, organizationId, options) {
    let query = supabase.from(table).select(columns || '*').eq('organization_id', organizationId);
    if (options?.order) query = query.order(options.order.column, { ascending: options.order.ascending });
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async function loadCurrentContextInternal(force) {
    if (contextCache && !force) return contextCache;
    const { supabase, session } = await requireSession();
    const configuredOrganizationId = resolveConfig().organizationId;
    const { data: memberships, error: membershipError } = await supabase
      .from('organization_members')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .order('joined_at', { ascending: true });
    if (membershipError) throw membershipError;

    const membership = configuredOrganizationId
      ? (memberships || []).find(item => item.organization_id === configuredOrganizationId)
      : (memberships || [])[0];
    if (!membership) {
      const code = configuredOrganizationId ? 'organization_access_denied' : 'no_organization';
      const message = configuredOrganizationId
        ? 'The signed-in user is not an active member of the configured organization.'
        : 'The signed-in user does not belong to an organization yet.';
      throw new FlowTraceSupabaseError(code, message);
    }

    const [{ data: organization, error: organizationError }, { data: profile, error: profileError }] = await Promise.all([
      supabase.from('organizations').select('*').eq('id', membership.organization_id).single(),
      supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
    ]);
    if (organizationError) throw organizationError;
    if (profileError) throw profileError;

    contextCache = {
      session,
      user: session.user,
      profile: profile || null,
      organization,
      membership
    };
    return contextCache;
  }

  async function init() {
    try {
      const supabase = await getClient();
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return ok({ configured: true, client: supabase, session: data.session || null }, data.session ? 'authenticated' : 'unauthenticated');
    } catch (error) {
      return errorResult(error, 'initialization_failed');
    }
  }

  function configure(config) {
    try {
      const normalized = validateConfig(normalizeConfig(config));
      runtimeConfig = normalized;
      client = null;
      activeConfig = null;
      contextCache = null;
      return ok({ configured: true, organizationId: normalized.organizationId }, 'configured');
    } catch (error) {
      return errorResult(error, 'invalid_configuration');
    }
  }

  function saveLocalConfig(config) {
    const result = configure(config);
    if (!result.ok) return result;
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(runtimeConfig));
      return ok({ configured: true, organizationId: runtimeConfig.organizationId }, 'configured');
    } catch (error) {
      return fail('error', 'storage_unavailable', 'Could not save the Supabase browser configuration.', error);
    }
  }

  function clearLocalConfig() {
    try {
      global.localStorage?.removeItem(STORAGE_KEY);
    } catch (error) {
      // Clearing the in-memory state still gives the caller a safe result.
    }
    runtimeConfig = null;
    client = null;
    activeConfig = null;
    contextCache = null;
    return ok({ configured: false }, 'unconfigured');
  }

  function getStatus() {
    try {
      const config = validateConfig(resolveConfig());
      return ok({
        configured: true,
        initialized: Boolean(client),
        projectUrl: config.url,
        organizationId: config.organizationId,
        keyType: config.publishableKey.startsWith('sb_publishable_') ? 'publishable' : 'legacy-anon'
      }, client ? 'ready' : 'configured');
    } catch (error) {
      return errorResult(error, 'invalid_configuration');
    }
  }

  async function getSession() {
    try {
      const supabase = await getClient();
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return ok(data.session || null, data.session ? 'authenticated' : 'unauthenticated');
    } catch (error) {
      return errorResult(error, 'session_failed');
    }
  }

  async function signInWithPassword(email, password) {
    try {
      if (!String(email || '').trim() || !String(password || '')) {
        throw new FlowTraceSupabaseError('missing_credentials', 'Email and password are required.');
      }
      const supabase = await getClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: String(email).trim(),
        password: String(password)
      });
      if (error) throw error;
      contextCache = null;
      return ok(data, 'authenticated');
    } catch (error) {
      return errorResult(error, 'sign_in_failed');
    }
  }

  async function signUpWithPassword(email, password) {
    try {
      if (!String(email || '').trim() || !String(password || '')) {
        throw new FlowTraceSupabaseError('missing_credentials', 'Email and password are required.');
      }
      const supabase = await getClient();
      const { data, error } = await supabase.auth.signUp({
        email: String(email).trim(),
        password: String(password)
      });
      if (error) throw error;
      contextCache = null;
      return ok(data, data.session ? 'authenticated' : 'confirmation_required');
    } catch (error) {
      return errorResult(error, 'sign_up_failed');
    }
  }

  async function signOut() {
    try {
      const supabase = await getClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      contextCache = null;
      return ok(null, 'unauthenticated');
    } catch (error) {
      return errorResult(error, 'sign_out_failed');
    }
  }

  function onAuthStateChange(callback) {
    let subscription = null;
    let disposed = false;
    getClient().then(supabase => {
      if (disposed) return;
      const result = supabase.auth.onAuthStateChange((event, session) => {
        contextCache = null;
        if (typeof callback === 'function') callback(event, session);
      });
      subscription = result.data.subscription;
    }).catch(error => {
      if (typeof callback === 'function') callback('ERROR', null, asError(error));
    });
    return () => {
      disposed = true;
      subscription?.unsubscribe();
    };
  }

  async function loadCurrentContext(options) {
    try {
      return ok(await loadCurrentContextInternal(Boolean(options?.force)));
    } catch (error) {
      return errorResult(error, 'context_load_failed');
    }
  }

  async function createOrganization(input) {
    try {
      const { supabase } = await requireSession();
      const name = String(input?.name || '').trim();
      const currency = String(input?.defaultCurrency || 'MYR').trim().toUpperCase();
      if (!name) throw new FlowTraceSupabaseError('organization_name_required', 'Organization name is required.');
      const { data, error } = await supabase.rpc('create_organization', {
        p_name: name,
        p_default_currency: currency
      });
      if (error) throw error;
      contextCache = null;
      if (input?.select !== false) {
        runtimeConfig = { ...resolveConfig(), organizationId: data };
      }
      return ok({ organizationId: data }, 'created');
    } catch (error) {
      return errorResult(error, 'organization_create_failed');
    }
  }

  async function saveBusinessRules(input) {
    try {
      const context = await loadCurrentContextInternal();
      const { supabase } = await requireSession();
      const organizationId = input?.organizationId || context.organization.id;
      const serviceAreas = Array.isArray(input?.serviceAreas)
        ? input.serviceAreas.map(value => String(value).trim()).filter(Boolean)
        : String(input?.serviceAreas || '').split(',').map(value => value.trim()).filter(Boolean);
      const minBudget = input?.minBudget === '' || input?.minBudget == null ? null : Number(input.minBudget);
      if (minBudget != null && (!Number.isFinite(minBudget) || minBudget < 0)) {
        throw new FlowTraceSupabaseError('invalid_min_budget', 'Minimum budget must be zero or a positive number.');
      }
      const standard = input?.conversionStandard || 'deposit_paid';
      if (!['deposit_paid', 'paid_in_full'].includes(standard)) {
        throw new FlowTraceSupabaseError('invalid_conversion_standard', 'Unsupported conversion standard.');
      }
      const { data, error } = await supabase.rpc('save_business_rule_version', {
        p_organization_id: organizationId,
        p_product_service: String(input?.productService || ''),
        p_service_areas: serviceAreas,
        p_min_budget: minBudget,
        p_currency: String(input?.currency || context.organization.default_currency || 'MYR').toUpperCase(),
        p_qualification_criteria: String(input?.qualificationCriteria || ''),
        p_conversion_standard: standard
      });
      if (error) throw error;
      return ok({ ruleId: data }, 'saved');
    } catch (error) {
      return errorResult(error, 'business_rules_save_failed');
    }
  }

  async function loadWorkspaceData(options) {
    try {
      const context = await loadCurrentContextInternal(Boolean(options?.force));
      const { supabase } = await requireSession();
      const organizationId = options?.organizationId || context.organization.id;

      const [
        membersRaw, rules, integrations, adsRaw, spendRows, customersRaw,
        contacts, attributionsRaw, messagesRaw, notesRaw, activitiesRaw,
        analysesRaw, ordersRaw, metaEventsRaw
      ] = await Promise.all([
        queryAll(supabase, 'organization_members', '*', organizationId, { order: { column: 'joined_at', ascending: true } }),
        queryAll(supabase, 'business_rule_versions', '*', organizationId, { order: { column: 'version', ascending: false } }),
        queryAll(supabase, 'integration_connections', '*', organizationId, { order: { column: 'created_at', ascending: true } }),
        queryAll(supabase, 'ads', '*', organizationId, { order: { column: 'created_at', ascending: true } }),
        queryAll(supabase, 'ad_spend_daily', '*', organizationId, { order: { column: 'metric_date', ascending: true } }),
        queryAll(supabase, 'customers', '*', organizationId, { order: { column: 'last_interaction_at', ascending: false } }),
        queryAll(supabase, 'customer_contacts', '*', organizationId, { order: { column: 'created_at', ascending: true } }),
        queryAll(supabase, 'customer_attribution_events', '*', organizationId, { order: { column: 'captured_at', ascending: true } }),
        queryAll(supabase, 'messages', '*', organizationId, { order: { column: 'sent_at', ascending: true } }),
        queryAll(supabase, 'customer_notes', '*', organizationId, { order: { column: 'created_at', ascending: false } }),
        queryAll(supabase, 'customer_activities', '*', organizationId, { order: { column: 'created_at', ascending: false } }),
        queryAll(supabase, 'ai_analyses', '*', organizationId, { order: { column: 'created_at', ascending: false } }),
        queryAll(supabase, 'orders', '*', organizationId, { order: { column: 'created_at', ascending: false } }),
        queryAll(supabase, 'meta_conversion_events', '*', organizationId, { order: { column: 'created_at', ascending: false } })
      ]);

      const userIds = [...new Set(membersRaw.map(member => member.user_id))];
      let profiles = [];
      if (userIds.length) {
        const { data, error } = await supabase.from('profiles').select('*').in('id', userIds);
        if (error) throw error;
        profiles = data || [];
      }
      const profilesById = new Map(profiles.map(profile => [profile.id, profile]));
      const members = membersRaw.map(member => mapMember(member, profilesById));
      const membersById = new Map(members.map(member => [member.id, member]));

      const adsById = new Map();
      const ads = adsRaw.map((row, index) => {
        const spendForAd = spendRows.filter(item => item.ad_id === row.id);
        const hasSpendData = spendForAd.length > 0;
        const ad = {
          id: row.id,
          organizationId: row.organization_id,
          name: row.name,
          campaignName: row.campaign_name,
          adsetName: row.adset_name,
          externalAdId: row.external_ad_id,
          platform: row.platform,
          isActive: row.is_active,
          color: ['teal', 'amber', 'blue'][index % 3],
          spend: hasSpendData ? spendForAd.reduce((sum, item) => sum + Number(item.spend), 0) : null,
          spendCurrency: spendForAd[0]?.currency || context.organization.default_currency,
          hasSpendData,
          raw: row
        };
        adsById.set(row.id, ad);
        return ad;
      });

      const attributionsByCustomer = new Map();
      for (const attribution of attributionsRaw) {
        const list = attributionsByCustomer.get(attribution.customer_id) || [];
        list.push(attribution);
        attributionsByCustomer.set(attribution.customer_id, list);
      }
      const orders = ordersRaw.map(mapOrder);
      const ordersByCustomer = new Map();
      for (const order of orders) {
        const list = ordersByCustomer.get(order.customerId) || [];
        list.push(order);
        ordersByCustomer.set(order.customerId, list);
      }

      const customers = customersRaw.map(row => {
        const member = membersById.get(row.owner_membership_id);
        const customerAttributions = attributionsByCustomer.get(row.id) || [];
        const firstTouchRaw = customerAttributions.find(item => item.is_first_touch) || null;
        const firstTouch = mapAttribution(firstTouchRaw, adsById);
        const attributionHistory = customerAttributions.map(item => mapAttribution(item, adsById));
        const repeatedSourceNames = attributionHistory.length > 1
          ? [...attributionHistory].reverse().map(item => item.adName)
          : null;
        const customerOrders = ordersByCustomer.get(row.id) || [];
        const primaryOrder = customerOrders[0] || null;
        const contact = firstPrimaryContact(contacts, row.id);
        const customerMessages = messagesRaw.filter(item => item.customer_id === row.id);
        const customerNotes = notesRaw.filter(item => item.customer_id === row.id);
        const customerActivities = activitiesRaw.filter(item => item.customer_id === row.id);
        const customerAnalyses = analysesRaw.filter(item => item.customer_id === row.id);
        return {
          id: row.id,
          organizationId: row.organization_id,
          name: row.display_name || contact?.display_value || contact?.address_normalized || '未命名客户',
          phone: contact?.display_value || contact?.address_normalized || '',
          owner: member?.name || '未分配',
          ownerMembershipId: row.owner_membership_id,
          quality: mapQuality(row.quality),
          qualityCode: row.quality,
          stage: mapStage(row.sales_stage),
          stageCode: row.sales_stage,
          adId: firstTouch?.adId || 'unknown',
          adName: firstTouch?.adName || '未知',
          clickId: firstTouch?.clickId || null,
          sourceStatus: firstTouch?.status || 'unknown',
          // Keep the simple name list compatible with the current demo UI.
          sourceHistory: repeatedSourceNames,
          attributionHistory,
          need: row.need_summary || 'Not provided',
          budget: formatBudget(row),
          budgetMin: row.budget_min == null ? null : Number(row.budget_min),
          budgetMax: row.budget_max == null ? null : Number(row.budget_max),
          budgetCurrency: row.budget_currency,
          region: row.region || 'Not provided',
          purchase: row.purchase_timeframe || 'Not provided',
          first: new Date(row.first_inquiry_at),
          last: new Date(row.last_interaction_at),
          order: primaryOrder?.orderNumber || null,
          amount: primaryOrder?.amount || 0,
          currency: primaryOrder?.currency || null,
          orderTime: primaryOrder?.qualifyingPaymentAt ? new Date(primaryOrder.qualifyingPaymentAt) : null,
          conversionEligible: Boolean(primaryOrder?.conversionEligible),
          refund: primaryOrder?.paymentStatus === 'refunded',
          canceled: primaryOrder?.paymentStatus === 'cancelled',
          orderStandard: primaryOrder ? PAYMENT_STATUS_TO_UI[primaryOrder.paymentStatus] || primaryOrder.paymentStatus : null,
          orders: customerOrders,
          messages: customerMessages,
          notes: customerNotes,
          audit: customerActivities.map(item => ({
            id: item.id,
            time: new Date(item.created_at),
            text: item.note || item.action,
            raw: item
          })),
          aiAnalyses: customerAnalyses,
          raw: row
        };
      });

      const customersById = new Map(customers.map(customer => [customer.id, customer]));
      const ordersById = new Map(orders.map(order => [order.id, order]));
      const metaEvents = metaEventsRaw.map(event => mapMetaEvent(event, ordersById, customersById));
      const unknownAd = {
        id: 'unknown',
        organizationId,
        name: '未知',
        campaignName: null,
        adsetName: null,
        externalAdId: null,
        platform: null,
        isActive: false,
        color: 'gray',
        spend: null,
        spendCurrency: context.organization.default_currency,
        hasSpendData: false,
        virtual: true,
        raw: null
      };
      ads.push(unknownAd);
      const leadCountByAd = new Map();
      for (const customer of customers) {
        const current = leadCountByAd.get(customer.adId) || { leads: 0, qualified: 0, won: 0, revenue: 0 };
        current.leads += 1;
        if (customer.qualityCode === 'qualified') current.qualified += 1;
        const validOrders = customer.orders.filter(order => order.conversionEligible && !order.cancelledAt && !order.refundedAt);
        if (validOrders.length) current.won += 1;
        current.revenue += validOrders.reduce((sum, order) => sum + order.amount, 0);
        leadCountByAd.set(customer.adId, current);
      }
      for (const ad of ads) {
        Object.assign(ad, leadCountByAd.get(ad.id) || { leads: 0, qualified: 0, won: 0, revenue: 0 });
        ad.sourceRate = ad.id === 'unknown' ? '—' : '100%';
      }

      return ok({
        mode: context.organization.operating_mode,
        isDemo: context.organization.operating_mode === 'demo',
        context: {
          user: context.user,
          profile: context.profile,
          organization: context.organization,
          membership: context.membership
        },
        organization: context.organization,
        membership: context.membership,
        profile: context.profile,
        rules,
        activeRule: rules.find(rule => rule.is_active) || null,
        members,
        integrations,
        ads,
        customers,
        orders,
        metaEvents,
        callbacks: metaEvents,
        raw: {
          spendRows,
          contacts,
          attributions: attributionsRaw,
          messages: messagesRaw,
          notes: notesRaw,
          activities: activitiesRaw,
          analyses: analysesRaw
        }
      });
    } catch (error) {
      return errorResult(error, 'workspace_load_failed');
    }
  }

  async function updateCustomer(customerId, patch) {
    const { supabase } = await requireSession();
    const { data, error } = await supabase
      .from('customers')
      .update(patch)
      .eq('id', customerId)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  async function updateCustomerQuality(customerId, quality) {
    try {
      const value = QUALITY_TO_DB[quality];
      if (!value) throw new FlowTraceSupabaseError('invalid_quality', 'Unsupported customer quality.');
      const data = await updateCustomer(customerId, { quality: value });
      return ok({ customer: data, quality: mapQuality(data.quality), qualityCode: data.quality }, 'saved');
    } catch (error) {
      return errorResult(error, 'quality_update_failed');
    }
  }

  async function updateSalesStage(customerId, stage) {
    try {
      const value = STAGE_TO_DB[stage];
      if (!value) throw new FlowTraceSupabaseError('invalid_sales_stage', 'Unsupported sales stage.');
      const data = await updateCustomer(customerId, { sales_stage: value });
      return ok({ customer: data, stage: mapStage(data.sales_stage), stageCode: data.sales_stage }, 'saved');
    } catch (error) {
      return errorResult(error, 'sales_stage_update_failed');
    }
  }

  async function addCustomerNote(customerId, body, organizationId) {
    try {
      const note = String(body || '').trim();
      if (!note) throw new FlowTraceSupabaseError('note_required', 'The note cannot be empty.');
      const context = await loadCurrentContextInternal();
      const { supabase, session } = await requireSession();
      const { data, error } = await supabase.from('customer_notes').insert({
        organization_id: organizationId || context.organization.id,
        customer_id: customerId,
        body: note,
        created_by: session.user.id
      }).select('*').single();
      if (error) throw error;
      return ok(data, 'created');
    } catch (error) {
      return errorResult(error, 'note_create_failed');
    }
  }

  async function recordOrderAndEnqueuePurchase(input) {
    try {
      const context = await loadCurrentContextInternal();
      const { supabase } = await requireSession();
      const amount = Number(input?.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new FlowTraceSupabaseError('invalid_order_amount', 'Order amount must be greater than zero.');
      }
      const paymentStatus = input?.paymentStatus || 'deposit_paid';
      if (!['unpaid', 'deposit_paid', 'paid_in_full', 'cancelled', 'refunded'].includes(paymentStatus)) {
        throw new FlowTraceSupabaseError('invalid_payment_status', 'Unsupported order payment status.');
      }
      const { data: orderId, error } = await supabase.rpc('record_order_and_enqueue_purchase', {
        p_organization_id: input?.organizationId || context.organization.id,
        p_customer_id: input?.customerId,
        p_order_number: String(input?.orderNumber || '').trim(),
        p_amount: amount,
        p_currency: String(input?.currency || context.organization.default_currency || 'MYR').toUpperCase(),
        p_payment_status: paymentStatus,
        p_qualifying_payment_at: input?.qualifyingPaymentAt || null,
        p_note: input?.note || null
      });
      if (error) throw error;

      const [{ data: order, error: orderError }, { data: metaEvent, error: eventError }] = await Promise.all([
        supabase.from('orders').select('*').eq('id', orderId).single(),
        supabase.from('meta_conversion_events').select('*').eq('order_id', orderId).maybeSingle()
      ]);
      if (orderError) throw orderError;
      if (eventError) throw eventError;
      return ok({ order: mapOrder(order), metaEvent: metaEvent || null }, 'saved');
    } catch (error) {
      return errorResult(error, 'order_record_failed');
    }
  }

  global.FlowTraceSupabase = Object.freeze({
    version: '1.0.0',
    storageKey: STORAGE_KEY,
    configure,
    saveLocalConfig,
    clearLocalConfig,
    getStatus,
    init,
    getSession,
    signInWithPassword,
    signUpWithPassword,
    signOut,
    onAuthStateChange,
    loadCurrentContext,
    createOrganization,
    saveBusinessRules,
    loadWorkspaceData,
    updateCustomerQuality,
    updateSalesStage,
    addCustomerNote,
    recordOrderAndEnqueuePurchase,
    maps: Object.freeze({
      qualityToDatabase: QUALITY_TO_DB,
      qualityToUi: QUALITY_TO_UI,
      stageToDatabase: STAGE_TO_DB,
      stageToUi: STAGE_TO_UI
    })
  });
})(window);
