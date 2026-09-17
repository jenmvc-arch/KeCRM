const QUALITY_LABELS = { unknown: '待了解', qualified: '合格', disqualified: '不合格' };
const QUALITY_VALUES = { '待了解': 'unknown', '合格': 'qualified', '不合格': 'disqualified' };
const STAGE_LABELS = { new: '新咨询', needs_confirmed: '已确认需求', quoted: '已报价', booked: '已预约', won: '已成交', lost: '未成交' };
const STAGE_VALUES = { '新咨询': 'new', '已确认需求': 'needs_confirmed', '已报价': 'quoted', '已预约': 'booked', '已成交': 'won', '未成交': 'lost' };
const stages = Object.values(STAGE_LABELS);
const UNKNOWN_AD = { id: 'unknown', name: 'Unknown Source', color: 'gray', spend: null, currency: 'MYR', sourceRate: '—' };

function createDemoData() {
  const demoAds = [
    { id: 'search', name: 'Malaysia Search Campaign', color: 'teal', spend: 12600, currency: 'MYR' },
    { id: 'retarget', name: 'September Retargeting', color: 'amber', spend: null, currency: 'MYR' },
    { id: 'video', name: 'Product Demo Video', color: 'blue', spend: 9800, currency: 'MYR' },
    UNKNOWN_AD
  ];
  const names = ['Daniel Tan','Nur Aisyah','Hannah Wong','Jason Lim','Siti Aminah','Marcus Ng','Wei Ming Tan','Sophie Zhang','Mohd Faiz','Aaron Lee','Priya Nair','Kevin Teoh','Alicia Tan','Ryan Goh','Farah Nadia','Ethan Lim','Emily Chua','Shawn Chen','Kumar Raj','Chloe Liu','Adam Lee','Rachel Chua','Hafiz Rahman','Justin Chow','Michelle Wong','Grace Leong','Daniel Goh','Olivia Ng','Nadia Lim','Vincent Koh'];
  const needs = ['Custom kitchen renovation','L-shaped kitchen remodel','Condo storage solution','Kitchen countertop replacement','Full kitchen cabinetry','Kitchen lighting and storage','Luxury villa kitchen design','Budget consultation'];
  const owners = ['Mr. Lin','Amy','Ben'];
  const qualities = ['合格','合格','待了解','合格','不合格','合格','待了解','合格','合格','不合格'];
  const adIds = ['search','search','retarget','search','unknown','retarget','video','search','retarget','unknown','search','retarget','video','search','search','retarget','search','unknown','retarget','search','search','retarget','retarget','video','search','retarget','search','retarget','unknown','search'];
  const amounts = [0,0,9600,15400,5200,7200,0,6400,8600,0,11200,0,0,0,0,14800,0,0,0,0,0,0,0,0,0,0,0,12600,0,0];
  const now = new Date(2026, 8, 17, 14, 20);
  const demoCustomers = names.map((name, index) => {
    const quality = qualities[index % qualities.length];
    const adId = adIds[index];
    const first = new Date(2026, 8, 17 - (index % 24), 9 + (index % 8), 12);
    const last = new Date(Math.min(first.getTime() + (index % 5) * 86400000 + 3600000, now.getTime()));
    const phone = index % 3 === 0 ? `+60 12-${String(483000 + index).slice(-6)}` : index % 3 === 1 ? `+60 16-${String(728100 + index).slice(-6)}` : `+65 9${String(145800 + index).slice(-5)}`;
    const amount = amounts[index];
    const stage = amount ? '已成交' : (index === 0 ? '已报价' : index === 1 ? '已确认需求' : index === 4 ? '未成交' : index === 6 ? '新咨询' : stages[index % stages.length]);
    const refund = index === 8;
    const canceled = index === 4;
    const order = amount ? `FT-${20260900 + index}` : null;
    const sourceName = adId === 'unknown' ? 'Unknown Source' : (demoAds.find(ad => ad.id === adId)?.name || 'Unknown Source');
    const budget = index % 4 === 0 ? 'RM 20,000–30,000' : index % 4 === 1 ? 'RM 10,000–15,000' : index % 4 === 2 ? 'Not provided' : 'RM 15,000+';
    const purchase = index % 4 === 2 ? 'Not provided' : index % 3 === 0 ? 'Within 1–3 months' : 'More than 3 months';
    const orderRecord = order ? {
      id: `order-${index}`,
      orderNumber: order,
      amount,
      currency: 'MYR',
      paymentStatus: refund ? 'refunded' : canceled ? 'cancelled' : index % 2 === 0 ? 'deposit_paid' : 'paid_in_full',
      conversionEligible: !refund && !canceled,
      qualifyingPaymentAt: last,
      createdAt: last
    } : null;
    return {
      id: `c${String(index + 1).padStart(2, '0')}`,
      name,
      phone,
      owner: owners[index % 3],
      quality,
      stage,
      adId,
      need: needs[index % needs.length],
      budget,
      region: index % 5 === 0 ? 'Singapore' : index % 5 === 1 ? 'Selangor' : 'Kuala Lumpur',
      purchase,
      first,
      last,
      amount,
      order,
      currency: order ? 'MYR' : null,
      orderTime: order ? last : null,
      refund,
      canceled,
      orderStandard: order ? (index % 2 === 0 ? '已付订金' : '已付全款') : null,
      orders: orderRecord ? [orderRecord] : [],
      audit: [{ time: first, text: `New enquiry received. Original source: “${sourceName}”` }],
      clickId: adId === 'unknown' ? null : `fb.1.${adId}.${String(160000 + index)}`,
      sourceHistory: adId === 'search' && index === 1 ? ['September Retargeting', 'Malaysia Search Campaign'] : [],
      messages: [
        { id: `m-${index}-1`, direction: 'inbound', body: `Hi, I’m interested in ${needs[index % needs.length]}. My budget is around ${budget}. How long would the project take?`, sentAt: first },
        { id: `m-${index}-2`, direction: 'outbound', body: 'Thanks. I’ll first confirm your floor plan and expected move-in date, then recommend the next step.', sentAt: last }
      ],
      aiAnalysis: {
        suggestedQuality: quality,
        priority: quality === '合格' ? '高' : '中',
        reasoning: quality === '合格' ? 'The customer shared a need and budget, and the timing appears actionable.' : quality === '不合格' ? 'The stated budget or region does not currently meet the configured rules.' : 'Key information such as budget or purchase timing is missing, so no qualification is forced.',
        evidence: `Hi, I’m interested in ${needs[index % needs.length]}. My budget is around ${budget} …`,
        simulated: true
      }
    };
  });
  const demoCallbacks = [
    { id: 'cb1', order: 'FT-20260902', customer: 'Hannah Wong', event: 'Purchase', amount: 'RM 9,600', status: 'success', time: '2026/09/17 10:24', note: 'Simulated success · Not sent to Meta' },
    { id: 'cb2', order: 'FT-20260907', customer: 'Sophie Zhang', event: 'Purchase', amount: 'RM 6,400', status: 'success', time: '2026/09/16 16:08', note: 'Simulated success · Not sent to Meta' },
    { id: 'cb3', order: 'FT-20260915', customer: 'Ethan Lim', event: 'Purchase', amount: 'RM 14,800', status: 'pending', time: 'Waiting to send', note: 'Queued in the demo environment' },
    { id: 'cb4', order: 'FT-20260927', customer: 'Olivia Ng', event: 'Purchase', amount: 'RM 12,600', status: 'failed', time: '2026/09/16 09:41', note: 'Missing fbc / fbp matching data; no click ID was fabricated' }
  ];
  const demoSpendRows = demoAds.filter(ad => ad.spend != null).flatMap(ad => {
    const daily = Number((ad.spend / 30).toFixed(2));
    return Array.from({ length: 30 }, (_, index) => {
      const date = new Date(2026, 8, 17 - index, 12);
      const spend = index === 29 ? Number((ad.spend - daily * 29).toFixed(2)) : daily;
      return {
        adId: ad.id,
        metricDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
        spend,
        currency: ad.currency
      };
    });
  });
  return { ads: demoAds, customers: demoCustomers, callbacks: demoCallbacks, spendRows: demoSpendRows };
}

