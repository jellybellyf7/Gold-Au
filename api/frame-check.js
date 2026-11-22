// Temporary diagnostic: reports whether each URL allows being shown in an iframe (X-Frame-Options / CSP frame-ancestors).
const URLS = [
  'https://www.pngjewellers.com/pages/metal-rates',
  'https://www.thangamayil.com/scheme/index/rateshistory/',
  'https://www.coinbazaar.in/174-buy-platinum-bars',
  'https://augmont.com/live-rates?metal=platinum',
  'https://www.bangalorerefinery.com/products/10-gram-platinum-bar-999-purity',
  'https://www.bangalorerefinery.com/pages/todays-rates',
  'https://pureplatinumweb.myshopify.com/collections/bullion',
  'https://www.cwja.org.in/', 'https://coimbatorejewellery.org/', 'https://www.ksjf.in/'
];
module.exports = async (req, res) => {
  const out = await Promise.all(URLS.map(async (u) => {
    try {
      const r = await fetch(u, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36', accept: 'text/html' } });
      const xfo = r.headers.get('x-frame-options'); const csp = r.headers.get('content-security-policy') || '';
      const fa = (csp.match(/frame-ancestors[^;]*/i) || [''])[0];
      return { u, status: r.status, final: r.url, xfo, frameAncestors: fa };
    } catch (e) { return { u, error: String(e && e.message || e) }; }
  }));
  res.setHeader('content-type', 'application/json'); res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(out, null, 1));
};
