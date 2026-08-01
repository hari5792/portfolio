const XLSX = require('xlsx');
const Papa = require('papaparse');

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { csvText, base64Data, fileName } = req.body || {};
    let result = null;

    if (base64Data) {
      const buffer = Buffer.from(base64Data, 'base64');
      result = parseExcelBuffer(buffer);
    } else if (csvText) {
      result = parseCSVText(csvText);
    } else {
      return res.status(400).json({ error: 'Please provide csvText or base64Data in JSON body.' });
    }

    return res.status(200).json({
      success: true,
      mode: 'Serverless Cloud Function',
      count: result.holdings.length,
      kiteCount: result.kiteCount,
      coinCount: result.coinCount,
      data: result.holdings
    });
  } catch (err) {
    console.error('[Serverless Parser Error]:', err.message);
    return res.status(500).json({ error: 'Serverless Parsing Error: ' + err.message });
  }
};

function parseExcelBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  let bestHoldings = [];
  let bestKite = 0;
  let bestCoin = 0;

  for (let s = 0; s < workbook.SheetNames.length; s++) {
    const worksheet = workbook.Sheets[workbook.SheetNames[s]];
    const rawGrid = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
    if (rawGrid && rawGrid.length > 0) {
      const parsed = process2DGrid(rawGrid);
      if (parsed.holdings.length > bestHoldings.length) {
        bestHoldings = parsed.holdings;
        bestKite = parsed.kiteCount;
        bestCoin = parsed.coinCount;
      }
    }
  }

  if (bestHoldings.length === 0) {
    throw new Error('No valid Zerodha holding rows found in Excel sheet.');
  }

  return { holdings: bestHoldings, kiteCount: bestKite, coinCount: bestCoin };
}

function parseCSVText(text) {
  const results2D = Papa.parse(text, { header: false, skipEmptyLines: true });
  if (results2D.data && results2D.data.length > 0) {
    const parsed = process2DGrid(results2D.data);
    if (parsed.holdings.length > 0) return parsed;
  }
  const results = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: false });
  return processRawObjects(results.data || []);
}

function process2DGrid(grid) {
  let headerRowIndex = -1, symbolColIdx = -1, qtyColIdx = -1, avgCostColIdx = -1, ltpColIdx = -1, presValColIdx = -1;

  const symbolKeywords = ['symbol', 'instrument', 'trading symbol', 'scheme name', 'stock', 'particulars', 'isin'];
  const qtyKeywords = ['quantity', 'qty.', 'qty', 'units', 'quantity available', 'holding qty', 'balance'];
  const avgCostKeywords = ['average price', 'avg. cost', 'avg cost', 'buy price', 'buy avg', 'cost price'];
  const ltpKeywords = ['ltp', 'current price', 'last price', 'previous closing price'];
  const presValKeywords = ['present value', 'cur. val', 'current value', 'market value'];

  for (let r = 0; r < Math.min(100, grid.length); r++) {
    const row = grid[r];
    if (!Array.isArray(row)) continue;

    let symIdx = -1, qIdx = -1, costIdx = -1, ltpIdx = -1, pValIdx = -1;
    row.forEach((cell, c) => {
      if (!cell) return;
      const str = String(cell).trim().toLowerCase();
      if (symIdx === -1 && symbolKeywords.some(k => str.includes(k))) symIdx = c;
      if (qIdx === -1 && qtyKeywords.some(k => str.includes(k))) qIdx = c;
      if (costIdx === -1 && avgCostKeywords.some(k => str.includes(k))) costIdx = c;
      if (ltpIdx === -1 && ltpKeywords.some(k => str.includes(k))) ltpIdx = c;
      if (pValIdx === -1 && presValKeywords.some(k => str.includes(k))) pValIdx = c;
    });

    if (symIdx !== -1 && (qIdx !== -1 || costIdx !== -1 || ltpIdx !== -1 || pValIdx !== -1)) {
      headerRowIndex = r; symbolColIdx = symIdx; qtyColIdx = qIdx; avgCostColIdx = costIdx; ltpColIdx = ltpIdx; presValColIdx = pValIdx;
      break;
    }
  }

  if (headerRowIndex === -1) return { holdings: [], kiteCount: 0, coinCount: 0 };

  const parsedHoldings = [];
  let kiteCount = 0, coinCount = 0;

  for (let r = headerRowIndex + 1; r < grid.length; r++) {
    const row = grid[r];
    if (!Array.isArray(row)) continue;

    const rawSym = symbolColIdx !== -1 ? row[symbolColIdx] : '';
    if (!rawSym) continue;

    const symStr = String(rawSym).trim();
    const lowerSym = symStr.toLowerCase();
    if (lowerSym.includes('total') || lowerSym.includes('summary') || lowerSym.includes('statement') || lowerSym === 'symbol') continue;

    let qty = qtyColIdx !== -1 ? parseFloat(cleanNumber(row[qtyColIdx])) : 0;
    let avgCost = avgCostColIdx !== -1 ? parseFloat(cleanNumber(row[avgCostColIdx])) : 0;
    let ltp = ltpColIdx !== -1 ? parseFloat(cleanNumber(row[ltpColIdx])) : 0;
    let presVal = presValColIdx !== -1 ? parseFloat(cleanNumber(row[presValColIdx])) : 0;

    if (isNaN(qty) || qty <= 0) {
      for (let c = symbolColIdx + 1; c < row.length; c++) {
        const num = parseFloat(cleanNumber(row[c]));
        if (!isNaN(num) && num > 0) { qty = num; break; }
      }
    }
    if (isNaN(qty) || qty <= 0) continue;

    if ((isNaN(ltp) || ltp <= 0) && presVal > 0 && qty > 0) ltp = presVal / qty;
    if (isNaN(ltp) || ltp <= 0) ltp = avgCost;
    if (isNaN(avgCost) || avgCost <= 0) avgCost = ltp;

    const isMutualFund = lowerSym.includes('fund') || lowerSym.includes('direct') || lowerSym.includes('growth') || lowerSym.includes('mf');
    if (isMutualFund) coinCount++; else kiteCount++;

    parsedHoldings.push({
      id: `custom-${Date.now()}-${r}`,
      type: isMutualFund ? 'Mutual Fund' : 'Stock',
      symbol: symStr.toUpperCase(),
      name: symStr,
      qty: qty,
      avgCost: avgCost,
      ltp: ltp,
      sector: isMutualFund ? 'Mutual Fund' : 'Equity Stock',
      marketCap: 'Multi Cap',
      source: isMutualFund ? 'Zerodha Coin' : 'Zerodha Kite'
    });
  }

  return { holdings: parsedHoldings, kiteCount: kiteCount, coinCount: coinCount };
}

