// TEMPORARY: checks the free Gold-API copper endpoint (removed after the check).
module.exports = async (req, res) => {
  const out = {};
  for (const sym of ['HG', 'XCU', 'HG/INR']) {
    try {
      const r = await fetch('https://api.gold-api.com/price/' + sym, { headers: { Accept: 'application/json' } });
      out[sym] = { status: r.status, cors: r.headers.get('access-control-allow-origin'), body: (await r.text()).slice(0, 400) };
    } catch (e) { out[sym] = { error: String(e) }; }
  }
  try { const r = await fetch('https://api.gold-api.com/symbols'); out.symbols = { status: r.status, body: (await r.text()).slice(0, 1500) }; } catch (e) { out.symbols = { error: String(e) }; }
  res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(out, null, 1));
};
