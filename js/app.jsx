// Zerodha & Coin Portfolio Intelligence React Dashboard
const { useState, useEffect, useMemo, useRef } = React;

function App() {
  // Load initial holdings from localStorage or fallback to sample data
  const [holdings, setHoldings] = useState(() => {
    const saved = localStorage.getItem('zerodha_portfolio_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing saved portfolio", e);
      }
    }
    return window.SAMPLE_HOLDINGS || [];
  });

  const [activeTab, setActiveTab] = useState('holdings'); // 'holdings', 'losses', 'reinvest', 'guide'
  const [searchQuery, setSearchQuery] = useState('');
  const [assetFilter, setAssetFilter] = useState('ALL'); // 'ALL', 'Stock', 'Mutual Fund'
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [reinvestSubTab, setReinvestSubTab] = useState('avgDown'); // 'avgDown', 'sectorGaps', 'external'
  const [notification, setNotification] = useState(null);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('zerodha_portfolio_data', JSON.stringify(holdings));
  }, [holdings]);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Analytics Engine Outputs
  const summary = useMemo(() => {
    return window.PortfolioAnalytics.calculateSummary(holdings);
  }, [holdings]);

  const lossDiagnostics = useMemo(() => {
    return window.PortfolioAnalytics.getLossDiagnostics(holdings);
  }, [holdings]);

  const reinvestOpportunities = useMemo(() => {
    return window.PortfolioAnalytics.getReinvestmentOpportunities(holdings);
  }, [holdings]);

  const sectorDistribution = useMemo(() => {
    return window.PortfolioAnalytics.getSectorDistribution(holdings);
  }, [holdings]);

  // Filtered Holdings
  const filteredHoldings = useMemo(() => {
    return holdings.filter(h => {
      const matchesSearch = (h.symbol + ' ' + h.name + ' ' + h.sector).toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAsset = assetFilter === 'ALL' || h.type === assetFilter;
      const matchesSector = sectorFilter === 'ALL' || h.sector === sectorFilter;
      return matchesSearch && matchesAsset && matchesSector;
    });
  }, [holdings, searchQuery, assetFilter, sectorFilter]);

  const handleResetSample = () => {
    if (confirm("Reset portfolio to sample Zerodha & Coin data?")) {
      setHoldings(window.SAMPLE_HOLDINGS || []);
      showNotification("Reset to sample portfolio data.");
    }
  };

  const handleClearAll = () => {
    if (confirm("Clear all holdings? You can re-upload your Zerodha CSV anytime.")) {
      setHoldings([]);
      showNotification("All holdings cleared.", "info");
    }
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const text = evt.target.result;
        const parsed = window.PortfolioCSVParser.parseZerodhaCSV(text);
        if (parsed.holdings && parsed.holdings.length > 0) {
          setHoldings(parsed.holdings);
          setIsUploaderOpen(false);
          showNotification(`Successfully imported ${parsed.holdings.length} holdings (${parsed.kiteCount} Stocks, ${parsed.coinCount} Mutual Funds)!`);
        } else {
          alert("No valid holdings detected in CSV file.");
        }
      } catch (err) {
        alert("CSV Parsing Error: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Format currency in Indian Rupees (INR)
  const formatINR = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="min-h-screen pb-16">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-2xl border backdrop-blur-md transition-all animate-bounce ${
          notification.type === 'success' ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200' : 'bg-blue-950/80 border-blue-500/50 text-blue-200'
        }`}>
          <div className="flex items-center gap-3 font-medium">
            <span>{notification.type === 'success' ? '✓' : 'ℹ'}</span>
            <span>{notification.msg}</span>
          </div>
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Title & Badge */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-cyan-500/20">
                Z
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-white tracking-tight">Zerodha & Coin Portfolio</h1>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium">
                    No API Required
                  </span>
                </div>
                <p className="text-xs text-slate-400">P&L Loss Diagnostic & Smart Reinvestment Engine</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setIsUploaderOpen(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm transition shadow-lg shadow-cyan-500/25 flex items-center gap-2"
              >
                <span>📥</span> Upload Zerodha CSV
              </button>

              <button
                onClick={handleResetSample}
                className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 text-sm font-medium transition"
              >
                🔄 Reset Sample
              </button>

              <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2">
                <span className="pulse-dot"></span>
                <span>100% Private & Local</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Top Summary Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Card 1: Total Investment */}
          <div className="glass-card p-5">
            <div className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Total Invested</div>
            <div className="text-2xl font-bold text-white font-heading">{formatINR(summary.totalInvested)}</div>
            <div className="mt-3 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/60 pt-2">
              <span>Stocks: {formatINR(summary.stocksInvested)}</span>
              <span>MFs: {formatINR(summary.mfInvested)}</span>
            </div>
          </div>

          {/* Card 2: Current Value */}
          <div className="glass-card p-5">
            <div className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Current Portfolio Value</div>
            <div className="text-2xl font-bold text-cyan-300 font-heading">{formatINR(summary.currentValue)}</div>
            <div className="mt-3 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/60 pt-2">
              <span>{summary.stockCount} Stocks</span>
              <span>{summary.mfCount} Mutual Funds</span>
            </div>
          </div>

          {/* Card 3: Total P&L */}
          <div className="glass-card p-5">
            <div className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Overall Return (P&L)</div>
            <div className={`text-2xl font-bold font-heading ${summary.totalPnl >= 0 ? 'text-emerald-400 glow-green' : 'text-rose-400 glow-red'}`}>
              {summary.totalPnl >= 0 ? '+' : ''}{formatINR(summary.totalPnl)}
            </div>
            <div className="mt-3 text-xs flex items-center justify-between border-t border-slate-800/60 pt-2">
              <span className={summary.pnlPercentage >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                {summary.pnlPercentage >= 0 ? '▲' : '▼'} {summary.pnlPercentage.toFixed(2)}%
              </span>
              <span className="text-slate-400">Total Net Gain/Loss</span>
            </div>
          </div>

          {/* Card 4: Winners vs Losers */}
          <div className="glass-card p-5">
            <div className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Holding Ratio</div>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-2xl font-bold text-emerald-400 font-heading">{summary.winnersCount} <span className="text-xs text-emerald-500 font-normal">Profitable</span></span>
              <span className="text-slate-500">/</span>
              <span className="text-2xl font-bold text-rose-400 font-heading">{summary.losersCount} <span className="text-xs text-rose-500 font-normal">In Loss</span></span>
            </div>
            <div className="mt-3 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/60 pt-2">
              <span className="text-emerald-400">Profit: {formatINR(summary.totalProfitValue)}</span>
              <span className="text-rose-400">Loss: {formatINR(summary.totalLossValue)}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-1 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('holdings')}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'holdings'
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <span>📊</span> Portfolio Holdings ({holdings.length})
          </button>

          <button
            onClick={() => setActiveTab('losses')}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition flex items-center gap-2 whitespace-nowrap relative ${
              activeTab === 'losses'
                ? 'bg-gradient-to-r from-rose-500/20 to-orange-500/20 text-rose-300 border border-rose-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <span>📉</span> Where I Faced Loss
            {summary.losersCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-rose-500/30 text-rose-300 border border-rose-500/40">
                {summary.losersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('reinvest')}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'reinvest'
                ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <span>💡</span> Where to Put More Money
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'guide'
                ? 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-300 border border-purple-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <span>📁</span> How to Export Zerodha CSV
          </button>
        </div>

        {/* TAB 1: PORTFOLIO HOLDINGS */}
        {activeTab === 'holdings' && (
          <div className="space-y-6">
            {/* Search & Filter Bar */}
            <div className="glass-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search stock, symbol, or sector..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                />
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Asset type filter */}
                <select
                  value={assetFilter}
                  onChange={(e) => setAssetFilter(e.target.value)}
                  className="bg-slate-900/80 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-500"
                >
                  <option value="ALL">All Assets (Stocks & MFs)</option>
                  <option value="Stock">Zerodha Stocks Only</option>
                  <option value="Mutual Fund">Coin Mutual Funds Only</option>
                </select>

                {/* Sector filter */}
                <select
                  value={sectorFilter}
                  onChange={(e) => setSectorFilter(e.target.value)}
                  className="bg-slate-900/80 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-500"
                >
                  <option value="ALL">All Sectors</option>
                  {sectorDistribution.map(s => (
                    <option key={s.sector} value={s.sector}>{s.sector}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Holdings Table */}
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900/90 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4">Instrument</th>
                      <th className="px-6 py-4">Type / Source</th>
                      <th className="px-6 py-4 text-right">Qty</th>
                      <th className="px-6 py-4 text-right">Avg Cost</th>
                      <th className="px-6 py-4 text-right">LTP (Current)</th>
                      <th className="px-6 py-4 text-right">Invested</th>
                      <th className="px-6 py-4 text-right">Cur. Value</th>
                      <th className="px-6 py-4 text-right">P&L (₹ / %)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredHoldings.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-12 text-slate-500">
                          No holdings match your search criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredHoldings.map((item) => {
                        const invested = item.qty * item.avgCost;
                        const curr = item.qty * item.ltp;
                        const pnl = curr - invested;
                        const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;
                        const isProfit = pnl >= 0;

                        return (
                          <tr key={item.id} className="hover:bg-slate-800/40 transition">
                            <td className="px-6 py-4">
                              <div className="font-semibold text-white">{item.symbol}</div>
                              <div className="text-xs text-slate-400 flex items-center gap-2">
                                <span>{item.name}</span>
                                <span className="text-slate-600">•</span>
                                <span className="text-cyan-400/80">{item.sector}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium border ${
                                item.type === 'Mutual Fund' 
                                  ? 'bg-purple-500/10 text-purple-300 border-purple-500/20' 
                                  : 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                              }`}>
                                {item.source}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right font-mono text-slate-200">{item.qty.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right font-mono text-slate-300">₹{item.avgCost.toFixed(2)}</td>
                            <td className="px-6 py-4 text-right font-mono text-white font-medium">₹{item.ltp.toFixed(2)}</td>
                            <td className="px-6 py-4 text-right font-mono text-slate-300">{formatINR(invested)}</td>
                            <td className="px-6 py-4 text-right font-mono text-white font-medium">{formatINR(curr)}</td>
                            <td className="px-6 py-4 text-right">
                              <div className={`font-mono font-semibold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isProfit ? '+' : ''}{formatINR(pnl)}
                              </div>
                              <div className={`text-xs font-mono ${isProfit ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>
                                {isProfit ? '▲' : '▼'} {pnlPercent.toFixed(2)}%
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sector Allocation Breakdown */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Sector Allocation & Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sectorDistribution.map(s => (
                  <div key={s.sector} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-200">{s.sector}</div>
                      <div className="text-xs text-slate-400">{formatINR(s.value)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold text-cyan-300 font-mono">{s.percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LOSS DIAGNOSTICS ("Where I Faced Loss") */}
        {activeTab === 'losses' && (
          <div className="space-y-6">
            {/* Loss Summary Banner */}
            <div className="glass-card p-6 bg-gradient-to-r from-rose-950/30 via-slate-900 to-slate-900 border-rose-500/20">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-1">Total Loss Assessment</div>
                  <h2 className="text-2xl font-bold text-white">
                    Unrealized Loss: <span className="text-rose-400 font-mono">-{formatINR(summary.totalLossValue)}</span>
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    You have <span className="text-rose-300 font-semibold">{lossDiagnostics.lossItems.length} holdings</span> currently trading below your purchase average.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                    <div className="text-2xl font-bold text-rose-400 font-mono">{lossDiagnostics.severe.length}</div>
                    <div className="text-xs text-slate-400">Severe (-20%+)</div>
                  </div>

                  <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-center">
                    <div className="text-2xl font-bold text-orange-400 font-mono">{lossDiagnostics.moderate.length}</div>
                    <div className="text-xs text-slate-400">Moderate (-5% to -20%)</div>
                  </div>

                  <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-center">
                    <div className="text-2xl font-bold text-yellow-400 font-mono">{lossDiagnostics.minor.length}</div>
                    <div className="text-xs text-slate-400">Minor (&lt; -5%)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sector Drag Section */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Sectors Dragging Down Your Portfolio</h3>
              <p className="text-xs text-slate-400 mb-4">Sectors contributing the highest absolute rupee loss to your overall portfolio:</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {lossDiagnostics.sectorDrag.map(sd => (
                  <div key={sd.sector} className="p-4 rounded-xl bg-slate-900/80 border border-rose-500/20 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-200">{sd.sector}</div>
                      <div className="text-xs text-rose-400 font-mono">Total Loss: -{formatINR(sd.totalLoss)}</div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400 text-lg">
                      📉
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Loss Table */}
            <div className="glass-card overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="font-semibold text-white">Detailed Loss Breakdown ({lossDiagnostics.lossItems.length} Items)</h3>
                <span className="text-xs text-slate-400">Sorted by highest absolute loss</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900/90 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4">Instrument</th>
                      <th className="px-6 py-4">Severity Level</th>
                      <th className="px-6 py-4 text-right">Buy Avg</th>
                      <th className="px-6 py-4 text-right">LTP (Current)</th>
                      <th className="px-6 py-4 text-right">Invested</th>
                      <th className="px-6 py-4 text-right">Loss Amount (₹)</th>
                      <th className="px-6 py-4 text-right">Drawdown (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {lossDiagnostics.lossItems.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-12 text-emerald-400">
                          🎉 Congratulations! None of your holdings are currently at a loss.
                        </td>
                      </tr>
                    ) : (
                      lossDiagnostics.lossItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-800/40 transition">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-white">{item.symbol}</div>
                            <div className="text-xs text-slate-400">{item.name} • <span className="text-cyan-400/80">{item.sector}</span></div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-block px-3 py-1 rounded-lg text-xs font-semibold border ${item.severityBadgeClass}`}>
                              {item.severity}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-slate-300">₹{item.avgCost.toFixed(2)}</td>
                          <td className="px-6 py-4 text-right font-mono text-white">₹{item.ltp.toFixed(2)}</td>
                          <td className="px-6 py-4 text-right font-mono text-slate-300">{formatINR(item.invested)}</td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-rose-400">
                            -{formatINR(item.absLoss)}
                          </td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-rose-400">
                            ▼ {item.pnlPercent.toFixed(2)}%
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SMART REINVESTMENT ("Where to Put More Money") */}
        {activeTab === 'reinvest' && (
          <div className="space-y-6">
            {/* Header Description */}
            <div className="glass-card p-6 bg-gradient-to-r from-emerald-950/30 via-slate-900 to-slate-900 border-emerald-500/20">
              <h2 className="text-xl font-bold text-white mb-1">Capital Reinvestment & Allocation Engine</h2>
              <p className="text-sm text-slate-400">
                Discover smart avenues to deploy additional capital: Average down on high-conviction dips, fill sector gaps, or explore top-rated external stocks and ETFs.
              </p>

              {/* Subtabs */}
              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={() => setReinvestSubTab('avgDown')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                    reinvestSubTab === 'avgDown'
                      ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  🎯 Average-Down Opportunities ({reinvestOpportunities.averageDownCandidates.length})
                </button>

                <button
                  onClick={() => setReinvestSubTab('sectorGaps')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                    reinvestSubTab === 'sectorGaps'
                      ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  🌐 Sector Gap Analysis ({reinvestOpportunities.sectorGaps.length} Gaps)
                </button>

                <button
                  onClick={() => setReinvestSubTab('external')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                    reinvestSubTab === 'external'
                      ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  ⭐ Recommended Stocks & ETFs ({reinvestOpportunities.externalIdeas.length})
                </button>
              </div>
            </div>

            {/* SUBTAB 1: AVERAGE DOWN */}
            {reinvestSubTab === 'avgDown' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reinvestOpportunities.averageDownCandidates.length === 0 ? (
                  <div className="col-span-2 glass-card p-12 text-center text-slate-400">
                    No dip-averaging candidates detected at this time.
                  </div>
                ) : (
                  reinvestOpportunities.averageDownCandidates.map(c => (
                    <div key={c.id} className="glass-card p-5 hover:border-emerald-500/40 transition">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-lg font-bold text-white">{c.symbol}</div>
                          <div className="text-xs text-slate-400">{c.name} • <span className="text-cyan-400">{c.sector}</span></div>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {c.score}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 my-4 p-3 rounded-xl bg-slate-900/80 text-xs font-mono">
                        <div>
                          <span className="text-slate-500 block">Buy Avg Price</span>
                          <span className="text-slate-200 text-sm font-semibold">₹{c.avgCost.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Current Price (LTP)</span>
                          <span className="text-emerald-400 text-sm font-semibold">₹{c.ltp.toFixed(2)} ({c.pnlPercent.toFixed(1)}%)</span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-300 bg-emerald-950/30 border border-emerald-500/20 p-3 rounded-xl">
                        💡 <span className="font-semibold text-emerald-300">Strategy Rationale:</span> {c.actionNote}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* SUBTAB 2: SECTOR GAPS */}
            {reinvestSubTab === 'sectorGaps' && (
              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Missing High-Growth Indian Sectors</h3>
                <p className="text-xs text-slate-400 mb-6">
                  Adding exposure to these sectors helps diversify your portfolio against sector-specific downturns:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reinvestOpportunities.sectorGaps.map(sec => (
                    <div key={sec} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-white">{sec}</div>
                        <div className="text-xs text-emerald-400 mt-1">Recommended for Diversification</div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-sm">
                        +
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SUBTAB 3: EXTERNAL STOCKS & ETFS */}
            {reinvestSubTab === 'external' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reinvestOpportunities.externalIdeas.map(item => (
                  <div key={item.symbol} className="glass-card p-6 hover:border-cyan-500/40 transition">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-white">{item.symbol}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-medium">
                            {item.category}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">{item.name}</div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-bold text-white font-mono">₹{item.price.toFixed(2)}</div>
                        <div className="text-xs text-emerald-400">{item.risk}</div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-800/80 mb-3">
                      {item.rationale}
                    </p>

                    <div className="flex items-center gap-2 flex-wrap">
                      {item.tags.map(t => (
                        <span key={t} className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: HOW TO EXPORT ZERODHA CSV GUIDE */}
        {activeTab === 'guide' && (
          <div className="glass-card p-8 space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">How to Export CSV Files from Zerodha & Coin</h2>
              <p className="text-sm text-slate-400">
                Follow these simple steps to download your free holdings statement from Zerodha. No developer registration or API fees required.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Step 1: Kite */}
              <div className="p-6 rounded-2xl bg-slate-900/80 border border-cyan-500/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center">1</div>
                  <h3 className="text-lg font-bold text-white">Zerodha Kite (Stocks & ETFs)</h3>
                </div>

                <ol className="space-y-3 text-xs text-slate-300 list-decimal list-inside">
                  <li>Log into <a href="https://kite.zerodha.com" target="_blank" className="text-cyan-400 underline">kite.zerodha.com</a> on laptop or desktop.</li>
                  <li>Click on the <strong className="text-white">Holdings</strong> tab in the top navigation bar.</li>
                  <li>In the top right corner of your holdings list, click <strong className="text-cyan-300">Download CSV</strong> (or Download statement).</li>
                  <li>Save the `.csv` file on your computer and click the <strong className="text-cyan-300">Upload Zerodha CSV</strong> button in this dashboard!</li>
                </ol>
              </div>

              {/* Step 2: Coin */}
              <div className="p-6 rounded-2xl bg-slate-900/80 border border-purple-500/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center">2</div>
                  <h3 className="text-lg font-bold text-white">Zerodha Coin (Mutual Funds)</h3>
                </div>

                <ol className="space-y-3 text-xs text-slate-300 list-decimal list-inside">
                  <li>Log into <a href="https://coin.zerodha.com" target="_blank" className="text-purple-400 underline">coin.zerodha.com</a>.</li>
                  <li>Navigate to your <strong className="text-white">Mutual Fund Portfolio / Holdings</strong> page.</li>
                  <li>Click on <strong className="text-purple-300">Download CSV / Excel</strong> option.</li>
                  <li>Upload the downloaded file directly into this app. The system automatically merges your stocks and mutual funds!</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CSV UPLOADER MODAL */}
      {isUploaderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="glass-card max-w-lg w-full p-6 relative border-cyan-500/30">
            <button
              onClick={() => setIsUploaderOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold"
            >
              ✕
            </button>

            <h3 className="text-xl font-bold text-white mb-2">Upload Zerodha / Coin CSV</h3>
            <p className="text-xs text-slate-400 mb-6">
              Select your downloaded Zerodha Kite or Coin holdings CSV file. Your file will be processed 100% locally in your browser.
            </p>

            <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-2xl p-8 text-center bg-slate-900/50 transition cursor-pointer">
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleCSVUpload}
                className="hidden"
                id="csv-file-input"
              />
              <label htmlFor="csv-file-input" className="cursor-pointer">
                <div className="text-4xl mb-3">📁</div>
                <div className="text-sm font-semibold text-white mb-1">Click to select CSV File</div>
                <div className="text-xs text-slate-400">Supports Kite Holdings CSV & Coin Mutual Fund CSV</div>
              </label>
            </div>

            <div className="mt-6 flex items-center justify-between text-xs text-slate-400">
              <span>🔒 100% Private - No data sent to any server</span>
              <button
                onClick={() => setIsUploaderOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Render React App
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
