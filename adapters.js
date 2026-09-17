/*
 * Replaceable integration boundaries for the demo.
 * The browser demo uses local mock data and never sends network requests.
 * In production, these interfaces should be implemented server-side.
 */
window.FlowTraceAdapters = {
  whatsapp: {
    mode: 'demo',
    normalizeWebhook(payload) {
      return { externalMessageId: payload?.message_id || null, phone: payload?.from || null, text: payload?.text || '' };
    },
    sendMessage() { return { sent: false, reason: '演示模式禁止向真实客户发送消息' }; }
  },
  ai: {
    mode: 'demo',
    analyze({ rules, chat }) {
      const text = String(chat || '');
      const hasBudget = /RM|预算|\$/.test(text);
      const hasTiming = /个月|时间|入住|购买/.test(text);
      return {
        quality: hasBudget && hasTiming ? '合格' : '待了解',
        priority: hasBudget && hasTiming ? '高' : '中',
        reason: hasBudget && hasTiming ? `符合当前规则：${rules || '已配置分类规则'}` : '信息不足，暂不强行判断',
        evidence: text.slice(0, 120)
      };
    }
  },
  orders: {
    mode: 'demo',
    idempotencyKey(order) { return `${order.customerId || ''}:${order.orderId || ''}`; },
    validate(order) { return Boolean(order?.orderId && Number(order?.amount) > 0 && order?.currency && order?.orderTime); }
  },
  meta: {
    mode: 'demo',
    buildPurchaseEvent(order) {
      return { event_name: 'Purchase', event_id: order?.eventId || null, value: order?.amount || null, currency: order?.currency || null, sent: false, reason: '演示模式不会发送到 Meta' };
    },
    send() { return { sent: false, status: 'simulated', reason: '演示模式不会发送到 Meta' }; }
  }
};
