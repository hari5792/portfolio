const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5002;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
  res.json({ service: 'Analytics Microservice', status: 'UP', port: PORT, timestamp: new Date().toISOString() });
});

app.post('/analyze', (req, res) => {
  try {
    const holdings = req.body.holdings || [];
    const summary = calculateSummary(holdings);
    const lossDiagnostics = calculateLossDiagnostics(holdings);
    const sectorDistribution = calculateSectorDistribution(holdings);

    res.json({
      success: true,
      service: 'Analytics Microservice',
      summary: summary,
      lossDiagnostics: lossDiagnostics,
      sectorDistribution: sectorDistribution
    });
  } catch (err) {
    console.error('[Analytics Microservice Error]:', err.message);
    res.status(500).json({ error: 'Analytics Error: ' + err.message });
  }
});

function calculateSummary(holdings) {
  let totalInvested = 0, currentValue = 0, stocksValue = 0, mfValue = 0, stocksInvested = 0, mfInvested = 0;
  let stockCount = 0, mfCount = 0, winnersCount = 0, losersCount = 0, totalLossValue = 0, totalProfitValue = 0;

  holdings.forEach(item => {
    const invested = item.qty * item.avgCost;
    const curr = item.qty * item.ltp;
    const pnl = curr - invested;

    totalInvested += invested;
    currentValue += curr;

    if (item.type === 'Mutual Fund') {
      mfCount++; mfInvested += invested; mfValue += curr;
    } else {
      stockCount++; stocksInvested += invested; stocksValue += curr;
    }

    if (pnl >= 0) {
      winnersCount++; totalProfitValue += pnl;
    } else {
      losersCount++; totalLossValue += Math.abs(pnl);
    }
  });

  const totalPnl = currentValue - totalInvested;
  const pnlPercentage = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  return {
    totalInvested, currentValue, totalPnl, pnlPercentage,
    stocksValue, mfValue, stocksInvested, mfInvested,
    stockCount, mfCount, winnersCount, losersCount,
    totalLossValue, totalProfitValue
  };
}

function calculateLossDiagnostics(holdings) {
  const lossItems = [];
  const sectorLossMap = {};

  holdings.forEach(item => {
    const invested = item.qty * item.avgCost;
    const curr = item.qty * item.ltp;
    const pnl = curr - invested;
    const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;

    if (pnl < 0) {
      const absLoss = Math.abs(pnl);
      let severity = 'Minor Dip';
      let severityBadgeClass = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';

      if (pnlPercent <= -20) {
        severity = 'Severe Drawdown';
        severityBadgeClass = 'bg-red-500/20 text-red-400 border-red-500/40';
      } else if (pnlPercent <= -5) {
        severity = 'Moderate Loss';
        severityBadgeClass = 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      }

      lossItems.push({
        ...item, invested, currentValue: curr, pnl, pnlPercent, absLoss, severity, severityBadgeClass
      });

      sectorLossMap[item.sector] = (sectorLossMap[item.sector] || 0) + absLoss;
    }
  });

  lossItems.sort((a, b) => b.absLoss - a.absLoss);

  const severe = lossItems.filter(i => i.pnlPercent <= -20);
  const moderate = lossItems.filter(i => i.pnlPercent > -20 && i.pnlPercent <= -5);
  const minor = lossItems.filter(i => i.pnlPercent > -5);

  const sectorDrag = Object.keys(sectorLossMap).map(sec => ({
    sector: sec, totalLoss: sectorLossMap[sec]
  })).sort((a, b) => b.totalLoss - a.totalLoss);

  return { lossItems, severe, moderate, minor, sectorDrag };
}

function calculateSectorDistribution(holdings) {
  const map = {};
  let total = 0;
  holdings.forEach(h => {
    const curr = h.qty * h.ltp;
    total += curr;
    map[h.sector] = (map[h.sector] || 0) + curr;
  });
  return Object.keys(map).map(sec => ({
    sector: sec, value: map[sec], percentage: total > 0 ? (map[sec] / total) * 100 : 0
  })).sort((a, b) => b.value - a.value);
}

app.listen(PORT, () => {
  console.log(`[Analytics Microservice] Running on http://localhost:${PORT}`);
});
