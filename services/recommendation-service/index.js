const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 5003;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const SECTOR_LEADER_DIRECTORY = {
  'Defence & Aerospace': [
    { symbol: 'HAL', name: 'Hindustan Aeronautics Ltd', horizonTag: 'Short-Term', potential: '20% - 28% Upside', rationale: 'Order-book growth (>20% YoY) backed by Defence Ministry indigenization mandate and export expansion.', tags: ['Defence Order Book', 'Govt Indigenization', 'Export Growth'] },
    { symbol: 'BEL', name: 'Bharat Electronics Ltd', horizonTag: 'Short-Term', potential: '18% - 25% Upside', rationale: 'Navratna defence electronics leader with strong order inflows in radar and missile systems.', tags: ['Defence Electronics', 'PSU Leader', 'Order Inflows'] }
  ],
  'Infrastructure & Capex': [
    { symbol: 'LT', name: 'Larsen & Toubro Ltd', horizonTag: 'Short-Term', potential: '18% - 24% Upside', rationale: 'India premier infrastructure conglomerate with record order book from government capex and Middle East EPC projects.', tags: ['Govt Capex', 'Infra Leader', 'Railways & Energy'] }
  ],
  'Power & Renewable Energy': [
    { symbol: 'NTPC', name: 'NTPC Ltd', horizonTag: 'Short-Term', potential: '15% - 22% Upside', rationale: 'Peak summer power demand in India combined with solar/wind green energy capacity additions.', tags: ['Power Grid', 'Green Hydrogen', 'Dividend Yield'] }
  ],
  'Broad Market Index ETF': [
    { symbol: 'NIFTYBEES', name: 'Nippon India ETF Nifty 50 BeES', horizonTag: 'Long-Term', potential: '13% - 15% CAGR', rationale: 'Lowest cost exposure to India top 50 companies. Essential core wealth builder without single-stock selection risk.', tags: ['Core Asset', 'Nifty 50', 'Low Expense'] }
  ],
  'Global Technology ETF': [
    { symbol: 'MON100', name: 'Motilal Oswal Nasdaq 100 ETF', horizonTag: 'Long-Term', potential: '15% - 18% CAGR', rationale: 'Geographic & USD currency hedge. Provides direct exposure to global AI leaders (Nvidia, Apple, Microsoft, Alphabet).', tags: ['US Tech', 'USD Hedge', 'AI Revolution'] }
  ],
  'Pharma & Healthcare': [
    { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Industries Ltd', horizonTag: 'Long-Term', potential: '14% - 16% CAGR', rationale: 'Market leader in domestic chronic therapies with growing global specialty product pipeline.', tags: ['Defensive', 'Specialty R&D', 'Healthcare Leader'] }
  ]
};

app.get('/health', (req, res) => {
  res.json({ service: 'Recommendation Microservice', status: 'UP', port: PORT, mode: 'Live API Sector Scanner', timestamp: new Date().toISOString() });
});

app.post('/recommendations', async (req, res) => {
  try {
    const holdings = req.body?.holdings || [];
    const ownedSymbols = new Set(holdings.map(h => h.symbol.toUpperCase().replace('-E', '').replace('.NS', '')));
    const ownedSectors = new Set(holdings.map(h => h.sector));

    const allSectors = ['Defence & Aerospace', 'Infrastructure & Capex', 'Power & Renewable Energy', 'Broad Market Index ETF', 'Global Technology ETF', 'Pharma & Healthcare'];
    const missingSectors = allSectors.filter(s => !ownedSectors.has(s));

    const candidateList = [];
    allSectors.forEach(sec => {
      const isMissing = missingSectors.includes(sec);
      const directory = SECTOR_LEADER_DIRECTORY[sec] || [];
      directory.forEach(item => {
        const cleanSym = item.symbol.toUpperCase();
        if (!ownedSymbols.has(cleanSym) && !ownedSymbols.has(`${cleanSym}-E`)) {
          candidateList.push({ ...item, isSectorGap: isMissing, priorityScore: isMissing ? 10 : 5 });
        }
      });
    });

    const liveRecommendations = await Promise.all(candidateList.map(async (candidate) => {
      let livePrice = candidate.price || 1000;
      let dayChangePercent = 0;
      try {
        const querySym = candidate.symbol.includes('.NS') ? candidate.symbol : `${candidate.symbol}.NS`;
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${querySym}?interval=1m&range=1d`;
        const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (resp.ok) {
          const json = await resp.json();
          const meta = json?.chart?.result?.[0]?.meta;
          if (meta && meta.regularMarketPrice) {
            livePrice = meta.regularMarketPrice;
            const prevClose = meta.chartPreviousClose || meta.previousClose || livePrice;
            dayChangePercent = prevClose > 0 ? ((livePrice - prevClose) / prevClose) * 100 : 0;
          }
        }
      } catch (e) {}

      return {
        ...candidate,
        price: parseFloat(livePrice.toFixed(2)),
        dayChangePercent: parseFloat(dayChangePercent.toFixed(2)),
        category: candidate.isSectorGap ? `Missing Sector Play (${candidate.sector})` : candidate.horizonTag === 'Short-Term' ? 'Tactical Stock' : 'Core Compounder',
        risk: candidate.horizonTag === 'Short-Term' ? 'Moderate Risk' : 'Low-Moderate'
      };
    }));

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
      mode: 'Live API Sector Scanner',
      missingSectors: missingSectors,
      averageDownCandidates: averageDownCandidates.sort((a, b) => a.pnlPercent - b.pnlPercent),
      sectorGaps: missingSectors,
      externalIdeas: liveRecommendations.sort((a, b) => b.priorityScore - a.priorityScore)
    });
  } catch (err) {
    console.error('[Recommendation Microservice Error]:', err.message);
    res.status(500).json({ error: 'Recommendation Error: ' + err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[Recommendation Microservice] Running on http://localhost:${PORT}`);
});