const initialDemoData = createDemoData();
let { ads, customers, callbacks } = initialDemoData;
let spendRows = initialDemoData.spendRows;
let selectedCustomer = null;
let filters = { search: '', quality: 'all', stage: 'all', owner: 'all' };
let overviewFilters = { days: '30', ad: 'all', owner: 'all' };
const runtime = {
  mode: 'demo',
  reason: 'Supabase 尚未配置',
  session: null,
  context: null,
  rules: null,
  members: [],
  integrations: [],
  lastSync: null,
  loading: false,
  needsOrganization: false
};

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const api = () => window.FlowTraceSupabase;
const isSupabaseMode = () => runtime.mode === 'supabase' || runtime.mode === 'supabase-empty';
const parseDate = value => value instanceof Date ? value : value ? new Date(value) : null;
const validDate = value => { const date = parseDate(value); return date && !Number.isNaN(date.getTime()) ? date : null; };
const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const fmtDate = value => {
  const date = validDate(value);
  if (!date) return '—';
  return `${date.getMonth() + 1}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};
const currencyPrefix = currency => currency === 'MYR' ? 'RM' : currency || 'MYR';
const money = (value, currency = 'MYR') => Number(value) > 0 ? `${currencyPrefix(currency)} ${Number(value).toLocaleString('en-MY', { maximumFractionDigits: 2 })}` : '—';
const startOfDay = value => {
  const date = validDate(value) || new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};
const reportStart = () => {
  if (overviewFilters.days === 'all') return null;
  const start = startOfDay(new Date());
  start.setDate(start.getDate() - Number(overviewFilters.days) + 1);
  return start;
};
const isInReportRange = value => {
  const date = validDate(value);
  const start = reportStart();
  return Boolean(date && (!start || date >= start));
};
const normalizeSpendRow = row => ({
  adId: String(row.adId || row.ad_id || ''),
  metricDate: validDate(row.metricDate || row.metric_date || row.date),
  spend: Number(row.spend),
  currency: String(row.currency || 'MYR').toUpperCase()
});
const addCurrencyAmount = (totals, currency, amount) => {
  const code = String(currency || 'MYR').toUpperCase();
  totals[code] = (totals[code] || 0) + Number(amount || 0);
  return totals;
};
const revenueTotalsFor = source => source.reduce((totals, customer) => {
  reportValidOrdersFor(customer).forEach(order => addCurrencyAmount(totals, order.currency, order.amount));
  return totals;
}, {});
const formatCurrencyTotals = totals => {
  const entries = Object.entries(totals).filter(([, amount]) => amount > 0).sort(([a], [b]) => a.localeCompare(b));
  return entries.length ? entries.map(([currency, amount]) => money(amount, currency)).join(' + ') : '—';
};
const qualityClass = quality => quality === '合格' ? 'good' : quality === '待了解' ? 'wait' : 'bad';
const showToast = message => {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
};
const audit = (customer, text) => {
  customer.audit = customer.audit || [];
  customer.audit.unshift({ time: new Date(), text });
};

function statusData() {
  const status = api()?.getStatus?.();
  return status?.ok ? status.data || {} : {};
}

function allAds() {
  const known = ads.filter(ad => ad.id !== 'unknown');
  return [...known, ads.find(ad => ad.id === 'unknown') || UNKNOWN_AD];
}

function adById(id) {
  return ads.find(ad => String(ad.id) === String(id)) || UNKNOWN_AD;
}

function normalizedOrder(order) {
  if (!order) return null;
  const paymentStatus = order.paymentStatus || order.payment_status || 'unpaid';
  return {
    ...order,
    id: order.id,
    orderNumber: order.orderNumber || order.order_number || '',
    amount: Number(order.amount || 0),
    currency: order.currency || 'MYR',
    paymentStatus,
    conversionEligible: Boolean(order.conversionEligible ?? order.conversion_eligible),
    qualifyingPaymentAt: order.qualifyingPaymentAt || order.qualifying_payment_at || order.conversion_eligible_at || order.created_at,
    createdAt: order.createdAt || order.created_at,
    cancelledAt: order.cancelledAt || order.cancelled_at,
    refundedAt: order.refundedAt || order.refunded_at
  };
}

function ordersFor(customer) {
  if (Array.isArray(customer.orders) && customer.orders.length) return customer.orders.map(normalizedOrder).filter(Boolean);
  if (!customer.order) return [];
  return [{
    id: customer.order,
    orderNumber: customer.order,
    amount: Number(customer.amount || 0),
    currency: customer.currency || 'MYR',
    paymentStatus: customer.refund ? 'refunded' : customer.canceled ? 'cancelled' : customer.orderStandard === '已付全款' ? 'paid_in_full' : 'deposit_paid',
    conversionEligible: Boolean(customer.amount > 0 && !customer.refund && !customer.canceled),
    qualifyingPaymentAt: customer.orderTime,
    createdAt: customer.orderTime
  }];
}

function validOrdersFor(customer) {
  return ordersFor(customer).filter(order => order.conversionEligible && !['cancelled', 'refunded'].includes(order.paymentStatus));
}

const isValidOrder = customer => validOrdersFor(customer).length > 0;
const reportValidOrdersFor = customer => validOrdersFor(customer).filter(order => isInReportRange(order.qualifyingPaymentAt || order.createdAt));
const isReportValidOrder = customer => reportValidOrdersFor(customer).length > 0;
const latestOrderFor = customer => ordersFor(customer).sort((a, b) => (validDate(b.createdAt)?.getTime() || 0) - (validDate(a.createdAt)?.getTime() || 0))[0] || null;

function labelQuality(value) {
  return QUALITY_LABELS[value] || value || '待了解';
}

function labelStage(value) {
  return STAGE_LABELS[value] || value || '新咨询';
}

function normalizeCustomer(customer) {
  const contact = customer.phone || customer.primaryPhone || customer.primary_contact?.display_value || customer.contacts?.find(item => item.channel === 'whatsapp')?.display_value || '未提供';
  const owner = customer.owner || customer.ownerName || customer.owner_profile?.display_name || customer.ownerProfile?.display_name || '未分配';
  const rawBudget = customer.budget;
  const minBudget = customer.budgetMin ?? customer.budget_min;
  const maxBudget = customer.budgetMax ?? customer.budget_max;
  const budgetCurrency = customer.budgetCurrency || customer.budget_currency || 'MYR';
  const budget = rawBudget || (minBudget != null ? `${currencyPrefix(budgetCurrency)} ${Number(minBudget).toLocaleString()}${maxBudget != null ? `–${Number(maxBudget).toLocaleString()}` : '+'}` : 'Not provided');
  const firstAttribution = customer.firstAttribution || customer.first_attribution || {};
  const normalizedOrders = (customer.orders || []).map(normalizedOrder).filter(Boolean);
  const latest = normalizedOrders.sort((a, b) => (validDate(b.createdAt)?.getTime() || 0) - (validDate(a.createdAt)?.getTime() || 0))[0] || null;
  return {
    ...customer,
    id: String(customer.id),
    name: customer.name || customer.displayName || customer.display_name || '未命名客户',
    phone: contact,
    owner,
    quality: labelQuality(customer.quality),
    stage: labelStage(customer.stage || customer.sales_stage),
    adId: String(customer.adId || customer.ad_id || firstAttribution.adId || firstAttribution.ad_id || 'unknown'),
    need: customer.need || customer.needSummary || customer.need_summary || 'Not provided',
    budget,
    region: customer.region || 'Not provided',
    purchase: customer.purchase || customer.purchaseTimeframe || customer.purchase_timeframe || 'Not provided',
    first: validDate(customer.first || customer.firstInquiryAt || customer.first_inquiry_at || customer.created_at) || new Date(),
    last: validDate(customer.last || customer.lastInteractionAt || customer.last_interaction_at || customer.updated_at) || new Date(),
    orders: normalizedOrders,
    amount: latest?.amount || Number(customer.amount || 0),
    order: latest?.orderNumber || customer.order || null,
    currency: latest?.currency || customer.currency || null,
    orderTime: latest?.qualifyingPaymentAt || customer.orderTime || null,
    refund: latest?.paymentStatus === 'refunded' || Boolean(customer.refund),
    canceled: latest?.paymentStatus === 'cancelled' || Boolean(customer.canceled),
    orderStandard: latest?.paymentStatus === 'paid_in_full' ? '已付全款' : latest?.paymentStatus === 'deposit_paid' ? '已付订金' : customer.orderStandard,
    audit: customer.audit || customer.activities || [],
    clickId: customer.clickId || customer.click_id || firstAttribution.ctwaClid || firstAttribution.ctwa_clid || firstAttribution.internal_click_id || null,
    sourceHistory: customer.sourceHistory || customer.source_history || [],
    messages: customer.messages || [],
    notes: customer.notes || [],
    aiAnalysis: customer.aiAnalysis || customer.ai_analysis || customer.aiAnalyses?.[0] || null
  };
}

function normalizeAd(ad, index) {
  const spendValue = ad.spend == null ? null : Number(ad.spend);
  return {
    ...ad,
    id: String(ad.id),
    name: ad.name || ad.ad_name || 'Unnamed ad',
    color: ad.color || ['teal', 'amber', 'blue'][index % 3],
    spend: Number.isFinite(spendValue) ? spendValue : null,
    currency: ad.currency || ad.spendCurrency || 'MYR'
  };
}

function normalizeCallback(callback) {
  const rawStatus = callback.deliveryStatus || callback.delivery_status || callback.status || 'queued';
  const status = ({ succeeded: 'success', queued: 'pending' }[rawStatus] || rawStatus);
  const amountValue = callback.amount ?? callback.orderAmount ?? callback.order_amount;
  const currency = callback.currency || callback.orderCurrency || callback.order_currency || 'MYR';
  return {
    ...callback,
    id: String(callback.id),
    order: callback.order || callback.orderNumber || callback.order_number || callback.orders?.order_number || '—',
    customer: callback.customer || callback.customerName || callback.customer_name || callback.customers?.display_name || '—',
    event: callback.event || callback.eventName || callback.event_name || 'Purchase',
    amount: typeof amountValue === 'string' && /[A-Z]|RM/.test(amountValue) ? amountValue : money(Number(amountValue || 0), currency),
    status,
    time: callback.time ? (validDate(callback.time) ? fmtDate(callback.time) : callback.time) : fmtDate(callback.sentAt || callback.sent_at || callback.created_at),
    note: callback.note || callback.blockedReason || callback.blocked_reason || callback.error_message || '—'
  };
}

function overviewCustomers() {
  return customers.filter(customer => {
    return isInReportRange(customer.first)
      && (overviewFilters.ad === 'all' || customer.adId === overviewFilters.ad)
      && (overviewFilters.owner === 'all' || customer.owner === overviewFilters.owner);
  });
}

function spendForAd(ad) {
  if (overviewFilters.owner !== 'all') return { state: 'not_applicable', totals: {} };
  const relevant = spendRows.map(normalizeSpendRow).filter(row => row.adId === ad.id && Number.isFinite(row.spend) && row.metricDate && isInReportRange(row.metricDate));
  if (!relevant.length) return { state: 'missing', totals: {} };
  const totals = relevant.reduce((result, row) => addCurrencyAmount(result, row.currency, row.spend), {});
  const currencies = Object.keys(totals);
  if (currencies.length !== 1) return { state: 'mixed_currency', totals };
  return { state: 'available', totals, currency: currencies[0], amount: totals[currencies[0]] };
}

function unavailableSpendLabel(state) {
  if (state === 'not_applicable') return '负责人筛选下不适用';
  if (state === 'mixed_currency') return '花费币种不一致';
  return '未接入';
}

function adSummary(source = overviewCustomers()) {
  return allAds().filter(ad => overviewFilters.ad === 'all' || ad.id === overviewFilters.ad).map(ad => {
    const list = source.filter(customer => customer.adId === ad.id || (ad.id === 'unknown' && !ads.some(item => String(item.id) === String(customer.adId))));
    const revenueTotals = revenueTotalsFor(list);
    const spend = spendForAd(ad);
    const revenueCurrencies = Object.keys(revenueTotals).filter(currency => revenueTotals[currency] > 0);
    const comparable = spend.state === 'available' && (revenueCurrencies.length === 0 || (revenueCurrencies.length === 1 && revenueCurrencies[0] === spend.currency));
    return {
      ...ad,
      leads: list.length,
      qualified: list.filter(customer => customer.quality === '合格').length,
      won: list.filter(isReportValidOrder).length,
      revenueTotals,
      revenueLabel: formatCurrencyTotals(revenueTotals),
      spend,
      roas: comparable && spend.amount > 0 ? (revenueTotals[spend.currency] || 0) / spend.amount : null,
      sourceRate: source.length ? `${Math.round(list.length / source.length * 100)}%` : '0%'
    };
  });
}

function renderAds() {
  const summary = adSummary();
  const row = ad => {
    const cost = ad.spend.state === 'available' && ad.leads > 0 ? money(ad.spend.amount / ad.leads, ad.spend.currency) : unavailableSpendLabel(ad.spend.state);
    return `<tr><td><div class="ad-name"><span class="ad-swatch ${esc(ad.color === 'teal' ? '' : ad.color)}"></span>${esc(ad.name)}</div></td><td class="cell-strong">${ad.leads}</td><td class="cell-strong">${ad.qualified}</td><td class="cell-strong">${ad.won}</td><td class="cell-strong">${esc(ad.revenueLabel)}</td><td class="${ad.spend.state === 'available' && ad.leads > 0 ? 'cell-strong' : 'na'}">${esc(cost)}</td><td>${ad.sourceRate}</td></tr>`;
  };
  $('#adTableBody').innerHTML = summary.length ? summary.map(row).join('') : '<tr><td colspan="7" class="na">当前筛选没有广告数据</td></tr>';
  const detailRows = summary.filter(ad => ad.id !== 'unknown');
  $('#adDetailBody').innerHTML = detailRows.length ? detailRows.map(ad => {
    const spendLabel = ad.spend.state === 'available' ? money(ad.spend.amount, ad.spend.currency) : unavailableSpendLabel(ad.spend.state);
    const roasLabel = ad.roas == null ? (ad.spend.state === 'available' ? '币种不一致' : unavailableSpendLabel(ad.spend.state)) : `${ad.roas.toFixed(1)}×`;
    return `<tr><td><div class="ad-name"><span class="ad-swatch ${esc(ad.color === 'teal' ? '' : ad.color)}"></span>${esc(ad.name)}</div></td><td class="${ad.spend.state === 'available' ? 'cell-strong' : 'na'}">${esc(spendLabel)}</td><td>${ad.leads}</td><td class="rate">${ad.leads ? Math.round(ad.qualified / ad.leads * 100) : 0}%</td><td>${ad.won}</td><td class="cell-strong">${esc(ad.revenueLabel)}</td><td class="${ad.roas == null ? 'na' : 'rate'}">${esc(roasLabel)}</td></tr>`;
  }).join('') : '<tr><td colspan="7" class="na">当前筛选没有可比较的广告</td></tr>';
  const top = summary.filter(ad => ad.id !== 'unknown' && ad.roas != null).sort((a, b) => b.roas - a.roas)[0];
  const card = $('.top-ad-card');
  if (top) {
    card.querySelector('h3').textContent = top.name;
    card.querySelector('.top-ad-score').textContent = `${top.roas.toFixed(1)}×`;
    card.querySelector('p').textContent = `同币种口径：每 ${currencyPrefix(top.spend.currency)} 1 广告花费带来 ${currencyPrefix(top.spend.currency)} ${top.roas.toFixed(1)} 成交金额`;
    card.querySelector('.score-line span').style.width = `${Math.min(100, Math.max(8, top.roas * 24))}%`;
    card.querySelector('.top-ad-meta').innerHTML = `<span>成交 ${top.won} 人</span><span>${esc(top.revenueLabel)}</span>`;
  } else {
    card.querySelector('h3').textContent = '暂无可比较广告';
    card.querySelector('.top-ad-score').textContent = '—';
    card.querySelector('p').textContent = overviewFilters.owner !== 'all' ? '按负责人筛选时不分摊整条广告花费。' : '需要同一筛选期间的广告花费和同币种成交金额。';
    card.querySelector('.score-line span').style.width = '0';
    card.querySelector('.top-ad-meta').innerHTML = '<span>未计算 ROAS</span><span>—</span>';
  }
}

function filteredCustomers() {
  return customers.filter(customer => {
    const haystack = `${customer.name}${customer.phone}${customer.need}`.toLowerCase();
    return (!filters.search || haystack.includes(filters.search.toLowerCase()))
      && (filters.quality === 'all' || customer.quality === filters.quality)
      && (filters.stage === 'all' || customer.stage === filters.stage)
      && (filters.owner === 'all' || customer.owner === filters.owner);
  });
}

function renderCustomerList() {
  const list = filteredCustomers();
  $('#listResultCount').textContent = list.length;
  $('#customerNavCount').textContent = customers.length;
  if (!list.length) {
    $('#customerList').innerHTML = `<div class="empty-detail" style="min-height:260px"><div class="empty-icon">⌕</div><h3>${isSupabaseMode() && !customers.length ? 'Supabase 目前没有客户' : '没有符合条件的客户'}</h3><p>${isSupabaseMode() && !customers.length ? '接入 WhatsApp Webhook 或导入客户后会显示在这里' : '试试清除筛选条件'}</p></div>`;
    return;
  }
  $('#customerList').innerHTML = list.map(customer => `<div class="customer-row ${selectedCustomer === customer.id ? 'selected' : ''}" data-customer="${esc(customer.id)}"><div class="avatar ${customer.owner === 'Amy' ? 'amy' : customer.owner === 'Ben' ? 'ben' : 'owner'}">${esc(customer.name.slice(0, 1))}</div><div class="customer-main"><div class="customer-name"><span class="quality-dot ${qualityClass(customer.quality)}"></span>${esc(customer.name)}<span class="stage-mini ${customer.stage === '已成交' ? 'won' : ''}">${esc(customer.stage)}</span></div><div class="customer-meta">${esc(customer.need)} · ${esc(adById(customer.adId).name)}</div></div><div class="customer-time">${fmtDate(customer.last)}</div></div>`).join('');
  $$('.customer-row').forEach(row => row.addEventListener('click', () => {
    selectedCustomer = row.dataset.customer;
    renderCustomerList();
    renderCustomerDetail();
  }));
}

function callbackLabelFor(customer, order) {
  if (!order) return '未创建回传事件';
  const callback = callbacks.find(item => String(item.order) === String(order.orderNumber) || String(item.orderId || item.order_id) === String(order.id));
  if (order.paymentStatus === 'refunded') return '订单已退款；不计入有效成交';
  if (order.paymentStatus === 'cancelled') return '订单已取消；不触发 Purchase';
  if (!callback) return order.conversionEligible ? '尚未建立回传记录' : '未达到当前成交标准';
  const labels = { success: 'Meta 已接收', pending: '待发送', failed: '失败待重试', blocked: '待处理', processing: '处理中', suppressed: '演示环境已拦截', cancelled: '已取消' };
  return `回传状态：${labels[callback.status] || callback.status}`;
}

function renderMessages(customer) {
  if (!customer.messages?.length) return '<div class="empty-list-state"><strong>暂无聊天记录</strong>消息接入后会按时间显示。</div>';
  return customer.messages.slice().sort((a, b) => (validDate(a.sentAt || a.sent_at)?.getTime() || 0) - (validDate(b.sentAt || b.sent_at)?.getTime() || 0)).map(message => {
    const outbound = (message.direction || 'inbound') === 'outbound';
    const body = message.body || message.text || '';
    return `<div class="chat-line ${outbound ? 'sales' : ''}"><div class="chat-avatar">${esc((outbound ? customer.owner : customer.name).slice(0, 1))}</div><div class="chat-bubble">${esc(body)}</div><span class="chat-time">${fmtDate(message.sentAt || message.sent_at)}</span></div>`;
  }).join('');
}

function renderAiPanel(customer) {
  const analysis = customer.aiAnalysis;
  if (!analysis) {
    return `<div class="ai-panel"><div class="ai-head"><strong>AI 分类尚未接入</strong><span>人工判断</span></div><p class="ai-reason">Supabase 已保存客户资料，但尚无 AI 分析记录。系统不会在信息不足时猜测客户质量。</p><div class="ai-actions"><button class="edit" id="editQualityBtn">手动修改分类</button><button class="edit" id="replySuggestBtn">建议回复未接入</button></div></div>`;
  }
  const suggestedQuality = labelQuality(analysis.suggestedQuality || analysis.suggested_quality || customer.quality);
  const priorityMap = { high: '高', medium: '中', low: '低' };
  const priority = priorityMap[analysis.priority || analysis.suggested_priority] || analysis.priority || '中';
  const evidenceSource = analysis.evidence;
  const evidence = Array.isArray(evidenceSource) ? evidenceSource.map(item => item.quote || item.text || item).join('；') : evidenceSource || '未保存聊天依据';
  return `<div class="ai-panel"><div class="ai-head"><strong>✦ 建议质量：${esc(suggestedQuality)}</strong><span>跟进优先级：${esc(priority)}</span></div><p class="ai-reason">${esc(analysis.reasoning || analysis.reason || '信息不足，暂不强行判断。')}</p><div class="evidence">聊天依据：“${esc(evidence)}”</div><div class="ai-actions"><button class="accept" id="acceptAiBtn" data-ai-quality="${esc(suggestedQuality)}">采纳建议</button><button class="edit" id="editQualityBtn">手动修改分类</button><button class="edit" id="replySuggestBtn">生成建议回复</button></div></div>`;
}

function activityText(activity) {
  if (activity.action === 'customer_updated') return '客户资料或分类已更新';
  if (activity.action === 'order_recorded') return `已记录订单 ${activity.after_data?.order_number || ''}`.trim();
  return activity.action || '记录已更新';
}

function orderStatusLabel(status) {
  return ({ unpaid: '未付款', deposit_paid: '已付订金', paid_in_full: '已付全款', cancelled: '已取消', refunded: '已退款' }[status] || status || '未知状态');
}

function renderCustomerDetail() {
  const customer = customers.find(item => item.id === selectedCustomer);
  if (!customer) {
    $('#customerDetail').className = 'customer-detail empty-detail';
    $('#customerDetail').innerHTML = '<div class="empty-icon">♙</div><h3>选择一位客户</h3><p>查看聊天、来源、AI 建议和成交记录</p>';
    return;
  }
  const ad = adById(customer.adId);
  const latestOrder = latestOrderFor(customer);
  const auditItems = [...(customer.notes || []).map(note => ({ time: note.createdAt || note.created_at, text: note.body })), ...(customer.audit || []).map(item => ({ time: item.time || item.created_at, text: item.text || item.note || activityText(item) }))]
    .sort((a, b) => (validDate(b.time)?.getTime() || 0) - (validDate(a.time)?.getTime() || 0));
  const auditHtml = auditItems.slice(0, 6).map(item => `<div class="timeline-item"><div class="timeline-time">${fmtDate(item.time)}</div><div class="timeline-text">${esc(item.text || '记录已更新')}</div></div>`).join('');
  const history = (customer.sourceHistory || []).map(item => typeof item === 'string' ? item : item.adName || item.ad_name || item.name || 'Unknown Source');
  const orderHtml = latestOrder ? `<div class="source-card"><div class="source-name">订单 ${esc(latestOrder.orderNumber)}<span>${esc(orderStatusLabel(latestOrder.paymentStatus))} · ${esc(latestOrder.currency)} · ${fmtDate(latestOrder.qualifyingPaymentAt)}</span></div><div class="source-id">${money(latestOrder.amount, latestOrder.currency)}<strong>${esc(callbackLabelFor(customer, latestOrder))}</strong></div></div>` : '<div class="source-card"><div class="source-name">尚未记录成交<span>AI 的高意向建议不会自动创建成交</span></div><button class="soft-button" id="recordOrderBtn">＋ 记录成交</button></div>';
  $('#customerDetail').className = 'customer-detail';
  $('#customerDetail').innerHTML = `<div class="detail-head"><div class="detail-title-row"><div class="detail-person"><div class="avatar ${customer.owner === 'Amy' ? 'amy' : customer.owner === 'Ben' ? 'ben' : 'owner'}">${esc(customer.name.slice(0, 1))}</div><div><h2>${esc(customer.name)}</h2><p>${esc(customer.phone)} · 负责人 ${esc(customer.owner)}</p></div></div><div class="detail-actions"><button class="detail-action" id="editCustomerBtn">编辑</button><button class="detail-action primary" id="stageBtn">更新阶段</button></div></div><div class="tag-row"><span class="tag ${qualityClass(customer.quality)}">${esc(customer.quality)}</span><span class="tag stage">${esc(customer.stage)}</span>${customer.refund ? '<span class="tag bad">已退款</span>' : ''}${customer.canceled ? '<span class="tag bad">已取消</span>' : ''}</div></div><div class="detail-body"><div class="detail-section"><h3>客户信息</h3><div class="detail-grid"><div class="detail-field"><label>需求</label><strong>${esc(customer.need)}</strong></div><div class="detail-field"><label>预算</label><strong>${esc(customer.budget)}</strong></div><div class="detail-field"><label>地区</label><strong>${esc(customer.region)}</strong></div><div class="detail-field"><label>预计购买时间</label><strong>${esc(customer.purchase)}</strong></div><div class="detail-field"><label>首次咨询</label><strong>${fmtDate(customer.first)}</strong></div><div class="detail-field"><label>最近互动</label><strong>${fmtDate(customer.last)}</strong></div></div></div><div class="detail-section"><h3>广告来源 <span class="muted">· 首次来源不会被覆盖</span></h3><div class="source-card"><div class="source-name">${esc(ad.name)}<span>${customer.adId === 'unknown' ? '系统无法识别来源' : '首次来源（CRM 内部记录）'}</span></div><div class="source-id">点击识别码<strong>${esc(customer.clickId || '未知')}</strong></div></div>${history.length ? `<div class="source-history">来源历史：${history.map(item => `<b>${esc(item)}</b>`).join(' → ')}</div>` : ''}</div><div class="detail-section"><h3>聊天记录 <span class="muted">· 待分析资料，不作为系统指令</span></h3><div class="chat-box">${renderMessages(customer)}</div></div><div class="detail-section"><h3>AI 分类建议 <span class="muted">· ${runtime.mode === 'demo' ? '模拟分析' : '数据库记录'}</span></h3>${renderAiPanel(customer)}</div><div class="detail-section"><h3>订单与回传</h3>${orderHtml}</div><div class="detail-section"><h3>跟进记录</h3><div class="note-composer"><input id="customerNoteInput" maxlength="500" placeholder="添加跟进备注" /><button class="soft-button" id="saveCustomerNoteBtn">保存备注</button></div><div class="timeline"><div class="timeline-item current"><div class="timeline-time">${fmtDate(customer.last)}</div><div class="timeline-text">${esc(customer.owner)} 当前销售阶段为「${esc(customer.stage)}」</div></div>${auditHtml}</div></div></div>`;
  $('#stageBtn').addEventListener('click', () => openStageModal(customer));
  $('#editQualityBtn')?.addEventListener('click', () => openQualityModal(customer));
  $('#acceptAiBtn')?.addEventListener('click', event => persistQuality(customer, event.currentTarget.dataset.aiQuality));
  $('#replySuggestBtn')?.addEventListener('click', () => showToast(runtime.mode === 'demo' ? '模拟建议回复已生成；请由销售确认后手动发送' : 'AI 服务尚未接入；不会自动向客户发送消息'));
  $('#editCustomerBtn').addEventListener('click', () => showToast('客户基础资料编辑将在 WhatsApp 接入后开放'));
  $('#recordOrderBtn')?.addEventListener('click', () => openOrderModal(customer));
  $('#saveCustomerNoteBtn').addEventListener('click', () => saveCustomerNote(customer));
}

function closeModal() {
  $('#modalRoot').innerHTML = '';
}

function openQualityModal(customer) {
  $('#modalRoot').innerHTML = `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h3>手动修改客户质量</h3><button class="modal-close">×</button></div><p class="modal-help">修改会保留在数据库审计记录中，AI 建议不会覆盖人工判断。</p><div class="modal-options">${['待了解','合格','不合格'].map(quality => `<button class="modal-option ${customer.quality === quality ? 'selected' : ''}" data-quality="${quality}"><span class="quality-dot ${qualityClass(quality)}"></span>${quality}</button>`).join('')}</div><div class="modal-footer"><button class="ghost-button modal-cancel">取消</button><button class="primary-button" id="saveQuality">保存修改</button></div></div></div>`;
  let picked = customer.quality;
  $$('.modal-option').forEach(button => button.onclick = () => {
    $$('.modal-option').forEach(item => item.classList.remove('selected'));
    button.classList.add('selected');
    picked = button.dataset.quality;
  });
  $('.modal-close').onclick = $('.modal-cancel').onclick = closeModal;
  $('#saveQuality').onclick = event => persistQuality(customer, picked, event.currentTarget);
}

async function persistQuality(customer, picked, button) {
  if (!picked || picked === customer.quality) {
    closeModal();
    showToast(`客户质量保持为「${customer.quality}」`);
    return;
  }
  const old = customer.quality;
  try {
    if (button) button.disabled = true;
    if (isSupabaseMode()) {
      await requireOk(api().updateCustomerQuality(customer.id, QUALITY_VALUES[picked]));
      closeModal();
      await refreshWorkspace({ quiet: true, preserveCustomer: customer.id });
      showToast(`已更新 ${customer.name} 的客户质量，数据库审计记录已保留`);
    } else {
      customer.quality = picked;
      audit(customer, `Manually changed customer quality from “${old}” to “${picked}”`);
      closeModal();
      renderAll();
      showToast(`已在演示数据中将质量改为「${picked}」`);
    }
  } catch (error) {
    if (button) button.disabled = false;
    showToast(`保存失败：${friendlyError(error)}`);
  }
}

function openStageModal(customer) {
  $('#modalRoot').innerHTML = `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h3>更新销售阶段</h3><button class="modal-close">×</button></div><p class="modal-help">销售阶段是内部流程状态；只有符合付款标准的真实订单才会建立 Purchase 记录。</p><div class="modal-options stage-options">${stages.map(stage => `<button class="modal-option ${customer.stage === stage ? 'selected' : ''}" data-stage="${stage}">${stage}</button>`).join('')}</div><div class="modal-footer"><button class="ghost-button modal-cancel">取消</button><button class="primary-button" id="saveStage">保存阶段</button></div></div></div>`;
  let picked = customer.stage;
  $$('.modal-option').forEach(button => button.onclick = () => {
    $$('.modal-option').forEach(item => item.classList.remove('selected'));
    button.classList.add('selected');
    picked = button.dataset.stage;
  });
  $('.modal-close').onclick = $('.modal-cancel').onclick = closeModal;
  $('#saveStage').onclick = event => persistStage(customer, picked, event.currentTarget);
}

async function persistStage(customer, picked, button) {
  if (!picked || picked === customer.stage) {
    closeModal();
    showToast(`销售阶段保持为「${customer.stage}」`);
    return;
  }
  const old = customer.stage;
  try {
    if (button) button.disabled = true;
    if (isSupabaseMode()) {
      await requireOk(api().updateSalesStage(customer.id, STAGE_VALUES[picked]));
      closeModal();
      await refreshWorkspace({ quiet: true, preserveCustomer: customer.id });
      showToast(`已将 ${customer.name} 的阶段更新为「${picked}」`);
    } else {
      customer.stage = picked;
      audit(customer, `Manually changed sales stage from “${old}” to “${picked}”`);
      closeModal();
      renderAll();
      showToast(`已在演示数据中更新阶段为「${picked}」`);
    }
  } catch (error) {
    if (button) button.disabled = false;
    showToast(`保存失败：${friendlyError(error)}`);
  }
}

function localDatetimeValue(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function openOrderModal(customer) {
  const defaultOrder = `FT-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${String(customers.indexOf(customer) + 1).padStart(3, '0')}`;
  $('#modalRoot').innerHTML = `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h3>记录人工确认成交</h3><button class="modal-close">×</button></div><p class="modal-help">只能录入真实付款订单。Supabase 演示组织会在数据库层阻止向 Meta 外发。</p><label>订单编号<input id="orderIdInput" value="${esc(defaultOrder)}" /></label><label>成交金额<input id="orderAmountInput" type="number" min="0.01" step="0.01" value="12800" /></label><label>币种<select id="orderCurrencyInput"><option value="MYR">MYR · 马来西亚令吉</option><option value="SGD">SGD · 新加坡元</option></select></label><label>付款状态<select id="orderStandardInput"><option value="deposit_paid">已付订金</option><option value="paid_in_full">已付全款</option></select></label><label>付款时间<input id="orderTimeInput" type="datetime-local" value="${localDatetimeValue()}" /></label><div class="modal-footer"><button class="ghost-button modal-cancel">取消</button><button class="primary-button" id="saveOrder">确认成交</button></div></div></div>`;
  $('.modal-close').onclick = $('.modal-cancel').onclick = closeModal;
  $('#saveOrder').onclick = event => saveOrder(customer, event.currentTarget);
}

async function saveOrder(customer, button) {
  const orderNumber = $('#orderIdInput').value.trim();
  const amount = Number($('#orderAmountInput').value);
  const currency = $('#orderCurrencyInput').value;
  const paymentStatus = $('#orderStandardInput').value;
  const paymentTime = $('#orderTimeInput').value;
  if (!orderNumber || !Number.isFinite(amount) || amount <= 0 || !paymentTime) {
    showToast('请填写有效的订单编号、金额和付款时间');
    return;
  }
  try {
    button.disabled = true;
    if (isSupabaseMode()) {
      await requireOk(api().recordOrderAndEnqueuePurchase({
        organizationId: runtime.context?.organization?.id,
        customerId: customer.id,
        orderNumber,
        amount,
        currency,
        paymentStatus,
        qualifyingPaymentAt: new Date(paymentTime).toISOString(),
        note: 'Confirmed manually in FlowTrace CRM'
      }));
      let stageUpdated = true;
      try {
        await requireOk(api().updateSalesStage(customer.id, 'won'));
      } catch (_) {
        stageUpdated = false;
      }
      closeModal();
      await refreshWorkspace({ quiet: true, preserveCustomer: customer.id });
      showToast(stageUpdated ? '真实订单已写入 Supabase；Meta 状态请以回传页面为准' : '订单已写入 Supabase，但销售阶段更新失败，请手动检查');
      return;
    }
    if (customer.order || customers.some(item => item.order === orderNumber)) {
      throw new Error('该客户已有订单或订单编号已存在，已阻止重复成交');
    }
    const order = { id: `demo-${Date.now()}`, orderNumber, amount, currency, paymentStatus, conversionEligible: true, qualifyingPaymentAt: new Date(paymentTime), createdAt: new Date() };
    customer.orders = [order];
    customer.order = orderNumber;
    customer.amount = amount;
    customer.currency = currency;
    customer.orderStandard = paymentStatus === 'paid_in_full' ? '已付全款' : '已付订金';
    customer.orderTime = new Date(paymentTime);
    customer.stage = '已成交';
    audit(customer, `Confirmed demo order ${orderNumber}, ${currency} ${amount.toLocaleString()}`);
    callbacks.unshift({ id: `cb-${Date.now()}`, order: orderNumber, customer: customer.name, event: 'Purchase', amount: money(amount, currency), status: 'pending', time: 'Just now', note: 'Demo queue only · Not sent to Meta' });
    closeModal();
    renderAll();
    showToast('演示成交已记录；不会发送到 Meta');
  } catch (error) {
    button.disabled = false;
    showToast(friendlyError(error));
  }
}

async function saveCustomerNote(customer) {
  const input = $('#customerNoteInput');
  const body = input.value.trim();
  if (!body) {
    showToast('请先填写跟进备注');
    return;
  }
  const button = $('#saveCustomerNoteBtn');
  try {
    button.disabled = true;
    if (isSupabaseMode()) {
      await requireOk(api().addCustomerNote(customer.id, body));
      await refreshWorkspace({ quiet: true, preserveCustomer: customer.id });
      showToast('跟进备注已保存到 Supabase');
    } else {
      audit(customer, body);
      renderCustomerDetail();
      showToast('备注已保存到本次演示会话');
    }
  } catch (error) {
    button.disabled = false;
    showToast(`保存失败：${friendlyError(error)}`);
  }
}

function callbackStatusLabel(status) {
  return ({ success: '成功', pending: '待发送', failed: '失败', blocked: '待处理', processing: '处理中', suppressed: '演示拦截', cancelled: '已取消' }[status] || status);
}

function renderCallbacks() {
  if (!callbacks.length) {
    $('#callbackList').innerHTML = '<div class="empty-list-state"><strong>暂无 Meta 回传记录</strong>只有达到成交标准的真实订单才可能建立 Purchase 事件。</div>';
  } else {
    $('#callbackList').innerHTML = callbacks.map(callback => `<div class="callback-item"><div class="callback-order"><strong>${esc(callback.order)}</strong><span>${esc(callback.customer)} · ${esc(callback.time)}</span></div><div class="callback-event">事件类型 <strong>${esc(callback.event)}</strong></div><div class="callback-amount">${esc(callback.amount)}</div><div><span class="callback-status ${esc(callback.status)}">${esc(callbackStatusLabel(callback.status))}</span><div class="callback-reason">${esc(callback.note)}</div></div>${runtime.mode === 'demo' && callback.status === 'failed' ? `<button class="retry-button" data-retry="${esc(callback.id)}">↻ 重试</button>` : '<span></span>'}</div>`).join('');
  }
  $('#cbSuccess').textContent = callbacks.filter(item => item.status === 'success').length;
  $('#cbPending').textContent = callbacks.filter(item => item.status === 'pending').length;
  $('#cbFailed').textContent = callbacks.filter(item => ['failed', 'blocked'].includes(item.status)).length;
  $('#cbProcessing').textContent = callbacks.filter(item => item.status === 'processing').length;
  $('#pendingNavCount').textContent = callbacks.filter(item => !['success', 'suppressed', 'cancelled'].includes(item.status)).length;
  $$('[data-retry]').forEach(button => button.onclick = () => {
    const callback = callbacks.find(item => item.id === button.dataset.retry);
    callback.status = 'success';
    callback.time = 'Just now';
    callback.note = 'Simulated retry success · Not sent to Meta';
    renderCallbacks();
    showToast('模拟重试成功；未向 Meta 发送事件');
  });
  const online = isSupabaseMode();
  $('#retryAllBtn').disabled = online;
  $('#retryAllBtn').title = online ? '真实重试必须由服务端队列执行' : '重试模拟失败事件';
  $('#callbackNoticeTitle').textContent = online ? 'Supabase 记录状态' : '演示环境保护';
  $('#callbackNoticeText').textContent = online ? '这里读取数据库中的事件状态；成功只代表 Meta 接收，不代表实际归因或已启用广告优化。真实重试必须由服务端工作队列执行。' : '模拟成交不会发送到真实 Meta。正式接入前，请先完成账户、权限和事件字段核对。';
}

function renderChart() {
  const now = startOfDay(new Date());
  const end = new Date(now);
  end.setDate(end.getDate() + 1);
  const scoped = customers.filter(customer => (overviewFilters.ad === 'all' || customer.adId === overviewFilters.ad) && (overviewFilters.owner === 'all' || customer.owner === overviewFilters.owner));
  const knownDates = scoped.map(customer => validDate(customer.first)).filter(Boolean).sort((a, b) => a - b);
  const start = reportStart() || knownDates[0] || new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
  const startTime = Math.min(start.getTime(), now.getTime());
  const span = Math.max(5, end.getTime() - startTime);
  const buckets = Array.from({ length: 5 }, (_, index) => ({
    start: startTime + span * index / 5,
    end: startTime + span * (index + 1) / 5
  }));
  const values = buckets.map(bucket => {
    const list = scoped.filter(customer => { const time = validDate(customer.first)?.getTime() || 0; return time >= bucket.start && time < bucket.end; });
    return [list.length, list.filter(customer => customer.quality === '合格').length, list.filter(isReportValidOrder).length];
  });
  const max = Math.max(1, ...values.flat());
  $('#barChart').innerHTML = values.map(value => `<div class="bar-group"><span class="bar lead" style="height:${value[0] / max * 100}%"></span><span class="bar qual" style="height:${value[1] / max * 100}%"></span><span class="bar won" style="height:${value[2] / max * 100}%"></span></div>`).join('');
  $('#chartAxis').innerHTML = buckets.map(bucket => {
    const date = new Date(bucket.start);
    return `<span>${date.getMonth() + 1}/${String(date.getDate()).padStart(2, '0')}</span>`;
  }).join('');
  $('#chartPeriodLabel').textContent = overviewFilters.days === 'all' ? '全部时间趋势' : `最近 ${overviewFilters.days} 天趋势`;
}

function setView(view) {
  $$('.view').forEach(item => item.classList.toggle('active-view', item.id === `view-${view}`));
  $$('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === view));
  const titles = { overview: '总览看板', customers: '客户列表', ads: '广告表现', callbacks: 'Meta 回传', settings: '设置与接入' };
  $('#pageTitle').textContent = titles[view];
  $('#pageKicker').textContent = view === 'overview' ? '工作台' : '运营管理';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateMetrics() {
  const list = overviewCustomers();
  const qualified = list.filter(customer => customer.quality === '合格').length;
  const won = list.filter(isReportValidOrder).length;
  const unknown = list.filter(customer => customer.adId === 'unknown').length;
  const revenueTotals = revenueTotalsFor(list);
  const revenueLabel = formatCurrencyTotals(revenueTotals);
  const revenueCurrencies = Object.keys(revenueTotals).filter(currency => revenueTotals[currency] > 0);
  const periodLabel = overviewFilters.days === 'all' ? '全部时间' : `最近 ${overviewFilters.days} 天`;
  $('#metricLeads').textContent = list.length;
  $('#metricQualified').textContent = qualified;
  $('#metricWon').textContent = won;
  $('#metricRevenue').textContent = revenueLabel;
  $('#metricRevenue').classList.toggle('multi-currency', revenueCurrencies.length > 1);
  $('#metricRevenue').title = revenueCurrencies.length > 1 ? '不同币种没有汇率时不会相加' : '';
  $('#metricRate').textContent = `${(list.length ? won / list.length * 100 : 0).toFixed(1)}%`;
  $('#metricUnknown').textContent = `${(list.length ? unknown / list.length * 100 : 0).toFixed(1)}%`;
  $('#metricLeadsFoot').textContent = `${periodLabel} · ${isSupabaseMode() ? 'Supabase 在线数据' : '模拟数据'}`;
  $('#metricQualifiedFoot').textContent = '质量标签为“合格”';
  $('#metricWonFoot').textContent = '以筛选期内有效付款订单为准';
  $('#metricRevenueFoot').textContent = revenueCurrencies.length > 1 ? '按币种分开统计，未套用汇率' : revenueCurrencies.length === 1 ? `${revenueCurrencies[0]} · 已确认有效订单` : '当前筛选没有有效成交';
  $('#metricUnknownFoot').textContent = `${unknown} 位客户需要补充来源`;

  const staleCutoff = Date.now() - 86400000;
  const followups = list.filter(customer => customer.quality === '合格' && !['已成交', '未成交'].includes(customer.stage) && (validDate(customer.last)?.getTime() || 0) < staleCutoff)
    .sort((a, b) => (validDate(a.last)?.getTime() || 0) - (validDate(b.last)?.getTime() || 0));
  const followupButton = $('#openFollowupCustomerBtn');
  if (followups.length) {
    $('#followupInsightText').textContent = `有 ${followups.length} 位合格客户已超过 24 小时未跟进，优先查看 ${followups[0].name}${followups.length > 1 ? ` 和另外 ${followups.length - 1} 位客户` : ''}。`;
    followupButton.dataset.customer = followups[0].id;
    followupButton.disabled = false;
  } else {
    $('#followupInsightText').textContent = list.length ? '当前筛选没有超过 24 小时未跟进的合格客户。' : '当前筛选没有客户数据。';
    delete followupButton.dataset.customer;
    followupButton.disabled = true;
  }
}

function populateFilters() {
  const currentAd = overviewFilters.ad;
  const currentOwner = overviewFilters.owner;
  const adOptions = '<option value="all">全部广告</option>' + allAds().map(ad => `<option value="${esc(ad.id)}">${esc(ad.name)}</option>`).join('');
  $('#adFilter').innerHTML = adOptions;
  $('#chartAdFilter').innerHTML = adOptions;
  $('#adFilter').value = allAds().some(ad => ad.id === currentAd) ? currentAd : 'all';
  overviewFilters.ad = $('#adFilter').value;
  $('#chartAdFilter').value = overviewFilters.ad;
  const owners = [...new Set(customers.map(customer => customer.owner).filter(Boolean))].sort();
  $('#ownerFilter').innerHTML = '<option value="all">全部负责人</option>' + owners.map(owner => `<option value="${esc(owner)}">${esc(owner)}</option>`).join('');
  $('#customerOwnerFilter').innerHTML = '<option value="all">全部负责人</option>' + owners.map(owner => `<option value="${esc(owner)}">${esc(owner)}</option>`).join('');
  $('#ownerFilter').value = owners.includes(currentOwner) ? currentOwner : 'all';
  overviewFilters.owner = $('#ownerFilter').value;
  $('#customerOwnerFilter').value = owners.includes(filters.owner) ? filters.owner : 'all';
  filters.owner = $('#customerOwnerFilter').value;
}

function renderTeam() {
  if (!runtime.members.length) {
    $('#teamMemberList').innerHTML = isSupabaseMode()
      ? '<div class="empty-list-state"><strong>尚未建立团队</strong>建立公司空间后，当前账户会成为老板。</div>'
      : '<div class="team-row"><div class="avatar owner">L</div><div><strong>Mr. Lin</strong><span>lin@example.com</span></div><span class="role-tag">管理员</span></div><div class="team-row"><div class="avatar amy">A</div><div><strong>Amy</strong><span>amy@example.com</span></div><span class="role-tag light">销售</span></div><div class="team-row"><div class="avatar ben">B</div><div><strong>Ben</strong><span>ben@example.com</span></div><span class="role-tag light">销售</span></div>';
    return;
  }
  $('#teamMemberList').innerHTML = runtime.members.map(member => {
    const profile = member.profile || member.profiles || {};
    const name = member.name || member.displayName || member.display_name || profile.display_name || member.email || profile.email || 'Team member';
    const email = member.email || profile.email || '';
    const role = member.role === 'owner' ? '老板' : '销售';
    return `<div class="team-row"><div class="avatar ${member.role === 'owner' ? 'owner' : ''}">${esc(name.slice(0, 1).toUpperCase())}</div><div><strong>${esc(name)}</strong><span>${esc(email)}</span></div><span class="role-tag ${member.role === 'owner' ? '' : 'light'}">${role}</span></div>`;
  }).join('');
}

function renderRules() {
  const rules = runtime.rules;
  if (!rules) {
    if (!isSupabaseMode()) {
      $('#productInput').value = 'Premium custom kitchens';
      $('#serviceAreasInput').value = 'Peninsular Malaysia and Singapore';
      $('#minimumBudgetInput').value = '15000';
      $('#ruleCurrencyInput').value = 'MYR';
      $('#qualificationCriteriaInput').value = 'Kitchen size or floor plan is provided; budget meets the requirement; purchase is expected within 3 months.';
      $('#conversionStandardInput').value = 'deposit_paid';
      $('#saveRulesBtn').disabled = false;
      $('#saveRulesBtn').title = '';
    } else {
      $('#saveRulesBtn').disabled = true;
      $('#saveRulesBtn').title = '请先建立公司空间';
    }
    return;
  }
  $('#productInput').value = rules.productService || rules.product_service || '';
  const areas = rules.serviceAreas || rules.service_areas || [];
  $('#serviceAreasInput').value = Array.isArray(areas) ? areas.join(', ') : areas;
  $('#minimumBudgetInput').value = rules.minBudget ?? rules.min_budget ?? '';
  $('#ruleCurrencyInput').value = rules.currency || 'MYR';
  $('#qualificationCriteriaInput').value = rules.qualificationCriteria || rules.qualification_criteria || '';
  $('#conversionStandardInput').value = rules.conversionStandard || rules.conversion_standard || 'deposit_paid';
  const isOwner = runtime.context?.membership?.role === 'owner';
  $('#saveRulesBtn').disabled = isSupabaseMode() && !isOwner;
  $('#saveRulesBtn').title = isSupabaseMode() && !isOwner ? '只有老板可以修改业务规则' : '';
}

function renderAll() {
  populateFilters();
  renderAds();
  renderCustomerList();
  renderCustomerDetail();
  renderCallbacks();
  renderChart();
  updateMetrics();
  renderTeam();
  renderRules();
  updateModeUi();
}

function csvCell(value) {
  const text = String(value ?? '');
  const protectedText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${protectedText.replaceAll('"', '""')}"`;
}

