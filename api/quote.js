// Native fetch is available in Node 18+ (Vercel Default)

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    const symbols = req.body?.symbols || ['ITC', 'TATASTEEL', 'HDFCBANK', 'RELIANCE'];
    const quotes = {};

    // Prepare symbols
    const validSymbols = symbols.map(rawSym => {
      let clean = rawSym.toUpperCase().replace('-E', '').replace('.NS', '').trim();
      if (clean.includes('GOLDBEES')) clean = 'GOLDBEES';
      if (clean.includes('ITBEES')) clean = 'ITBEES';
      if (clean.includes('MON100')) clean = 'MON100';
      return { rawSym, querySym: `${clean}.NS` };
    });

    // Batch requests into chunks of 20 to avoid URL length issues and rate limiting
    const chunkSize = 20;
    for (let i = 0; i < validSymbols.length; i += chunkSize) {
      const chunk = validSymbols.slice(i, i + chunkSize);
      const queryStr = chunk.map(s => s.querySym).join(',');
      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${queryStr}`;

      try {
        const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' } });
        if (resp.ok) {
          const json = await resp.json();
          const results = json?.quoteResponse?.result || [];
          
          results.forEach(quoteData => {
            // Find corresponding raw symbol
            const match = chunk.find(s => s.querySym === quoteData.symbol);
            if (match && quoteData.regularMarketPrice) {
              const price = quoteData.regularMarketPrice;
              const prevClose = quoteData.regularMarketPreviousClose || price;
              const dayChange = price - prevClose;
              const dayChangePercent = prevClose > 0 ? (dayChange / prevClose) * 100 : 0;

              quotes[match.rawSym] = {
                price: parseFloat(price.toFixed(2)),
                previousClose: parseFloat(prevClose.toFixed(2)),
                dayChange: parseFloat(dayChange.toFixed(2)),
                dayChangePercent: parseFloat(dayChangePercent.toFixed(2))
              };
            }
          });
        }
      } catch (e) {
        console.error("Batch fetch error for chunk", i, e);
      }
    }

    return res.status(200).json({ success: true, mode: 'Live Market Quotes API (Batched)', quotes });
  } catch (err) {
    return res.status(500).json({ error: 'Quote Error: ' + err.message });
  }
};
