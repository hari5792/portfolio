// Realistic Zerodha Kite Stocks & Zerodha Coin Mutual Fund sample holdings
window.SAMPLE_HOLDINGS = [
  {
    id: "stock-1",
    type: "Stock",
    symbol: "RELIANCE",
    name: "Reliance Industries Ltd",
    qty: 25,
    avgCost: 2850.00,
    ltp: 3020.50,
    sector: "Energy & Oil",
    marketCap: "Large Cap",
    source: "Zerodha Kite"
  },
  {
    id: "stock-2",
    type: "Stock",
    symbol: "TCS",
    name: "Tata Consultancy Services",
    qty: 15,
    avgCost: 4120.00,
    ltp: 3840.25,
    sector: "IT & Software",
    marketCap: "Large Cap",
    source: "Zerodha Kite"
  },
  {
    id: "stock-3",
    type: "Stock",
    symbol: "HDFCBANK",
    name: "HDFC Bank Ltd",
    qty: 60,
    avgCost: 1680.00,
    ltp: 1610.80,
    sector: "Banking & Financials",
    marketCap: "Large Cap",
    source: "Zerodha Kite"
  },
  {
    id: "stock-4",
    type: "Stock",
    symbol: "TATAMOTORS",
    name: "Tata Motors Ltd",
    qty: 80,
    avgCost: 720.00,
    ltp: 980.40,
    sector: "Automobile & EV",
    marketCap: "Large Cap",
    source: "Zerodha Kite"
  },
  {
    id: "stock-5",
    type: "Stock",
    symbol: "ITC",
    name: "ITC Ltd",
    qty: 150,
    avgCost: 410.00,
    ltp: 485.60,
    sector: "FMCG",
    marketCap: "Large Cap",
    source: "Zerodha Kite"
  }
];

// Expert Short-Term & Long-Term Investment Recommendations
window.EXTERNAL_RECOMMENDATIONS = [
  // --- SHORT TERM (6 - 18 MONTHS) ---
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

  // --- LONG TERM (3 - 10 YEARS) ---
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