function exportCsv(type) {
  let rows = [];
  if (type === 'customers') {
    rows = [['客户编号','姓名','号码','质量','阶段','负责人','广告来源','点击识别码'], ...customers.map(customer => [customer.id, customer.name, customer.phone, customer.quality, customer.stage, customer.owner, adById(customer.adId).name, customer.clickId || '未知'])];
  } else if (type === 'orders') {
    rows = [['订单编号','客户','金额','币种','付款状态','付款时间','是否符合回传标准'], ...customers.flatMap(customer => ordersFor(customer).map(order => [order.orderNumber, customer.name, order.amount, order.currency, orderStatusLabel(order.paymentStatus), fmtDate(order.qualifyingPaymentAt), order.conversionEligible ? '是' : '否']))];
  } else {
    rows = [['记录','订单','客户','事件','金额','状态','原因'], ...callbacks.map(callback => [callback.id, callback.order, callback.customer, callback.event, callback.amount, callbackStatusLabel(callback.status), callback.note])];
  }
  const csv = '\ufeff' + rows.map(row => row.map(csvCell).join(',')).join('\n');
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  anchor.download = `flowtrace-${type}.csv`;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
  showToast('已导出 CSV；不包含任何密钥');
}

function setDemoMode(reason, severity = 'normal') {
  const demo = createDemoData();
  ({ ads, customers, callbacks, spendRows } = demo);
  runtime.mode = severity === 'error' ? 'fallback' : 'demo';
  runtime.reason = reason;
  runtime.context = null;
  runtime.rules = null;
  runtime.members = [];
  runtime.integrations = [];
  runtime.lastSync = new Date();
  runtime.needsOrganization = false;
  selectedCustomer = null;
  renderAll();
}

