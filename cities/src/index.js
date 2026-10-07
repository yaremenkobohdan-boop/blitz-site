// Один Worker обслуговує всі міські лендінги: піддомен -> папка sites/<піддомен>.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const slug = url.hostname.split('.')[0];
    if (!/^[a-z-]+$/.test(slug) || slug === 'blitz-cities') return new Response('Not found', { status: 404 });
    const u = new URL(request.url);
    u.pathname = '/' + slug + (url.pathname === '/' ? '/' : url.pathname);
    const res = await env.ASSETS.fetch(new Request(u, request));
    if (res.status === 404) return new Response('Not found', { status: 404 });
    return res;
  },
};
