// Worker: /api/capi -> Meta Conversions API. Решту запитів віддає статика.
const PIXEL_ID = '1282596818602598';
const GRAPH = 'https://graph.facebook.com/v21.0/';
const OK = ['Lead', 'AddToCart', 'InitiateCheckout', 'Contact', 'ViewContent', 'AddToWishlist'];

function cookie(h, k) {
  const m = (h || '').match(new RegExp('(?:^|; )' + k + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : undefined;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/capi') return env.ASSETS.fetch(request);
    if (request.method !== 'POST' || !env.META_CAPI_TOKEN) return new Response(null, { status: 204 });
    // не відправляємо, якщо користувач відмовився від трекінгу
    const ck = request.headers.get('cookie') || '';
    if (cookie(ck, 'blitz_an') === 'no') return new Response(null, { status: 204 });
    let d;
    try { d = JSON.parse(await request.text()); } catch (e) { return new Response(null, { status: 400 }); }
    if (!d || OK.indexOf(d.n) < 0) return new Response(null, { status: 400 });
    const user = {
      client_ip_address: request.headers.get('cf-connecting-ip') || undefined,
      client_user_agent: request.headers.get('user-agent') || undefined,
      fbp: d.fbp || cookie(ck, '_fbp'),
      fbc: d.fbc || cookie(ck, '_fbc'),
    };
    const payload = {
      data: [{
        event_name: d.n,
        event_time: Math.floor(Date.now() / 1000),
        event_id: String(d.id || '').slice(0, 64),
        event_source_url: String(d.u || '').slice(0, 500),
        action_source: 'website',
        user_data: user,
        custom_data: d.p && typeof d.p === 'object' ? d.p : undefined,
      }],
    };
    const r = await fetch(GRAPH + PIXEL_ID + '/events?access_token=' + encodeURIComponent(env.META_CAPI_TOKEN), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return new Response(null, { status: r.ok ? 204 : 502 });
  },
};