function applyWorkspaceData(workspace, context) {
  runtime.context = workspace.context || context || runtime.context;
  runtime.rules = workspace.activeRule || workspace.businessRules || workspace.business_rules || null;
  runtime.members = workspace.members || workspace.team || [];
  runtime.integrations = workspace.integrations || [];
  runtime.needsOrganization = false;
  ads = (workspace.ads || []).map(normalizeAd);
  customers = (workspace.customers || []).map(normalizeCustomer);
  callbacks = (workspace.callbacks || workspace.metaEvents || workspace.meta_events || []).map(normalizeCallback);
  spendRows = workspace.raw?.spendRows || workspace.spendRows || [];
  runtime.mode = customers.length || ads.some(ad => ad.id !== 'unknown') || callbacks.length ? 'supabase' : 'supabase-empty';
  runtime.reason = '已连接 Supabase';
  runtime.lastSync = new Date();
}

function updateModeUi() {
  const badge = $('#dataModeBadge');
  badge.classList.remove('live', 'warning', 'error');
  const statusTag = $('#supabaseStatusTag');
  const sidebarStatus = $('#sidebarSupabaseStatus');
  statusTag.className = 'status-tag gray';
  sidebarStatus.className = 'pill gray';
  if (isSupabaseMode()) {
    badge.classList.add('live');
    $('#dataModeText').textContent = runtime.mode === 'supabase-empty' ? 'Supabase 已连接 · 暂无数据' : 'Supabase 在线数据';
    statusTag.textContent = '已连接';
    statusTag.className = 'status-tag teal';
    sidebarStatus.textContent = '已连接';
    sidebarStatus.className = 'pill teal';
    $('#supabasePanelState').textContent = '在线';
    $('#supabasePanelState').className = 'mode-chip live';
    $('#connectionModeHelp').textContent = '客户、广告、订单和审计记录正在从 Supabase 读取。WhatsApp、AI 与 Meta 外发仍是独立的服务端接入。';
  } else {
    const fallback = runtime.mode === 'fallback';
    badge.classList.add(fallback ? 'error' : 'warning');
    $('#dataModeText').textContent = fallback ? '连接失败 · 使用模拟数据' : `演示模式 · ${runtime.reason}`;
    statusTag.textContent = fallback ? '连接异常' : runtime.session ? '待建立公司' : statusData().configured ? '等待登录' : '未配置';
    statusTag.className = `status-tag ${fallback ? 'red' : 'gray'}`;
    sidebarStatus.textContent = statusTag.textContent;
    sidebarStatus.className = `pill ${fallback ? 'red' : 'gray'}`;
    $('#supabasePanelState').textContent = fallback ? '连接异常' : '演示回退';
    $('#supabasePanelState').className = `mode-chip ${fallback ? 'error' : ''}`;
  }
  const user = runtime.session?.user;
  const displayName = runtime.context?.profile?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Mr. Lin';
  $('#currentUserName').textContent = displayName;
  $('#currentUserAvatar').textContent = displayName.slice(0, 1).toUpperCase();
  $('#currentUserRole').textContent = runtime.context?.membership?.role === 'owner' ? '老板' : runtime.context?.membership?.role === 'sales' ? '销售' : user ? '已登录' : '演示管理员';
  $('#lastSyncAt').textContent = (runtime.lastSync || new Date()).toLocaleString('zh-CN', { hour12: false });
  updateAuthUi();
}

