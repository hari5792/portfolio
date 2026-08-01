const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 5003;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const MARKET_SECTOR_TAXONOMY = {
  'Defence & Aerospace': { tickers: ['HAL.NS', 'BEL.NS', 'BDL.NS'], horizon: 'Short-Term', risk: 'Moderate Risk' },
  'Infrastructure & Capex': { tickers: ['LT.NS', 'PNCINFRA.NS', 'ULTRACEMCO.NS'], horizon: 'Short-Term', risk: 'Low-Moderate' },
  'Power & Renewable Energy': { tickers: ['NTPC.NS', 'TATAPOWER.NS', 'SUZLON.NS'], horizon: 'Short-Term', risk: 'Low Risk' },
  'Broad Market Index ETF': { tickers: ['NIFTYBEES.NS'], horizon: 'Long-Term', risk: 'Low Risk' },
  'Global Technology ETF': { tickers: ['MON100.NS'], horizon: 'Long-Term', risk: 'Moderate Risk' },
  'Pharma & Healthcare': { tickers: ['SUNPHARMA.NS', 'CIPLA.NS', 'DRREDDY.NS'], horizon: 'Long-Term', risk: 'Low-Moderate' },
  'IT & Software': { tickers: ['TCS.NS', 'INFY.NS', 'TECHM.NS'], horizon: 'Long-Term', risk: 'Low-Moderate' }
};

app.get('/health', (req, res) => {
  res.json({ service: 'Recommendation Microservice', status: 'UP', port: PORT, mode: '100% Dynamic Sector Gap & Live Market Engine', timestamp: new Date().toISOString() });
});

app.post('/recommendations', async (req, res) => {
  try {
    const holdings = req.body?.holdings || [];
    const ownedSymbols = new Set();
    const sectorValueMap = {};
    let totalPortfolioVal = 0;

    holdings.forEach(h => {
      if (h.symbol) {
        const cleanSym = String(h.symbol).toUpperCase().replace('-E', '').replace('.NS', '').replace('.BO', '').trim();
        ownedSymbols.add(cleanSym);
      }
      const val = (h.qty || 0) * (h.ltp || h.avgCost || 0);
      totalPortfolioVal += val;
      const sec = h.sector || 'General';
      sectorValueMap[sec] = (sectorValueMap[sec] || 0) + val;
    });

    const sectorWeights = {};
    Object.keys(sectorValueMap).forEach(sec => {
      sectorWeights[sec] = totalPortfolioVal > 0 ? (sectorValueMap[sec] / totalPortfolioVal) * 100 : 0;
    });

    const missingSectors = [];
    const underweightedSectors = [];

    Object.keys(MARKET_SECTOR_TAXONOMY).forEach(secName => {
      const currentWeight = sectorWeights[secName] || 0;
      if (currentWeight === 0) {
        missingSectors.push(secName);
      } else if (currentWeight < 10.0) {
        underweightedSectors.push(secName);
      }
    });

    const dynamicRecommendations = [];

    for (const [secName, secConfig] of Object.entries(MARKET_SECTOR_TAXONOMY)) {
      const isMissing = missingSectors.includes(secName);
      const isUnderweighted = underweightedSectors.includes(secName);

      if (!isMissing && !isUnderweighted) continue;

      for (const ticker of secConfig.tickers) {
        const cleanSym = ticker.replace('.NS', '').toUpperCase();
        if (ownedSymbols.has(cleanSym) || ownedSymbols.has(`${cleanSym}-E`)) continue;

        try {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1m&range=1d`;
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

              dynamicRecommendations.push({
                symbol: cleanSym,
                name: shortName,
                horizon: secConfig.horizon === 'Short-Term' ? 'Short-Term (6-18 Mos)' : 'Long-Term (3-10 Yrs)',
                horizonTag: secConfig.horizon,
                sector: secName,
                category: isMissing ? `Dynamic Gap Play: ${secName}` : 'Under-weighted Sector Rebalance',
                price: parseFloat(livePrice.toFixed(2)),
                fiftyTwoWeekHigh: parseFloat(fiftyTwoWkHigh.toFixed(2)),
                fiftyTwoWeekLow: parseFloat(fiftyTwoWkLow.toFixed(2)),
                risk: secConfig.risk,
                potential: formattedPotential,
                rationale: `Dynamic API Screener: Detected ${isMissing ? '0%' : 'under-weighted (<10%)'} portfolio coverage in ${secName}. Live NSE quote: ₹${livePrice.toFixed(2)} (52-Wk Range: ₹${fiftyTwoWkLow.toFixed(0)} - ₹${fiftyTwoWkHigh.toFixed(0)}).`,
                tags: [`Live API: ${cleanSym}`, isMissing ? '0% Portfolio Gap' : 'Underweighted Sector', secConfig.horizon],
                priorityScore: isMissing ? 10 : 5
              });
            }
          }
        } catch (e) {
          console.error(`Live Market Query Error for ${ticker}:`, e.message);
        }
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
          ...item,
          pnlPercent,
          score: 'High Priority',
          actionNote: `Currently down ${Math.abs(pnlPercent).toFixed(1)}% from average buy price ₹${item.avgCost.toFixed(2)}. Accumulate in dips.`
        });
      }
    });

    res.json({
      success: true,
      service: 'Recommendation Microservice',
      mode: '100% Dynamic Sector Gap & Live Market Engine',
      userSectorWeights: sectorWeights,
      missingSectors: missingSectors,
      underweightedSectors: underweightedSectors,
      averageDownCandidates: averageDownCandidates.sort((a, b) => a.pnlPercent - b.pnlPercent),
      sectorGaps: missingSectors,
      externalIdeas: dynamicRecommendations.sort((a, b) => b.priorityScore - a.priorityScore)
    });
  } catch (err) {
    console.error('[Dynamic Recommendation API Error]:', err.message);
    res.status(500).json({ error: 'Dynamic Recommendation Error: ' + err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[Recommendation Microservice] Running on http://localhost:${PORT}`);
});
