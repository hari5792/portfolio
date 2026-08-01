// Intelligent Zerodha Kite & Coin CSV & XLSX Excel Parser
(function() {
  window.PortfolioCSVParser = {
    // Parse XLSX / XLS Excel ArrayBuffer
    parseExcelArrayBuffer: function(arrayBuffer) {
      if (!window.XLSX) {
        throw new Error("Excel Parser engine (SheetJS XLSX) is missing.");
      }

      const workbook = window.XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonRows = window.XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (!jsonRows || jsonRows.length === 0) {
        throw new Error("Uploaded Excel file contains no data rows.");
      }

      return processRawRows(jsonRows);
    },

    // Parse CSV Text
    parseZerodhaCSV: function(csvText) {
      if (!window.Papa) {
        throw new Error("CSV Parser engine (PapaParse) is missing.");
      }

      const results = window.Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false
      });

      if (!results.data || results.data.length === 0) {
        throw new Error("Uploaded CSV file contains no rows or invalid formatting.");
      }

      return processRawRows(results.data);
    }
  };

  function processRawRows(rawRows) {
    const parsedHoldings = [];
    let kiteCount = 0;
    let coinCount = 0;

    rawRows.forEach((row, index) => {
      // Clean keys
      const cleanedRow = {};
      Object.keys(row).forEach(k => {
        if (k) cleanedRow[k.trim().toLowerCase()] = row[k];
      });

      // Determine symbol / scheme name
      const symbol = cleanedRow['instrument'] || cleanedRow['symbol'] || cleanedRow['trading symbol'] || cleanedRow['scheme name'] || cleanedRow['scheme'] || cleanedRow['stock'] || cleanedRow['particulars'] || '';
      if (!symbol || String(symbol).toLowerCase().includes('total')) return;

      const symStr = String(symbol).trim();
      const isMutualFund = cleanedRow['scheme name'] || symStr.toLowerCase().includes('fund') || symStr.toLowerCase().includes('direct') || symStr.toLowerCase().includes('growth') || cleanedRow['units'] || cleanedRow['avg. nav'];

      // Parse numbers safely
      const qty = parseFloat(cleanNumber(cleanedRow['qty.'] || cleanedRow['qty'] || cleanedRow['quantity'] || cleanedRow['units'] || '0'));
      const avgCost = parseFloat(cleanNumber(cleanedRow['avg. cost'] || cleanedRow['avg cost'] || cleanedRow['buy price'] || cleanedRow['avg. nav'] || cleanedRow['avg nav'] || cleanedRow['buy avg'] || '0'));
      const ltp = parseFloat(cleanNumber(cleanedRow['ltp'] || cleanedRow['current price'] || cleanedRow['current nav'] || cleanedRow['nav'] || cleanedRow['last price'] || '0'));

      if (qty <= 0) return;

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