function updateAuthUi() {
  const loggedIn = Boolean(runtime.session?.user);
  $('#supabaseAuthLoggedOut').classList.toggle('hidden', loggedIn);
  $('#supabaseAuthLoggedIn').classList.toggle('hidden', !loggedIn);
  if (loggedIn) {
    $('#supabaseSessionEmail').textContent = runtime.session.user.email || '已登录';
    $('#supabaseOrganizationLabel').textContent = runtime.context?.organization?.name || '尚未建立公司空间';
    $('#organizationOnboarding').classList.toggle('hidden', !runtime.needsOrganization);
  }
}

async function requireOk(promise) {
  const result = await promise;
  if (result?.ok === false) {
    const error = new Error(result.error?.message || result.message || 'Supabase 操作失败');
    error.code = result.error?.code;
    throw error;
  }
  return result?.data ?? result;
}

function friendlyError(error) {
  return error?.message || error?.error_description || String(error || '未知错误');
}

async function refreshWorkspace({ quiet = false, preserveCustomer = null } = {}) {
  if (runtime.loading) return;
  const adapter = api();
  if (!adapter) {
    setDemoMode('Supabase 客户端未加载', 'error');
    return;
  }
  runtime.loading = true;
  $('#syncDataBtn').disabled = true;
  try {
    const statusResult = await Promise.resolve(adapter.getStatus?.() || {});
    const configured = Boolean(statusResult?.ok && statusResult.data?.configured);
    if (!configured) {
      runtime.session = null;
      setDemoMode('Supabase 尚未配置');
      return;
    }
    const initData = await requireOk(adapter.init());
    runtime.session = initData?.session || await requireOk(adapter.getSession());
    if (!runtime.session?.user) {
      setDemoMode('等待 Supabase 登录');
      return;
    }
    const contextResult = await adapter.loadCurrentContext();
    if (!contextResult.ok && contextResult.error?.code === 'no_organization') {
      runtime.context = { user: runtime.session.user, profile: null, organization: null, membership: null };
      ads = [];
      customers = [];
      callbacks = [];
      spendRows = [];
      runtime.mode = 'supabase-empty';
      runtime.reason = '首次使用，请建立公司空间';
      runtime.needsOrganization = true;
      runtime.lastSync = new Date();
      renderAll();
      return;
    }
    const context = await requireOk(Promise.resolve(contextResult));
    runtime.context = context;
    const workspace = await requireOk(adapter.loadWorkspaceData({ organizationId: context.organization.id }));
    applyWorkspaceData(workspace, context);
    selectedCustomer = preserveCustomer && customers.some(customer => customer.id === preserveCustomer) ? preserveCustomer : selectedCustomer && customers.some(customer => customer.id === selectedCustomer) ? selectedCustomer : null;
    renderAll();
    if (!quiet) showToast('已从 Supabase 同步最新数据');
  } catch (error) {
    setDemoMode(`Supabase 连接失败：${friendlyError(error)}`, 'error');
    setConnectionFeedback(`连接失败：${friendlyError(error)}`, 'error');
  } finally {
    runtime.loading = false;
    $('#syncDataBtn').disabled = false;
  }
}

