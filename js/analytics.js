// Portfolio Analytics & Reinvestment Recommendation Engine
(function() {
  window.PortfolioAnalytics = {
    calculateSummary: function(holdings) {
      if (!holdings || holdings.length === 0) {
        return {
          totalInvested: 0,
          currentValue: 0,
          totalPnl: 0,
          pnlPercentage: 0,
          stocksValue: 0,
          mfValue: 0,
          stocksInvested: 0,
          mfInvested: 0,
          stockCount: 0,
          mfCount: 0,
          winnersCount: 0,
          losersCount: 0,
          totalLossValue: 0,
          totalProfitValue: 0
        };
      }

      let totalInvested = 0;
      let currentValue = 0;
      let stocksValue = 0;
      let mfValue = 0;
      let stocksInvested = 0;
      let mfInvested = 0;
      let stockCount = 0;
      let mfCount = 0;
      let winnersCount = 0;
      let losersCount = 0;
      let totalLossValue = 0;
      let totalProfitValue = 0;

      holdings.forEach(item => {
        const invested = item.qty * item.avgCost;
        const curr = item.qty * item.ltp;
        const pnl = curr - invested;

        totalInvested += invested;
        currentValue += curr;

        if (item.type === 'Mutual Fund') {
          mfCount++;
          mfInvested += invested;
          mfValue += curr;
        } else {
          stockCount++;
          stocksInvested += invested;
          stocksValue += curr;
        }

        if (pnl >= 0) {
          winnersCount++;
          totalProfitValue += pnl;
        } else {
          losersCount++;
          totalLossValue += Math.abs(pnl);
        }
      });

      const totalPnl = currentValue - totalInvested;
      const pnlPercentage = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

      return {
        totalInvested: totalInvested,
        currentValue: currentValue,
        totalPnl: totalPnl,
        pnlPercentage: pnlPercentage,
        stocksValue: stocksValue,
        mfValue: mfValue,
        stocksInvested: stocksInvested,
        mfInvested: mfInvested,
        stockCount: stockCount,
        mfCount: mfCount,
        winnersCount: winnersCount,
        losersCount: losersCount,
        totalLossValue: totalLossValue,
        totalProfitValue: totalProfitValue
      };
    },

    getLossDiagnostics: function(holdings) {
      if (!holdings) return { lossItems: [], severe: [], moderate: [], minor: [], sectorDrag: [] };

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

          const lossObj = {
            ...item,
            invested: invested,
            currentValue: curr,
            pnl: pnl,
            pnlPercent: pnlPercent,
            absLoss: absLoss,
            severity: severity,
            severityBadgeClass: severityBadgeClass
          };

          lossItems.push(lossObj);

          // Sector loss map
          if (!sectorLossMap[item.sector]) {
            sectorLossMap[item.sector] = 0;
          }
          sectorLossMap[item.sector] += absLoss;
        }
      });

      // Sort loss items by magnitude of absolute loss
      lossItems.sort((a, b) => b.absLoss - a.absLoss);

      const severe = lossItems.filter(i => i.pnlPercent <= -20);
      const moderate = lossItems.filter(i => i.pnlPercent > -20 && i.pnlPercent <= -5);
      const minor = lossItems.filter(i => i.pnlPercent > -5);

      // Sector drag list
      const sectorDrag = Object.keys(sectorLossMap).map(sec => ({
        sector: sec,
        totalLoss: sectorLossMap[sec]
      })).sort((a, b) => b.totalLoss - a.totalLoss);

      return {
        lossItems: lossItems,
        severe: severe,
        moderate: moderate,
        minor: minor,
        sectorDrag: sectorDrag
      };
    },

    getReinvestmentOpportunities: function(holdings) {
      if (!holdings) return { averageDownCandidates: [], sectorGaps: [], externalIdeas: window.EXTERNAL_RECOMMENDATIONS || [] };

      // 1. Average Down Candidates (Existing holdings at a dip with solid fundamentals)
      const averageDownCandidates = [];
      holdings.forEach(item => {
        const invested = item.qty * item.avgCost;
        const curr = item.qty * item.ltp;
        const pnl = curr - invested;
        const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;

        // Focus on holdings down between -3% and -25% (Quality dips, avoiding bankrupt penny traps)
        if (pnlPercent < -2.5 && pnlPercent > -35.0 && item.symbol !== 'PAYTM' && item.symbol !== 'YESBANK') {
          let score = 'High Priority';
          let actionNote = `Currently down ${Math.abs(pnlPercent).toFixed(1)}% from your buy average ₹${item.avgCost.toFixed(2)}. Good zone to average down in tranches.`;
          
          if (item.type === 'Mutual Fund') {
            actionNote = `Fund NAV is down ${Math.abs(pnlPercent).toFixed(1)}%. Increasing SIP or adding lump sum will lower unit acquisition cost.`;
          }

          averageDownCandidates.push({
            ...item,
            pnlPercent: pnlPercent,
            score: score,
            actionNote: actionNote
          });
        }
      });

      // 2. Sector Gaps (Sectors not present or under-weighted in portfolio)
      const allMajorSectors = [
        'Banking & Financials',
        'IT & Software',
        'Automobile & EV',
        'Energy & Oil',
        'Renewable Energy',
        'FMCG',
        'Pharma & Healthcare',
        'Defence & Aerospace',
        'Infrastructure & Capital Goods',
        'Index Fund / ETF'
      ];

      const currentSectors = new Set(holdings.map(h => h.sector));
      const sectorGaps = allMajorSectors.filter(sec => !currentSectors.has(sec));

      return {
        averageDownCandidates: averageDownCandidates.sort((a, b) => a.pnlPercent - b.pnlPercent),
        sectorGaps: sectorGaps,
        externalIdeas: window.EXTERNAL_RECOMMENDATIONS || []
      };
    },

    getSectorDistribution: function(holdings) {
      if (!holdings || holdings.length === 0) return [];
      const map = {};
      let total = 0;

      holdings.forEach(h => {
        const curr = h.qty * h.ltp;
        total += curr;
        map[h.sector] = (map[h.sector] || 0) + curr;
      });

      return Object.keys(map).map(sec => ({
        sector: sec,
        value: map[sec],
        percentage: total > 0 ? (map[sec] / total) * 100 : 0
      })).sort((a, b) => b.value - a.value);
    }
  };
})();
