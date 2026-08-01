const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 5003;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const MAJOR_MACRO_SECTORS = [
  { sector: 'Defence & Aerospace', searchKeywords: ['HAL.NS', 'BEL.NS', 'BDL.NS'], horizonTag: 'Short-Term', risk: 'Moderate Risk' },
  { sector: 'Infrastructure & Capex', searchKeywords: ['LT.NS', 'PNCINFRA.NS', 'ULTRACEMCO.NS'], horizonTag: 'Short-Term', risk: 'Low-Moderate' },
  { sector: 'Power & Renewable Energy', searchKeywords: ['NTPC.NS', 'TATAPOWER.NS', 'SUZLON.NS'], horizonTag: 'Short-Term', risk: 'Low Risk' },
  { sector: 'Broad Market Index ETF', searchKeywords: ['NIFTYBEES.NS'], horizonTag: 'Long-Term', risk: 'Low Risk' },
  { sector: 'Global Technology ETF', searchKeywords: ['MON100.NS'], horizonTag: 'Long-Term', risk: 'Moderate Risk' },
  { sector: 'Pharma & Healthcare', searchKeywords: ['SUNPHARMA.NS', 'CIPLA.NS', 'DRREDDY.NS'], horizonTag: 'Long-Term', risk: 'Low-Moderate' },
  { sector: 'IT & Software', searchKeywords: ['TCS.NS', 'INFY.NS', 'TECHM.NS'], horizonTag: 'Long-Term', risk: 'Low-Moderate' }
];

app.get('/health', (req, res) => {
  res.json({ service: 'Recommendation Microservice', status: 'UP', port: PORT, mode: '100% Live Market API Screener', timestamp: new Date().toISOString() });
});

app.post('/recommendations', async (req, res) => {
  try {
    const holdings = req.body?.holdings || [];
    const ownedSymbols = new Set(holdings.map(h => h.symbol.toUpperCase().replace('-E', '').replace('.NS', '').trim()));
    const ownedSectors = new Set(holdings.map(h => h.sector));

    const missingSectors = [];
    MAJOR_MACRO_SECTORS.forEach(secObj => {
      if (!ownedSectors.has(secObj.sector)) {
        missingSectors.push(secObj.sector);
      }
    });

    const liveRecommendations = [];
    for (const secObj of MAJOR_MACRO_SECTORS) {
      const isMissing = missingSectors.includes(secObj.sector);
      for (const rawSym of secObj.searchKeywords) {
        const cleanSym = rawSym.replace('.NS', '').toUpperCase();
        if (ownedSymbols.has(cleanSym) || ownedSymbols.has(`${cleanSym}-E`)) continue;

        try {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${rawSym}?interval=1m&range=1d`;
          const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
          if (resp.ok) {
            const json = await resp.json();
            const meta = json?.chart?.result?.[0]?.meta;
            if (meta && meta.regularMarketPrice) {
              const livePrice = meta.regularMarketPrice;
              const prevClose = meta.chartPreviousClose || meta.previousClose || livePrice;
              const fiftyTwoWkHigh = meta.fiftyTwoWeekHigh || (livePrice * 1.15);
              const fiftyTwoWkLow = meta.fiftyTwoWeekLow || (livePrice * 0.85);

              const upsidePct = livePrice > 0 ? (((fiftyTwoWkHigh - livePrice) / livePrice) * 100) : 15;
              const formattedPotential = isMissing
                ? `${Math.max(12, Math.round(upsidePct))}% - ${Math.max(20, Math.round(upsidePct + 8))}% Upside`
                : `${Math.max(12, Math.round(upsidePct))}% CAGR`;

              const shortName = meta.shortName || meta.longName || cleanSym;

              liveRecommendations.push({
                symbol: cleanSym,
                name: shortName,
                horizon: secObj.horizonTag === 'Short-Term' ? 'Short-Term (6-18 Mos)' : 'Long-Term (3-10 Yrs)',
                horizonTag: secObj.horizonTag,
                sector: secObj.sector,
                category: isMissing ? `Live Gap Play: ${secObj.sector}` : secObj.horizonTag === 'Short-Term' ? 'Tactical Stock' : 'Core Compounder',
                price: parseFloat(livePrice.toFixed(2)),
                fiftyTwoWeekHigh: parseFloat(fiftyTwoWkHigh.toFixed(2)),
                fiftyTwoWeekLow: parseFloat(fiftyTwoWkLow.toFixed(2)),
                risk: secObj.risk,
                potential: formattedPotential,
                rationale: `Live API Screener: Dynamically queried market leader for ${secObj.sector}. Currently trading at ₹${livePrice.toFixed(2)} (52-Wk Range: ₹${fiftyTwoWkLow.toFixed(0)} - ₹${fiftyTwoWkHigh.toFixed(0)}).`,
                tags: [`Live API: ${cleanSym}`, isMissing ? 'Missing Sector Gap' : 'Market Leader', secObj.horizonTag],
                priorityScore: isMissing ? 10 : 5
              });
            }
          }
        } catch (e) {}
      }
    }

    const averageDownCandidates = [];
    holdings.forEach(item => {
      const invested = item.qty * item.avgCost;
      const curr = item.qty * item.ltp;
      const pnl = curr - invested;
      const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;
      if (pnlPercent < -2.5 && pnlPercent > -35.0) {
        averageDownCandidates.push({
          ...item, pnlPercent, score: 'High Priority',
          actionNote: `Currently down ${Math.abs(pnlPercent).toFixed(1)}% from average buy price ₹${item.avgCost.toFixed(2)}. Solid zone to accumulate.`
        });
      }
    });

    res.json({
      success: true,
      service: 'Recommendation Microservice',
      mode: '100% Live Market API Screener',
      missingSectors: missingSectors,
      averageDownCandidates: averageDownCandidates.sort((a, b) => a.pnlPercent - b.pnlPercent),
      sectorGaps: missingSectors,
      externalIdeas: liveRecommendations.sort((a, b) => b.priorityScore - a.priorityScore)
    });
  } catch (err) {
    console.error('[Live Recommendation API Error]:', err.message);
    res.status(500).json({ error: 'Recommendation API Error: ' + err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[Recommendation Microservice] Running on http://localhost:${PORT}`);
});