function processRawObjects(rawRows) {
  const parsedHoldings = [];
  let kiteCount = 0, coinCount = 0;
  rawRows.forEach((row, index) => {
    const cleanedRow = {};
    Object.keys(row).forEach(k => { if (k) cleanedRow[k.trim().toLowerCase()] = row[k]; });
    const symbol = cleanedRow['instrument'] || cleanedRow['symbol'] || cleanedRow['trading symbol'] || cleanedRow['scheme name'] || cleanedRow['stock'] || cleanedRow['particulars'] || '';
    if (!symbol || String(symbol).toLowerCase().includes('total')) return;
    const symStr = String(symbol).trim();
    const qty = parseFloat(cleanNumber(cleanedRow['qty.'] || cleanedRow['qty'] || cleanedRow['quantity'] || cleanedRow['units'] || '0'));
    const avgCost = parseFloat(cleanNumber(cleanedRow['avg. cost'] || cleanedRow['avg cost'] || cleanedRow['buy price'] || '0'));
    const ltp = parseFloat(cleanNumber(cleanedRow['ltp'] || cleanedRow['current price'] || cleanedRow['last price'] || '0'));
    if (qty <= 0) return;
    const isMutualFund = symStr.toLowerCase().includes('fund') || symStr.toLowerCase().includes('growth');
    if (isMutualFund) coinCount++; else kiteCount++;
    parsedHoldings.push({
      id: `custom-${Date.now()}-${index}`,
      type: isMutualFund ? 'Mutual Fund' : 'Stock',
      symbol: symStr.toUpperCase(),
      name: symStr,
      qty: qty,
      avgCost: avgCost,
      ltp: ltp > 0 ? ltp : avgCost,
      sector: isMutualFund ? 'Mutual Fund' : 'Equity Stock',
      marketCap: 'Multi Cap',
      source: isMutualFund ? 'Zerodha Coin' : 'Zerodha Kite'
    });
  });
  return { holdings: parsedHoldings, kiteCount: kiteCount, coinCount: coinCount };
}

function cleanNumber(val) {
  if (typeof val === 'number') return val;
  if (!val) return '0';
  return String(val).replace(/[₹,%\s]/g, '').trim();
}
