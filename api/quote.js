const fetch = require('node-fetch');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    const symbols = req.body?.symbols || ['ITC', 'TATASTEEL', 'HDFCBANK', 'RELIANCE'];
    const quotes = {};

    await Promise.all(symbols.map(async (rawSym) => {
      try {
        let clean = rawSym.toUpperCase().replace('-E', '').replace('.NS', '').trim();
        if (clean.includes('GOLDBEES')) clean = 'GOLDBEES';
        if (clean.includes('ITBEES')) clean = 'ITBEES';
        if (clean.includes('MON100')) clean = 'MON100';

        const querySym = `${clean}.NS`;
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${querySym}?interval=1m&range=1d`;
        const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' } });
        if (resp.ok) {
          const json = await resp.json();
          const meta = json?.chart?.result?.[0]?.meta;
          if (meta && meta.regularMarketPrice) {
            const price = meta.regularMarketPrice;
            const prevClose = meta.chartPreviousClose || meta.previousClose || price;
            const dayChange = price - prevClose;
            const dayChangePercent = prevClose > 0 ? (dayChange / prevClose) * 100 : 0;

            quotes[rawSym] = {
              price: parseFloat(price.toFixed(2)),
              previousClose: parseFloat(prevClose.toFixed(2)),
              dayChange: parseFloat(dayChange.toFixed(2)),
              dayChangePercent: parseFloat(dayChangePercent.toFixed(2))
            };
          }
        }
      } catch (e) {}
    }));

    return res.status(200).json({ success: true, mode: 'Live Market Quotes API', quotes });
  } catch (err) {
    return res.status(500).json({ error: 'Quote Error: ' + err.message });
  }
};
