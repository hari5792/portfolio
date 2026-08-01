// Intelligent Zerodha Kite & Coin CSV & XLSX Excel Parser (Bulletproof Multi-Sheet & Header Auto-Detection)
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

      let bestHoldings = [];
      let bestKite = 0;
      let bestCoin = 0;

      // Scan all sheets in the workbook
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

      // First parse as 2D array to handle metadata lines
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

  // Process 2D Array Grid (Handles title lines, metadata, merged headers, and Zerodha Console layouts)
  function process2DGrid(grid) {
    let headerRowIndex = -1;
    let symbolColIdx = -1;
    let qtyColIdx = -1;
    let avgCostColIdx = -1;
    let ltpColIdx = -1;
    let presValColIdx = -1;
    let sectorColIdx = -1;

    const symbolKeywords = ['symbol', 'instrument', 'trading symbol', 'scheme name', 'scheme', 'stock', 'particulars', 'isin', 'security'];
    const qtyKeywords = ['quantity', 'qty.', 'qty', 'units', 'quantity available', 'holding qty', 'available qty', 'balance'];
    const avgCostKeywords = ['average price', 'avg. cost', 'avg cost', 'buy price', 'buy avg', 'avg. nav', 'avg nav', 'avg price', 'cost price'];
    const ltpKeywords = ['ltp', 'current price', 'current nav', 'nav', 'last price', 'previous closing price', 'closing price', 'cur. price'];
    const presValKeywords = ['present value', 'cur. val', 'current value', 'market value'];

    // Search for header row in top 100 rows
    for (let r = 0; r < Math.min(100, grid.length); r++) {
      const row = grid[r];
      if (!Array.isArray(row)) continue;

      let symIdx = -1, qIdx = -1, costIdx = -1, ltpIdx = -1, pValIdx = -1, secIdx = -1;

      row.forEach((cell, c) => {
        if (!cell) return;
        const str = String(cell).trim().toLowerCase();

        if (symIdx === -1 && symbolKeywords.some(k => str === k || str.includes(k))) symIdx = c;
        if (qIdx === -1 && qtyKeywords.some(k => str === k || str.includes(k))) qIdx = c;
        if (costIdx === -1 && avgCostKeywords.some(k => str === k || str.includes(k))) costIdx = c;
        if (ltpIdx === -1 && ltpKeywords.some(k => str === k || str.includes(k))) ltpIdx = c;
        if (pValIdx === -1 && presValKeywords.some(k => str === k || str.includes(k))) pValIdx = c;
        if (secIdx === -1 && str.includes('sector')) secIdx = c;
      });

      // Header row found if symbol and at least one numeric header exist
      if (symIdx !== -1 && (qIdx !== -1 || costIdx !== -1 || ltpIdx !== -1 || pValIdx !== -1)) {
        headerRowIndex = r;
        symbolColIdx = symIdx;
        qtyColIdx = qIdx;
        avgCostColIdx = costIdx;
        ltpColIdx = ltpIdx;
        presValColIdx = pValIdx;
        sectorColIdx = secIdx;
        break;
      }
    }

    if (headerRowIndex === -1) {
      return { holdings: [], kiteCount: 0, coinCount: 0 };
    }

    const parsedHoldings = [];
    let kiteCount = 0;
    let coinCount = 0;

    for (let r = headerRowIndex + 1; r < grid.length; r++) {
      const row = grid[r];
      if (!Array.isArray(row)) continue;

      const rawSym = symbolColIdx !== -1 ? row[symbolColIdx] : '';
      if (!rawSym) continue;

      const symStr = String(rawSym).trim();
      const lowerSym = symStr.toLowerCase();

      // Skip non-stock header/total lines
      if (
        lowerSym.includes('total') ||
        lowerSym.includes('summary') ||
        lowerSym.includes('statement') ||
        lowerSym.includes('client id') ||
        lowerSym.includes('unrealized') ||
        lowerSym.includes('previous closing') ||
        lowerSym === 'symbol'
      ) continue;

      // Extract numbers safely from mapped or nearby columns
      let qty = qtyColIdx !== -1 ? parseFloat(cleanNumber(row[qtyColIdx])) : 0;
      let avgCost = avgCostColIdx !== -1 ? parseFloat(cleanNumber(row[avgCostColIdx])) : 0;
      let ltp = ltpColIdx !== -1 ? parseFloat(cleanNumber(row[ltpColIdx])) : 0;
      let presVal = presValColIdx !== -1 ? parseFloat(cleanNumber(row[presValColIdx])) : 0;

      // Auto-fallback: if mapped Qty column is 0 or NaN, scan row cells after symbol for first valid numbers
      if (isNaN(qty) || qty <= 0) {
        for (let c = symbolColIdx + 1; c < row.length; c++) {
          const num = parseFloat(cleanNumber(row[c]));
          if (!isNaN(num) && num > 0) {
            qty = num;
            break;
          }
        }
      }

      if (isNaN(qty) || qty <= 0) continue;

      // Calculate LTP from Present Value if available
      if ((isNaN(ltp) || ltp <= 0) && presVal > 0 && qty > 0) {
        ltp = presVal / qty;
      }
      if (isNaN(ltp) || ltp <= 0) ltp = avgCost;
      if (isNaN(avgCost) || avgCost <= 0) avgCost = ltp;

      if (avgCost <= 0 && ltp <= 0) continue;

      // Detect sector from file row or symbol rules
      let sector = 'General';
      if (sectorColIdx !== -1 && row[sectorColIdx] && String(row[sectorColIdx]).trim() !== '') {
        const rowSector = String(row[sectorColIdx]).trim();
        if (!rowSector.match(/^\d+$/) && rowSector.length > 2) {
          sector = rowSector;
        }
      }

      const isMutualFund = lowerSym.includes('fund') || lowerSym.includes('direct') || lowerSym.includes('growth') || lowerSym.includes('mf') || lowerSym.includes('index');

      let marketCap = 'Multi Cap';

      if (isMutualFund) {
        coinCount++;
        if (sector === 'General') sector = categorizeMFSector(symStr);
      } else {
        kiteCount++;
        if (sector === 'General') sector = categorizeStockSector(symStr);
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
      const qty = parseFloat(cleanNumber(cleanedRow['qty.'] || cleanedRow['qty'] || cleanedRow['quantity'] || cleanedRow['units'] || cleanedRow['quantity available'] || '0'));
      const avgCost = parseFloat(cleanNumber(cleanedRow['avg. cost'] || cleanedRow['avg cost'] || cleanedRow['buy price'] || cleanedRow['avg. nav'] || cleanedRow['avg nav'] || cleanedRow['buy avg'] || cleanedRow['average price'] || '0'));
      const ltp = parseFloat(cleanNumber(cleanedRow['ltp'] || cleanedRow['current price'] || cleanedRow['current nav'] || cleanedRow['nav'] || cleanedRow['last price'] || cleanedRow['previous closing price'] || '0'));

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
    if (['HDFCBANK', 'ICICIBANK', 'SBIN', 'KOTAKBANK', 'AXISBANK', 'INDUSINDBK', 'FEDERALBNK', 'BANKBARODA', 'YESBANK', 'IDFCFIRSTB', 'KTKBANK', 'SOUTHBANK', 'MANAPPURAM', 'BAJAJHFL'].some(s => sym.includes(s))) return 'Banking & Financials';
    if (['TATAMOTORS', 'M&M', 'MARUTI', 'HEROMOTOCO', 'EICHERMOT', 'BAJAJ-AUTO', 'ASHOKLEY', 'TVSMOTOR', 'TMCV', 'TMPV'].some(s => sym.includes(s))) return 'Automobile & EV';
    if (['SUZLON', 'TATAPOWER', 'NTPC', 'POWERGRID', 'ADANIPOWER', 'IREDA', 'NHPC', 'JSWENERGY'].some(s => sym.includes(s))) return 'Renewable Energy';
    if (['HAL', 'BEL', 'BDL', 'MAZDOCK', 'COCHINSHIP', 'DATA-PATTERNS'].some(s => sym.includes(s))) return 'Defence & Aerospace';
    if (['ITC', 'HINDUNILVR', 'NESTLEIND', 'BRITANNIA', 'TATACONSUM', 'DABUR', 'MARICO', 'GODREJCP'].some(s => sym.includes(s))) return 'FMCG';
    if (['PAYTM', 'POLICYBZR', 'NYKAA', 'ZOMATO', 'DELHIVERY', 'GROWW'].some(s => sym.includes(s))) return 'Fintech & Digital';
    if (['SUNPHARMA', 'DRREDDY', 'CIPLA', 'APOLLOHOSP', 'DIVISLAB', 'MANKIND', 'LUPIN'].some(s => sym.includes(s))) return 'Pharma & Healthcare';
    if (['TATASTEEL', 'JINDALSTEL', 'HINDALCO', 'SAIL', 'NATIONALUM', 'VEDL'].some(s => sym.includes(s))) return 'Metals & Mining';
    if (['GOLDBEES', 'GOLDCASE', 'ITBEES', 'MON100', 'BEES', 'ETF'].some(s => sym.includes(s))) return 'Index & Commodity ETF';
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
    const largeCaps = ['RELIANCE', 'TCS', 'HDFCBANK', 'ICICIBANK', 'INFY', 'BHARTIARTL', 'ITC', 'SBIN', 'LTIM', 'TATAMOTORS', 'HINDUNILVR', 'BAJFINANCE', 'HAL', 'LT', 'SUNPHARMA', 'AXISBANK', 'MARUTI', 'NTPC', 'ONGC', 'KOTAKBANK', 'TATASTEEL'];
    if (largeCaps.some(s => sym.includes(s))) return 'Large Cap';
    const midCaps = ['SUZLON', 'PAYTM', 'YESBANK', 'YES BANK', 'POLYCAB', 'IRFC', 'RVNL', 'FEDERALBNK', 'PERSISTENT', 'COFORGE', 'KTKBANK', 'MANAPPURAM', 'BAJAJHFL'];
    if (midCaps.some(s => sym.includes(s))) return 'Mid Cap';
    return 'Small / Micro Cap';
  }
})();
