const EXPERT_RECOMMENDATIONS = [
  // Short-Term (6-18 Months)
  {
    symbol: "HAL",
    name: "Hindustan Aeronautics Ltd",
    horizon: "Short-Term (6-18 Mos)",
    horizonTag: "Short-Term",
    sector: "Defence & Aerospace",
    category: "Tactical Stock",
    marketCap: "Large Cap PSU",
    price: 4650.00,
    risk: "Moderate Risk",
    potential: "20% - 28% Upside",
    rationale: "Multi-year order book visibility backed by Defence Ministry indigenization mandate and export deals to Southeast Asia.",
    tags: ["Defence Order Book", "Govt Indigenization", "Export Boost"]
  },
  {
    symbol: "LT",
    name: "Larsen & Toubro Ltd",
    horizon: "Short-Term (6-18 Mos)",
    horizonTag: "Short-Term",
    sector: "Infrastructure & Capex",
    category: "Tactical Stock",
    marketCap: "Large Cap",
    price: 3620.00,
    risk: "Low-Moderate",
    potential: "18% - 24% Upside",
    rationale: "India's premier infrastructure conglomerate with record order book from government capex, Middle East expansion, and defence manufacturing.",
    tags: ["Govt Capex", "Infra Leader", "Railways & Energy"]
  },
  {
    symbol: "NTPC",
    name: "NTPC Ltd",
    horizon: "Short-Term (6-18 Mos)",
    horizonTag: "Short-Term",
    sector: "Power & Renewable Energy",
    category: "Tactical Stock",
    marketCap: "Large Cap PSU",
    price: 395.40,
    risk: "Low Risk",
    potential: "15% - 22% Upside",
    rationale: "Peak summer power demand in India plus massive solar/wind green energy capacity additions with steady dividend yield.",
    tags: ["Power Grid", "Green Hydrogen", "Dividend Yield"]
  },

  // Long-Term (3-10 Years)
  {
    symbol: "NIFTYBEES",
    name: "Nippon India ETF Nifty 50 BeES",
    horizon: "Long-Term (3-10 Yrs)",
    horizonTag: "Long-Term",
    sector: "Broad Market Index ETF",
    category: "Core Compounder",
    marketCap: "Large Cap",
    price: 265.40,
    risk: "Low Risk",
    potential: "13% - 15% CAGR",
    rationale: "Lowest cost way to own India's top 50 companies. Essential core wealth builder without single-stock selection risk.",
    tags: ["Core Asset", "Nifty 50", "Low Expense Ratio"]
  },
  {
    symbol: "MON100-E",
    name: "Motilal Oswal Nasdaq 100 ETF",
    horizon: "Long-Term (3-10 Yrs)",
    horizonTag: "Long-Term",
    sector: "Global Technology ETF",
    category: "Core Compounder",
    marketCap: "Global Tech",
    price: 158.20,
    risk: "Moderate Risk",
    potential: "15% - 18% CAGR",
    rationale: "Geographic & USD currency hedge. Provides direct exposure to global AI leaders (Nvidia, Apple, Microsoft, Alphabet, Amazon).",
    tags: ["US Tech", "USD Hedge", "AI Revolution"]
  },
  {
    symbol: "SUNPHARMA",
    name: "Sun Pharmaceutical Industries Ltd",
    horizon: "Long-Term (3-10 Yrs)",
    horizonTag: "Long-Term",
    sector: "Pharma & Healthcare",
    category: "Core Compounder",
    marketCap: "Large Cap",
    price: 1710.50,
    risk: "Low-Moderate",
    potential: "14% - 16% CAGR",
    rationale: "Market leader in domestic chronic therapies with growing global specialty product pipeline. Non-cyclical defensive pick.",
    tags: ["Defensive", "Specialty R&D", "Healthcare Leader"]
  }
];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    const holdings = req.body?.holdings || [];
    const averageDownCandidates = [];

    holdings.forEach(item => {
      const invested = item.qty * item.avgCost;
      const curr = item.qty * item.ltp;
      const pnl = curr - invested;
      const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;

      if (pnlPercent < -2.5 && pnlPercent > -35.0) {
        averageDownCandidates.push({
          ...item, pnlPercent, score: 'High Priority',
          actionNote: `Currently down ${Math.abs(pnlPercent).toFixed(1)}% from average buy price. Solid zone to accumulate.`
        });
      }
    });

    const allSectors = ['Banking & Financials', 'IT & Software', 'Automobile & EV', 'Energy & Oil', 'Renewable Energy', 'FMCG', 'Pharma & Healthcare', 'Defence & Aerospace', 'Infrastructure & Capex'];
    const currentSectors = new Set(holdings.map(h => h.sector));
    const sectorGaps = allSectors.filter(s => !currentSectors.has(s));

    return res.status(200).json({
      success: true,
      mode: 'Serverless Cloud Function (Recommendations)',
      averageDownCandidates: averageDownCandidates.sort((a, b) => a.pnlPercent - b.pnlPercent),
      sectorGaps,
      externalIdeas: EXPERT_RECOMMENDATIONS
    });
  } catch (err) {
    return res.status(500).json({ error: 'Recommendation Error: ' + err.message });
  }
};
