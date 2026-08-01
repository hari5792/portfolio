// Realistic Zerodha Kite Stocks & Zerodha Coin Mutual Fund sample holdings
window.SAMPLE_HOLDINGS = [
  // --- Zerodha Kite Stocks ---
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
    symbol: "INFY",
    name: "Infosys Ltd",
    qty: 40,
    avgCost: 1790.00,
    ltp: 1540.00,
    sector: "IT & Software",
    marketCap: "Large Cap",
    source: "Zerodha Kite"
  },
  {
    id: "stock-6",
    type: "Stock",
    symbol: "PAYTM",
    name: "One97 Communications (Paytm)",
    qty: 120,
    avgCost: 850.00,
    ltp: 410.20,
    sector: "Fintech & Digital",
    marketCap: "Mid Cap",
    source: "Zerodha Kite"
  },
  {
    id: "stock-7",
    type: "Stock",
    symbol: "SUZLON",
    name: "Suzlon Energy Ltd",
    qty: 500,
    avgCost: 62.00,
    ltp: 54.50,
    sector: "Renewable Energy",
    marketCap: "Mid Cap",
    source: "Zerodha Kite"
  },
  {
    id: "stock-8",
    type: "Stock",
    symbol: "HAL",
    name: "Hindustan Aeronautics Ltd",
    qty: 20,
    avgCost: 3400.00,
    ltp: 4650.00,
    sector: "Defence & Aerospace",
    marketCap: "Large Cap",
    source: "Zerodha Kite"
  },
  {
    id: "stock-9",
    type: "Stock",
    symbol: "YESBANK",
    name: "Yes Bank Ltd",
    qty: 1000,
    avgCost: 24.50,
    ltp: 18.20,
    sector: "Banking & Financials",
    marketCap: "Mid Cap",
    source: "Zerodha Kite"
  },
  {
    id: "stock-10",
    type: "Stock",
    symbol: "ITC",
    name: "ITC Ltd",
    qty: 150,
    avgCost: 410.00,
    ltp: 485.60,
    sector: "FMCG",
    marketCap: "Large Cap",
    source: "Zerodha Kite"
  },

  // --- Zerodha Coin Mutual Funds ---
  {
    id: "mf-1",
    type: "Mutual Fund",
    symbol: "Parag Parikh Flexi Cap Fund - Direct Growth",
    name: "Parag Parikh Flexi Cap Fund",
    qty: 1450.45,
    avgCost: 62.50,
    ltp: 78.40,
    sector: "Flexi Cap MF",
    marketCap: "Multi Cap",
    source: "Zerodha Coin"
  },
  {
    id: "mf-2",
    type: "Mutual Fund",
    symbol: "Nippon India Small Cap Fund - Direct Growth",
    name: "Nippon India Small Cap Fund",
    qty: 820.10,
    avgCost: 145.00,
    ltp: 182.30,
    sector: "Small Cap MF",
    marketCap: "Small Cap",
    source: "Zerodha Coin"
  },
  {
    id: "mf-3",
    type: "Mutual Fund",
    symbol: "Mirae Asset Large Cap Fund - Direct Growth",
    name: "Mirae Asset Large Cap Fund",
    qty: 650.00,
    avgCost: 105.00,
    ltp: 98.20,
    sector: "Large Cap MF",
    marketCap: "Large Cap",
    source: "Zerodha Coin"
  },
  {
    id: "mf-4",
    type: "Mutual Fund",
    symbol: "UTI Nifty 50 Index Fund - Direct Growth",
    name: "UTI Nifty 50 Index Fund",
    qty: 410.80,
    avgCost: 180.00,
    ltp: 215.60,
    sector: "Index Fund",
    marketCap: "Large Cap",
    source: "Zerodha Coin"
  }
];

// High Quality External Stock & ETF Ideas (Outside Current Portfolio)
window.EXTERNAL_RECOMMENDATIONS = [
  {
    symbol: "NIFTYBEES",
    name: "Nippon India ETF Nifty 50 BeES",
    sector: "Broad Market ETF",
    category: "ETF / Index",
    marketCap: "Large Cap",
    price: 265.40,
    risk: "Low Risk",
    potential: "High (Core Compounder)",
    rationale: "Lowest cost way to get exposure to India's top 50 companies. Perfect for long-term core wealth creation without stock-picking risk.",
    tags: ["Core Asset", "Low Expense", "Nifty 50"]
  },
  {
    symbol: "MON100",
    name: "Motilal Oswal Nasdaq 100 ETF",
    sector: "Global Technology ETF",
    category: "Global ETF",
    marketCap: "Global Tech",
    price: 158.20,
    risk: "Moderate Risk",
    potential: "High Growth",
    rationale: "Geographic & USD currency hedge. Provides exposure to global AI and Tech giants (Apple, Microsoft, Nvidia, Alphabet, Amazon).",
    tags: ["US Tech", "USD Hedge", "AI Theme"]
  },
  {
    symbol: "LT",
    name: "Larsen & Toubro Ltd",
    sector: "Infrastructure & Capital Goods",
    category: "Stock Idea",
    marketCap: "Large Cap",
    price: 3620.00,
    risk: "Low-Moderate",
    potential: "High (Order Book Growth)",
    rationale: "India's premier infrastructure conglomerate with record order book from government capex, Middle East expansion, and defence manufacturing.",
    tags: ["Govt Capex", "Infra Leader", "Defence"]
  },
  {
    symbol: "SUNPHARMA",
    name: "Sun Pharmaceutical Industries Ltd",
    sector: "Pharma & Healthcare",
    category: "Stock Idea",
    marketCap: "Large Cap",
    price: 1710.50,
    risk: "Moderate Risk",
    potential: "Steady Growth",
    rationale: "Defensive sector pick with strong global specialty product portfolio and robust domestic market share in chronic therapies.",
    tags: ["Defensive", "Healthcare", "Specialty R&D"]
  },
  {
    symbol: "TATASTEEL",
    name: "Tata Steel Ltd",
    sector: "Metals & Mining",
    category: "Stock Idea",
    marketCap: "Large Cap",
    price: 156.80,
    risk: "Cyclical / High Risk",
    potential: "High upside on demand recovery",
    rationale: "Cost-efficient domestic producer benefitting from Indian infrastructure demand and European plant restructuring.",
    tags: ["Cyclical Value", "Infra Demand", "Metals"]
  },
  {
    symbol: "BANKBEES",
    name: "Nippon India ETF Bank BeES",
    sector: "Banking & Financials ETF",
    category: "Sectoral ETF",
    marketCap: "Large Cap",
    price: 520.30,
    risk: "Moderate Risk",
    potential: "High (India Credit Growth)",
    rationale: "Direct exposure to top private & PSU banks driving India's financialization and credit growth story.",
    tags: ["Banking", "Credit Expansion", "ETF"]
  }
];
