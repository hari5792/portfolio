// Intelligent Zerodha Kite & Coin CSV & XLSX Excel Parser (Bulletproof Header Auto-Detection)
(function() {
  window.PortfolioCSVParser = {
    // Parse XLSX / XLS Excel ArrayBuffer
    parseExcelArrayBuffer: function(arrayBuffer) {
      if (!window.XLSX) {
        throw new Error("Excel Parser engine (SheetJS XLSX) is missing.");
      }

      const workbook = window.XLSX.read(arrayBuffer, { type: 'array' });
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error("Excel workbook has no sheets.");
      }

      // Check all sheets or start with the first sheet
      let bestHoldings = [];
      let bestKite = 0;
      let bestCoin = 0;

      for (let s = 0; s < workbook.SheetNames.length; s++) {
        const sheetName = workbook.SheetNames[s];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to 2D array of rows
        const rawGrid = window.XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        if (rawGrid && rawGrid.length > 0) {
          const result = process2DGrid(rawGrid);
          if (result.holdings.length > bestHoldings.length) {
            bestHoldings = result.holdings;
            bestKite = result.kiteCount;
            bestCoin = result.coinCount;
          }
        }
      }

      if (bestHoldings.length === 0) {
        throw new Error("Could not find valid holding rows in the Excel file. Please ensure it's a Zerodha Kite, Console, or Coin export.");
      }

      return {
        holdings: bestHoldings,
        kiteCount: bestKite,
        coinCount: bestCoin
      };
    },

    // Parse CSV Text
    parseZerodhaCSV: function(csvText) {
      if (!window.Papa) {
        throw new Error("CSV Parser engine (PapaParse) is missing.");
      }

      // First parse as 2D array to skip title lines
      const results2D = window.Papa.parse(csvText, {
        header: false,
        skipEmptyLines: true
      });

      if (results2D.data && results2D.data.length > 0) {
        const result = process2DGrid(results2D.data);
        if (result.holdings.length > 0) {
          return result;
        }
      }

      // Fallback standard parse
      const results = window.Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false
      });

      if (!results.data || results.data.length === 0) {
        throw new Error("Uploaded CSV file contains no rows or invalid formatting.");
      }

      return processRawObjects(results.data);
    }
  };

  // Process 2D Array Grid (Handles metadata/title lines at the top of Excel/CSV)
  function process2DGrid(grid) {
    let headerRowIndex = -1;
    let symbolColIdx = -1;
    let qtyColIdx = -1;
    let avgCostColIdx = -1;
    let ltpColIdx = -1;
    let investedColIdx = -1;
    let curValColIdx = -1;

    const symbolKeywords = ['instrument', 'symbol', 'trading symbol', 'scheme name', 'scheme', 'stock', 'particulars', 'isin', 'security', 'fund name'];
    const qtyKeywords = ['qty.', 'qty', 'quantity', 'units', 'holding qty', 'available qty', 'balance'];
    const avgCostKeywords = ['avg. cost', 'avg cost', 'buy price', 'buy avg', 'avg. nav', 'avg nav', 'avg price', 'cost price', 'average price'];
    const ltpKeywords = ['ltp', 'current price', 'current nav', 'nav', 'last price', 'cur. price', 'market price', 'closing price'];
    const investedKeywords = ['invested', 'invested value', 'total cost', 'cost value'];
    const curValKeywords = ['cur. val', 'current value', 'market value'];

    // Search for header row in top 20 rows
    for (let r = 0; r < Math.min(20, grid.length); r++) {
      const row = grid[r];
      if (!Array.isArray(row)) continue;

      let symIdx = -1, qIdx = -1, costIdx = -1, ltpIdx = -1, invIdx = -1, curIdx = -1;

      row.forEach((cell, c) => {
        if (!cell) return;
        const str = String(cell).trim().toLowerCase();

        if (symIdx === -1 && symbolKeywords.some(k => str.includes(k))) symIdx = c;
        if (qIdx === -1 && qtyKeywords.some(k => str.includes(k))) qIdx = c;
        if (costIdx === -1 && avgCostKeywords.some(k => str.includes(k))) costIdx = c;
        if (ltpIdx === -1 && ltpKeywords.some(k => str.includes(k))) ltpIdx = c;
        if (invIdx === -1 && investedKeywords.some(k => str.includes(k))) invIdx = c;
        if (curIdx === -1 && curValKeywords.some(k => str.includes(k))) curIdx = c;
      });

      // Header row must have at least symbol and (qty or avgCost or ltp)
      if (symIdx !== -1 && (qIdx !== -1 || costIdx !== -1 || ltpIdx !== -1)) {
        headerRowIndex = r;
        symbolColIdx = symIdx;
        qtyColIdx = qIdx;
        avgCostColIdx = costIdx;
        ltpColIdx = ltpIdx;
        investedColIdx = invIdx;
        curValColIdx = curIdx;
        break;
      }
    }

    if (headerRowIndex === -1) {
      // Fallback: search for first row where column 0 or 1 looks like a ticker/stock
      return processRawObjects([]);
    }

    const parsedHoldings = [];
    let kiteCount = 0;
    let coinCount = 0;

    for (let r = headerRowIndex + 1; r < grid.length; r++) {
      const row = grid[r];
      if (!Array.isArray(row)) continue;

      const rawSym = symbolColIdx !== -1 ? row[symbolColIdx] : '';
      if (!rawSym || String(rawSym).toLowerCase().includes('total')) continue;

      const symStr = String(rawSym).trim();
      const rawQty = qtyColIdx !== -1 ? row[qtyColIdx] : 0;
      const qty = parseFloat(cleanNumber(rawQty));
      if (isNaN(qty) || qty <= 0) continue;

      let avgCost = avgCostColIdx !== -1 ? parseFloat(cleanNumber(row[avgCostColIdx])) : 0;
      let ltp = ltpColIdx !== -1 ? parseFloat(cleanNumber(row[ltpColIdx])) : 0;
      const invested = investedColIdx !== -1 ? parseFloat(cleanNumber(row[investedColIdx])) : 0;
      const curVal = curValColIdx !== -1 ? parseFloat(cleanNumber(row[curValColIdx])) : 0;

      // Fallbacks if cost or ltp missing
      if ((isNaN(avgCost) || avgCost <= 0) && invested > 0 && qty > 0) {
        avgCost = invested / qty;
      }
      if ((isNaN(ltp) || ltp <= 0) && curVal > 0 && qty > 0) {
        ltp = curVal / qty;
      }
      if (isNaN(ltp) || ltp <= 0) ltp = avgCost;
      if (isNaN(avgCost) || avgCost <= 0) avgCost = ltp;

      if (avgCost <= 0 && ltp <= 0) continue;

      const isMutualFund = symStr.toLowerCase().includes('fund') || symStr.toLowerCase().includes('direct') || symStr.toLowerCase().includes('growth') || symStr.toLowerCase().includes('mf');

      let sector = 'General';
      let marketCap = 'Multi Cap';

      if (isMutualFund) {
        coinCount++;
        sector = categorizeMFSector(symStr);
      } else {
        kiteCount++;
        sector = categorizeStockSector(symStr);
        marketCap = estimateMarketCap(symStr);
      }

      parsedHoldings.push({
        id: `custom-${Date.now()}-${r}`,
        type: isMutualFund ? 'Mutual Fund' : 'Stock',
        symbol: symStr.toUpperCase(),
        name: symStr,
        qty: qty,
        avgCost: avgCost,
        ltp: ltp,
        sector: sector,
        marketCap: marketCap,
        source: isMutualFund ? 'Zerodha Coin' : 'Zerodha Kite'
      });
    }

    return {
      holdings: parsedHoldings,
      kiteCount: kiteCount,
      coinCount: coinCount
    };
  }

  function processRawObjects(rawRows) {
    const parsedHoldings = [];
    let kiteCount = 0;
    let coinCount = 0;

    rawRows.forEach((row, index) => {
      const cleanedRow = {};
      Object.keys(row).forEach(k => {
        if (k) cleanedRow[k.trim().toLowerCase()] = row[k];
      });

      const symbol = cleanedRow['instrument'] || cleanedRow['symbol'] || cleanedRow['trading symbol'] || cleanedRow['scheme name'] || cleanedRow['scheme'] || cleanedRow['stock'] || cleanedRow['particulars'] || cleanedRow['isin'] || '';
      if (!symbol || String(symbol).toLowerCase().includes('total')) return;

      const symStr = String(symbol).trim();
      const qty = parseFloat(cleanNumber(cleanedRow['qty.'] || cleanedRow['qty'] || cleanedRow['quantity'] || cleanedRow['units'] || '0'));
      const avgCost = parseFloat(cleanNumber(cleanedRow['avg. cost'] || cleanedRow['avg cost'] || cleanedRow['buy price'] || cleanedRow['avg. nav'] || cleanedRow['avg nav'] || cleanedRow['buy avg'] || '0'));
      const ltp = parseFloat(cleanNumber(cleanedRow['ltp'] || cleanedRow['current price'] || cleanedRow['current nav'] || cleanedRow['nav'] || cleanedRow['last price'] || '0'));

      if (qty <= 0) return;

      const isMutualFund = cleanedRow['scheme name'] || symStr.toLowerCase().includes('fund') || symStr.toLowerCase().includes('direct') || symStr.toLowerCase().includes('growth');

      let sector = 'General';
      let marketCap = 'Multi Cap';

      if (isMutualFund) {
        coinCount++;
        sector = categorizeMFSector(symStr);
      } else {
        kiteCount++;
        sector = categorizeStockSector(symStr);
        marketCap = estimateMarketCap(symStr);
      }

      parsedHoldings.push({
        id: `custom-${Date.now()}-${index}`,
        type: isMutualFund ? 'Mutual Fund' : 'Stock',
        symbol: symStr.toUpperCase(),
        name: symStr,
        qty: qty,
        avgCost: avgCost,
        ltp: ltp > 0 ? ltp : avgCost,
        sector: sector,
        marketCap: marketCap,
        source: isMutualFund ? 'Zerodha Coin' : 'Zerodha Kite'
      });
    });

    return {
      holdings: parsedHoldings,
      kiteCount: kiteCount,
      coinCount: coinCount
    };
  }

  function cleanNumber(val) {
    if (typeof val === 'number') return val;
    if (!val) return '0';
    return String(val).replace(/[₹,%\s]/g, '').trim();
  }

  function categorizeStockSector(symbol) {
    const sym = symbol.toUpperCase();
    if (['RELIANCE', 'BPCL', 'IOC', 'ONGC', 'GAIL', 'HINDPETRO'].some(s => sym.includes(s))) return 'Energy & Oil';
    if (['TCS', 'INFY', 'WIPRO', 'HCLTECH', 'TECHM', 'LTIM', 'PERSISTENT', 'COFORGE', 'OFSS'].some(s => sym.includes(s))) return 'IT & Software';
    if (['HDFCBANK', 'ICICIBANK', 'SBIN', 'KOTAKBANK', 'AXISBANK', 'INDUSINDBK', 'FEDERALBNK', 'BANKBARODA', 'YESBANK', 'IDFCFIRSTB'].some(s => sym.includes(s))) return 'Banking & Financials';
    if (['TATAMOTORS', 'M&M', 'MARUTI', 'HEROMOTOCO', 'EICHERMOT', 'BAJAJ-AUTO', 'ASHOKLEY', 'TVSMOTOR'].some(s => sym.includes(s))) return 'Automobile & EV';
    if (['SUZLON', 'TATAPOWER', 'NTPC', 'POWERGRID', 'ADANIPOWER', 'IREDA', 'NHPC', 'JSWENERGY'].some(s => sym.includes(s))) return 'Renewable Energy';
    if (['HAL', 'BEL', 'BDL', 'MAZDOCK', 'COCHINSHIP', 'DATA-PATTERNS'].some(s => sym.includes(s))) return 'Defence & Aerospace';
    if (['ITC', 'HINDUNILVR', 'NESTLEIND', 'BRITANNIA', 'TATACONSUM', 'DABUR', 'MARICO', 'GODREJCP'].some(s => sym.includes(s))) return 'FMCG';
    if (['PAYTM', 'POLICYBZR', 'NYKAA', 'ZOMATO', 'DELHIVERY'].some(s => sym.includes(s))) return 'Fintech & Digital';
    if (['SUNPHARMA', 'DRREDDY', 'CIPLA', 'APOLLOHOSP', 'DIVISLAB', 'MANKIND', 'LUPIN'].some(s => sym.includes(s))) return 'Pharma & Healthcare';
    if (['TATASTEEL', 'JINDALSTEL', 'HINDALCO', 'SAIL', 'NATIONALUM', 'VEDL'].some(s => sym.includes(s))) return 'Metals & Mining';
    if (['LT', 'ULTRACETCO', 'GRASIM', 'SIEMENS', 'ABB', 'ADANIENT', 'PNCINFRA'].some(s => sym.includes(s))) return 'Infrastructure & Capital Goods';
    return 'Other Stocks';
  }

  function categorizeMFSector(name) {
    const n = name.toLowerCase();
    if (n.includes('small cap') || n.includes('smallcap')) return 'Small Cap MF';
    if (n.includes('mid cap') || n.includes('midcap')) return 'Mid Cap MF';
    if (n.includes('flexi cap') || n.includes('multi cap')) return 'Flexi Cap MF';
    if (n.includes('large cap') || n.includes('nifty') || n.includes('index')) return 'Large Cap / Index MF';
    if (n.includes('elss') || n.includes('tax')) return 'ELSS Tax Saver';
    return 'Mutual Funds';
  }

  function estimateMarketCap(symbol) {
    const sym = symbol.toUpperCase();
    const largeCaps = ['RELIANCE', 'TCS', 'HDFCBANK', 'ICICIBANK', 'INFY', 'BHARTIARTL', 'ITC', 'SBIN', 'LTIM', 'TATAMOTORS', 'HINDUNILVR', 'BAJFINANCE', 'HAL', 'LT', 'SUNPHARMA', 'AXISBANK', 'MARUTI', 'NTPC', 'ONGC', 'KOTAKBANK'];
    if (largeCaps.some(s => sym.includes(s))) return 'Large Cap';
    const midCaps = ['SUZLON', 'PAYTM', 'YESBANK', 'YES BANK', 'POLYCAB', 'IRFC', 'RVNL', 'FEDERALBNK', 'PERSISTENT', 'COFORGE'];
    if (midCaps.some(s => sym.includes(s))) return 'Mid Cap';
    return 'Small / Micro Cap';
  }
})();