function setConnectionFeedback(message, type = '') {
  const feedback = $('#supabaseFeedback');
  feedback.textContent = message;
  feedback.className = `connection-feedback ${type}`.trim();
}

async function saveSupabaseConfig() {
  const url = $('#supabaseUrlInput').value.trim();
  const publishableKey = $('#supabaseKeyInput').value.trim();
  const button = $('#saveSupabaseConfigBtn');
  try {
    button.disabled = true;
    const result = await Promise.resolve(api().saveLocalConfig({ url, publishableKey }));
    if (result?.ok === false) throw new Error(result.error?.message || result.message || '配置无效');
    setConnectionFeedback('配置已保存在当前浏览器，正在测试连接。', 'success');
    $('#supabaseKeyInput').value = '';
    await refreshWorkspace({ quiet: true });
  } catch (error) {
    setConnectionFeedback(`配置失败：${friendlyError(error)}`, 'error');
  } finally {
    button.disabled = false;
  }
}

async function clearSupabaseConfig() {
  try { await api()?.signOut?.(); } catch (_) { /* Ignore logout failure while clearing local config. */ }
  api()?.clearLocalConfig?.();
  runtime.session = null;
  $('#supabaseUrlInput').value = '';
  $('#supabaseKeyInput').value = '';
  setConnectionFeedback('本机 Supabase 配置已清除。');
  setDemoMode('Supabase 尚未配置');
}

