// Gold Calculator — Tamil Nadu (Chennai) 22K / 916 jewellery rate, ₹ per gram.
// Runs on Vercel so the page and the Android app can read public rate pages that a
// browser itself is not allowed to fetch (no CORS). Tries each source in turn and
// returns the first plausible, recent value. Add ?debug=1 to see every source's result.

const MONTHS = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };

function toText(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&rsquo;|&#8217;/gi, "'")
    .replace(/\s+/g, ' ');
}
const num = (s) => { const n = Number(String(s || '').replace(/,/g, '')); return Number.isFinite(n) ? n : null; };

// "18 Nov 2026", "28 October, 2026", "18th November 2026" -> Date (UTC midnight)
function parseDate(s) {
  const m = /(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})/.exec(String(s || ''));
  if (!m) return null;
  const mon = MONTHS[m[2].slice(0, 3).toLowerCase()];
  if (mon === undefined) return null;
  return new Date(Date.UTC(Number(m[3]), mon, Number(m[1])));
}

const SOURCES = [
  {
    name: 'BankBazaar · Chennai',
    url: 'https://www.bankbazaar.com/gold-rate-chennai.html',
    parse(t) {
      const m = /₹\s*([1-9][0-9,]{3,7})\s*\/\s*1\s*gram\s*\(\s*22K\s*\)/i.exec(t);
      const d = /Updated On\s*-?\s*(\d{1,2}\s+[A-Za-z]{3,9},?\s+\d{4})/i.exec(t);
      return { rate: m ? num(m[1]) : null, date: d ? d[1] : null };
    },
  },
  {
    name: 'Goodreturns · Chennai',
    url: 'https://www.goodreturns.in/gold-rates/chennai.html',
    parse(t) {
      const m = /₹\s*([1-9][0-9,]{3,7})(?:\.\d+)?\s*per gram for 22 karat/i.exec(t);
      return { rate: m ? num(m[1]) : null, date: null };
    },
  },
  {
    name: '5paisa · Chennai',
    url: 'https://www.5paisa.com/commodity-trading/gold/chennai',
    parse(t) {
      const m = /22K Gold\s*\/\s*10\s*gm\s*As on\s*(\d{1,2}\s+[A-Za-z]{3,9},?\s+\d{4})\s*₹\s*([1-9][0-9,]{4,9})/i.exec(t);
      return { rate: m ? Math.round(num(m[2]) / 10) : null, date: m ? m[1] : null };
    },
  },
];

async function trySource(src) {
  const started = Date.now();
  try {
    const r = await fetch(src.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 14; SM-S901E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-IN,en;q=0.9',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return { source: src.name, ok: false, error: 'HTTP ' + r.status, ms: Date.now() - started };
    const { rate, date } = src.parse(toText(await r.text()));
    if (!rate) return { source: src.name, ok: false, error: 'rate not found', ms: Date.now() - started };
    if (rate < 3000 || rate > 60000) return { source: src.name, ok: false, error: 'implausible ' + rate, ms: Date.now() - started };
    const asOf = parseDate(date);
    if (asOf && Date.now() - asOf.getTime() > 4 * 86400000) {
      return { source: src.name, ok: false, error: 'stale (' + date + ')', rate, ms: Date.now() - started };
    }
    return { source: src.name, ok: true, rate, asOf: asOf ? asOf.toISOString().slice(0, 10) : null, url: src.url, ms: Date.now() - started };
  } catch (e) {
    return { source: src.name, ok: false, error: String((e && e.name) || e), ms: Date.now() - started };
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  const debug = /(^|[?&])debug=1(&|$)/.test(req.url || '');
  const tried = [];
  for (const src of SOURCES) {
    const r = await trySource(src);
    tried.push(r);
    if (r.ok && !debug) break;
  }
  const best = tried.find((r) => r.ok);
  if (!best) {
    res.statusCode = 502;
    res.setHeader('Cache-Control', 'no-store');
    return res.end(JSON.stringify({ ok: false, error: 'No source returned a usable 22K rate', tried }));
  }
  res.statusCode = 200;
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800');
  const body = { ok: true, rate: best.rate, unit: 'INR/g', purity: '22K/916', region: 'Tamil Nadu (Chennai)', source: best.source, sourceUrl: best.url, asOf: best.asOf, fetchedAt: new Date().toISOString() };
  if (debug) body.tried = tried;
  res.end(JSON.stringify(body));
};