async function loginSupabase() {
  const email = $('#supabaseEmailInput').value.trim();
  const password = $('#supabasePasswordInput').value;
  const button = $('#supabaseLoginBtn');
  try {
    button.disabled = true;
    const result = await requireOk(api().signInWithPassword(email, password));
    runtime.session = result?.session || null;
    setConnectionFeedback('登录成功，正在载入公司数据。', 'success');
    await refreshWorkspace({ quiet: true });
  } catch (error) {
    setConnectionFeedback(`登录失败：${friendlyError(error)}`, 'error');
  } finally {
    button.disabled = false;
  }
}

async function signupSupabase() {
  const email = $('#supabaseEmailInput').value.trim();
  const password = $('#supabasePasswordInput').value;
  const button = $('#supabaseSignupBtn');
  try {
    if (!api().signUpWithPassword) throw new Error('当前适配器未开放注册，请先在 Supabase Authentication 创建用户');
    button.disabled = true;
    const result = await requireOk(api().signUpWithPassword(email, password));
    runtime.session = result?.session || null;
    setConnectionFeedback(runtime.session ? '账户已建立，正在载入。' : '账户已建立；请按 Supabase 邮件完成验证后再登录。', 'success');
    if (runtime.session) await refreshWorkspace({ quiet: true });
  } catch (error) {
    setConnectionFeedback(`创建账户失败：${friendlyError(error)}`, 'error');
  } finally {
    button.disabled = false;
  }
}

async function logoutSupabase() {
  try {
    await requireOk(api().signOut());
    runtime.session = null;
    setDemoMode('已退出 Supabase，当前显示模拟数据');
    setConnectionFeedback('已退出登录；项目配置仍保存在当前浏览器。');
  } catch (error) {
    showToast(`退出失败：${friendlyError(error)}`);
  }
}

async function createOrganization() {
  const name = $('#organizationNameInput').value.trim();
  const defaultCurrency = $('#organizationCurrencyInput').value;
  const button = $('#createOrganizationBtn');
  try {
    button.disabled = true;
    await requireOk(api().createOrganization({ name, defaultCurrency }));
    await refreshWorkspace({ quiet: true });
    showToast('公司空间已建立，当前账户是老板');
  } catch (error) {
    showToast(`建立失败：${friendlyError(error)}`);
  } finally {
    button.disabled = false;
  }
}

async function saveBusinessRules() {
  const button = $('#saveRulesBtn');
  const payload = {
    organizationId: runtime.context?.organization?.id,
    productService: $('#productInput').value.trim(),
    serviceAreas: $('#serviceAreasInput').value.split(',').map(value => value.trim()).filter(Boolean),
    minBudget: $('#minimumBudgetInput').value === '' ? null : Number($('#minimumBudgetInput').value),
    currency: $('#ruleCurrencyInput').value,
    qualificationCriteria: $('#qualificationCriteriaInput').value.trim(),
    conversionStandard: $('#conversionStandardInput').value
  };
  try {
    button.disabled = true;
    if (isSupabaseMode() && runtime.context?.organization) {
      await requireOk(api().saveBusinessRules(payload));
      await refreshWorkspace({ quiet: true });
      $('#saveState').textContent = '刚刚保存到 Supabase';
      showToast('业务规则新版本已保存到 Supabase');
    } else {
      $('#saveState').textContent = '演示规则已暂存';
      showToast('当前为演示模式；规则只保留在本次页面会话');
    }
  } catch (error) {
    showToast(`保存失败：${friendlyError(error)}`);
  } finally {
    button.disabled = false;
  }
}

function openSupabaseSettings() {
  setView('settings');
  const tab = $('[data-settings="connections"]');
  tab.click();
  $('#supabasePanel').classList.add('open');
  $('#toggleSupabasePanelBtn').textContent = '收起';
  $('#supabasePanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function wireEvents() {
  $$('.nav-item,[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
  $('#customerSearch').addEventListener('input', event => { filters.search = event.target.value; renderCustomerList(); });
  $('#qualityFilter').addEventListener('change', event => { filters.quality = event.target.value; renderCustomerList(); });
  $('#stageFilter').addEventListener('change', event => { filters.stage = event.target.value; renderCustomerList(); });
  $('#customerOwnerFilter').addEventListener('change', event => { filters.owner = event.target.value; renderCustomerList(); });
  const refreshOverview = () => { renderAds(); updateMetrics(); renderChart(); };
  $('#dateFilter').addEventListener('change', event => { overviewFilters.days = event.target.value; refreshOverview(); });
  $('#adFilter').addEventListener('change', event => { overviewFilters.ad = event.target.value; refreshOverview(); });
  $('#chartAdFilter').addEventListener('change', event => {
    overviewFilters.ad = event.target.value;
    $('#adFilter').value = overviewFilters.ad;
    refreshOverview();
  });
  $('#ownerFilter').addEventListener('change', event => { overviewFilters.owner = event.target.value; refreshOverview(); });
  $('#clearFilter').onclick = () => {
    $('#dateFilter').value = '30';
    $('#adFilter').value = 'all';
    $('#chartAdFilter').value = 'all';
    $('#ownerFilter').value = 'all';
    overviewFilters = { days: '30', ad: 'all', owner: 'all' };
    refreshOverview();
    showToast('筛选条件已清除');
  };
  $('#retryAllBtn').onclick = () => {
    if (isSupabaseMode()) {
      showToast('真实重试必须由服务端队列执行，页面不会伪造成功状态');
      return;
    }
    callbacks.filter(callback => callback.status === 'failed').forEach(callback => {
      callback.status = 'success';
      callback.time = 'Just now';
      callback.note = 'Simulated retry success · Not sent to Meta';
    });
    renderCallbacks();
    showToast('模拟失败事件已重试；未发送到 Meta');
  };
  $('#exportBtn').onclick = () => exportCsv('customers');
  $('#newLeadBtn').onclick = () => showToast(isSupabaseMode() ? '新客户应由 WhatsApp Webhook 或受控导入建立' : '演示版不会向真实 WhatsApp 建立客户');
  $('#openFollowupCustomerBtn').onclick = event => {
    const preferred = customers.find(customer => customer.id === event.currentTarget.dataset.customer);
    if (!preferred) return showToast('当前没有需要优先跟进的客户');
    selectedCustomer = preferred.id;
    setView('customers');
    renderCustomerList();
    renderCustomerDetail();
  };
  $$('.settings-tab').forEach(tab => tab.onclick = () => {
    $$('.settings-tab').forEach(item => item.classList.remove('active'));
    $$('.settings-pane').forEach(item => item.classList.remove('active'));
    tab.classList.add('active');
    $(`#settings-${tab.dataset.settings}`).classList.add('active');
  });
  $$('[data-guide-target]').forEach(button => button.onclick = () => {
    const guide = $(`#guide-${button.dataset.guideTarget}`);
    if (!guide) return;
    guide.open = true;
    guide.scrollIntoView({ behavior: 'smooth', block: 'start' });
    showToast('已展开接入教程');
  });
  $('#saveRulesBtn').onclick = saveBusinessRules;
  $$('.export-option').forEach(button => button.onclick = () => exportCsv(button.dataset.export));
  $('#syncDataBtn').onclick = () => refreshWorkspace();
  $('#userMenuButton').onclick = openSupabaseSettings;
  $('#toggleSupabasePanelBtn').onclick = () => {
    $('#supabasePanel').classList.toggle('open');
    $('#toggleSupabasePanelBtn').textContent = $('#supabasePanel').classList.contains('open') ? '收起' : '配置';
  };
  $('#saveSupabaseConfigBtn').onclick = saveSupabaseConfig;
  $('#clearSupabaseConfigBtn').onclick = clearSupabaseConfig;
  $('#supabaseLoginBtn').onclick = loginSupabase;
  $('#supabaseSignupBtn').onclick = signupSupabase;
  $('#supabaseLogoutBtn').onclick = logoutSupabase;
  $('#createOrganizationBtn').onclick = createOrganization;
  $('#addTeamMemberBtn').onclick = () => showToast('现有数据库已支持老板/销售权限；邮箱邀请流程仍需服务端实现');
}

document.addEventListener('DOMContentLoaded', async () => {
  wireEvents();
  renderAll();
  const storedStatus = statusData();
  if (storedStatus.projectUrl) $('#supabaseUrlInput').value = storedStatus.projectUrl;
  await refreshWorkspace({ quiet: true });
});

window.FlowTraceApp = {
  refreshWorkspace,
  getState: () => ({ mode: runtime.mode, reason: runtime.reason, customerCount: customers.length, adCount: ads.length, callbackCount: callbacks.length })
};
