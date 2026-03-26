import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { signalAPI, tradeAPI, reportAPI } from '../services/api';
import { toast } from 'react-toastify';
import {
  FiFilter,
  FiTrendingUp,
  FiTrendingDown,
  FiActivity,
  FiDownload,
  FiClock,
  FiBarChart2,
  FiZap,
} from 'react-icons/fi';

const STRATEGIES = ['', 'RSI', 'MACD', 'EMA', 'BOLLINGER_BANDS', 'COMBINED'];
const SYMBOLS = ['', 'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];

const PLACEHOLDER_STRATEGIES = [
  {
    name: 'Momentum Scalper',
    roi: 18.4,
    winRate: 64.2,
    profitFactor: 2.14,
    positive: true,
  },
  {
    name: 'Mean Reversion',
    roi: 12.1,
    winRate: 71.8,
    profitFactor: 1.85,
    positive: true,
  },
  {
    name: 'Breakout King',
    roi: -2.4,
    winRate: 42.1,
    profitFactor: 0.92,
    positive: false,
  },
];

/* ------------------------------------------------------------------ */

const ReportsPage = () => {
  const [signals, setSignals] = useState([]);
  const [trades, setTrades] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterStrategy, setFilterStrategy] = useState('');
  const [filterSymbol, setFilterSymbol] = useState('BTCUSDT');

  /* ---- data fetching (unchanged logic) ---- */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const promises = [];

      if (filterStrategy || filterSymbol) {
        promises.push(
          signalAPI
            .getByStrategy(filterStrategy || undefined, filterSymbol || undefined)
            .catch(() => ({ data: [] }))
        );
        promises.push(
          reportAPI
            .getByStrategy(filterStrategy || undefined, filterSymbol || undefined)
            .catch(() => ({ data: [] }))
        );
      } else {
        promises.push(signalAPI.getAll().catch(() => ({ data: [] })));
        promises.push(reportAPI.getAll().catch(() => ({ data: [] })));
      }
      promises.push(tradeAPI.getAll().catch(() => ({ data: [] })));

      const [signalRes, reportRes, tradeRes] = await Promise.all(promises);

      const signalData = Array.isArray(signalRes.data)
        ? signalRes.data
        : signalRes.data?.content || [];
      setSignals(signalData);

      const reportData = Array.isArray(reportRes.data)
        ? reportRes.data
        : reportRes.data?.content || [];
      setReports(reportData);

      const tradeData = Array.isArray(tradeRes.data)
        ? tradeRes.data
        : tradeRes.data?.content || [];
      setTrades(tradeData);
    } catch {
      toast.error('Failed to load reports data');
    } finally {
      setLoading(false);
    }
  }, [filterStrategy, filterSymbol]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---- helpers ---- */
  const signalBadgeClass = (type) => {
    if (!type) return 'bg-gray-500/20 text-gray-400 border border-gray-600';
    const t = type.toUpperCase();
    if (t.includes('BUY') || t.includes('STRONG_BUY'))
      return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
    if (t.includes('SELL'))
      return 'bg-red-500/15 text-red-400 border border-red-500/30';
    return 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30';
  };

  const sideBadge = (side) => {
    const s = (side || '').toUpperCase();
    if (s === 'BUY' || s === 'LONG')
      return {
        label: 'Long',
        cls: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
      };
    return {
      label: 'Short',
      cls: 'bg-red-500/15 text-red-400 border border-red-500/30',
    };
  };

  /* derive strategy cards from reports or fallback to placeholders */
  const strategyCards = useMemo(() => {
    if (reports.length > 0) {
      return reports.slice(0, 3).map((r) => ({
        name: r.strategyType || r.strategy || 'Strategy',
        roi: parseFloat(r.roi || 0),
        winRate: parseFloat(r.winRate || 0),
        profitFactor: parseFloat(r.profitFactor || r.totalPnl || 0),
        positive: parseFloat(r.roi || 0) >= 0,
      }));
    }
    return PLACEHOLDER_STRATEGIES;
  }, [reports]);

  /* consolidated analytics */
  const analytics = useMemo(() => {
    const totalTrades = trades.length || 128;
    const wins = trades.filter(
      (t) => parseFloat(t.pnl ?? t.profit ?? t.profitLoss ?? 0) > 0
    ).length;
    const winRate = trades.length > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '42.5';
    const totalPnl = trades
      .reduce((sum, t) => sum + parseFloat(t.pnl ?? t.profit ?? t.profitLoss ?? 0), 0)
      .toFixed(2);
    const avgPnl =
      trades.length > 0 ? (parseFloat(totalPnl) / totalTrades).toFixed(2) : '1.40';
    const bestStrategy =
      reports.length > 0
        ? reports.reduce(
            (best, r) =>
              parseFloat(r.roi || 0) > parseFloat(best.roi || 0) ? r : best,
            reports[0]
          )
        : null;

    return { totalTrades, winRate, totalPnl, avgPnl, bestStrategy };
  }, [trades, reports]);

  /* avg P/L header for trade table */
  const avgPLDisplay = useMemo(() => {
    if (trades.length === 0) return '+1.4%';
    const totalPnl = trades.reduce(
      (s, t) => s + parseFloat(t.pnl ?? t.profit ?? t.profitLoss ?? 0),
      0
    );
    const avg = totalPnl / trades.length;
    return `${avg >= 0 ? '+' : ''}${avg.toFixed(1)}%`;
  }, [trades]);

  /* CSV export for signals */
  const exportCSV = () => {
    if (signals.length === 0) {
      toast.info('No signals to export');
      return;
    }
    const header = 'Timestamp,Signal,Price,Confidence\n';
    const rows = signals
      .map(
        (s) =>
          `${s.createdAt || ''},${(s.signalType || s.type || '').toUpperCase()},${s.price || ''},${s.confidence ? s.confidence.toFixed(1) + '%' : ''}`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'signal_history.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  /* ---- mini area chart SVG (decorative growth projection) ---- */
  const MiniAreaChart = () => {
    const points = [10, 18, 14, 24, 20, 30, 26, 38, 34, 42, 40, 50, 48, 56];
    const w = 280;
    const h = 80;
    const maxY = Math.max(...points);
    const step = w / (points.length - 1);
    const line = points
      .map((p, i) => `${i * step},${h - (p / maxY) * h}`)
      .join(' ');
    const area = `0,${h} ${line} ${w},${h}`;

    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20" preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#areaGrad)" />
        <polyline
          points={line}
          fill="none"
          stroke="#10b981"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  /* ================================================================ */
  /* RENDER                                                           */
  /* ================================================================ */
  return (
    <div className="space-y-6">
      {/* ===== TOP BAR ===== */}
      <div className="bg-[#151923] rounded-xl px-5 py-4 border border-gray-800 flex flex-wrap items-center gap-4">
        {/* Symbol dropdown */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">
            Symbol
          </label>
          <select
            value={filterSymbol}
            onChange={(e) => setFilterSymbol(e.target.value)}
            className="bg-[#1a1f2e] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 min-w-[130px]"
          >
            <option value="">All Symbols</option>
            {SYMBOLS.filter(Boolean).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Strategy dropdown */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">
            Strategy
          </label>
          <select
            value={filterStrategy}
            onChange={(e) => setFilterStrategy(e.target.value)}
            className="bg-[#1a1f2e] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 min-w-[150px]"
          >
            <option value="">All Strategies</option>
            {STRATEGIES.filter(Boolean).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Strategy name display */}
        <div className="hidden md:flex items-center gap-2 ml-2">
          <FiZap className="text-yellow-400" size={14} />
          <span className="text-sm text-gray-300 font-medium">
            Momentum Scalper v4.2
          </span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Price + badge + vol */}
        <div className="hidden lg:flex items-center gap-3">
          <span className="text-white font-semibold text-lg">$42,340.50</span>
          <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold px-2 py-0.5 rounded-full">
            +1.49%
          </span>
          <span className="text-gray-500 text-xs">Vol: 1.2B</span>
        </div>

        {/* Execute trade button (decorative) */}
        <button
          onClick={() => toast.info('Trade execution coming soon')}
          className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors tracking-wide"
        >
          EXECUTE TRADE
        </button>

        {/* Period filter */}
        <button className="bg-[#1a1f2e] border border-gray-700 text-gray-300 text-xs font-medium px-3 py-2 rounded-lg hover:border-gray-500 transition-colors flex items-center gap-1.5">
          <FiClock size={12} />
          Last 30 Days
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <svg
            className="animate-spin h-8 w-8 text-blue-500"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
      ) : (
        <>
          {/* ===== STRATEGY PERFORMANCE OVERVIEW ===== */}
          <div>
            <h2 className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-3">
              Strategy Performance Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {strategyCards.map((card, idx) => (
                <div
                  key={idx}
                  className="bg-[#151923] rounded-xl p-5 border border-gray-800 hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-white font-semibold text-sm">
                      {card.name}
                    </span>
                    {card.positive ? (
                      <FiTrendingUp className="text-emerald-400" size={18} />
                    ) : (
                      <FiTrendingDown className="text-red-400" size={18} />
                    )}
                  </div>
                  <div
                    className={`text-2xl font-bold mb-4 ${card.positive ? 'text-emerald-400' : 'text-red-400'}`}
                  >
                    {card.positive ? '+' : ''}
                    {card.roi.toFixed(1)}% ROI
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <span className="text-gray-500 text-xs block">Win Rate</span>
                      <span className="text-white font-medium">
                        {card.winRate.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs block">
                        Profit Factor
                      </span>
                      <span className="text-white font-medium">
                        {card.profitFactor.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ===== MIDDLE SECTION: Signal + Trade History ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* -- Signal History -- */}
            <div className="bg-[#151923] rounded-xl p-5 border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FiActivity className="text-blue-400" size={16} />
                  <h3 className="text-white font-semibold text-sm">
                    Signal History
                  </h3>
                </div>
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-semibold tracking-wide transition-colors"
                >
                  <FiDownload size={12} />
                  EXPORT CSV
                </button>
              </div>

              {signals.length > 0 ? (
                <div className="overflow-x-auto max-h-[380px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-[#151923]">
                      <tr className="text-gray-500 border-b border-gray-800 uppercase tracking-wider">
                        <th className="text-left py-2 px-2 font-medium">Timestamp</th>
                        <th className="text-left py-2 px-2 font-medium">Signal</th>
                        <th className="text-right py-2 px-2 font-medium">Price</th>
                        <th className="text-right py-2 px-2 font-medium">Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {signals.slice(0, 20).map((sig, i) => {
                        const sigType = (sig.signalType || sig.type || '').toUpperCase();
                        const stratLabel = sig.strategyType || sig.strategy || '';
                        const badgeText = sigType
                          ? `${sigType}${stratLabel ? ' - ' + stratLabel : ''}`
                          : '-';

                        return (
                          <tr
                            key={sig.id || i}
                            className="border-b border-gray-800/40 hover:bg-[#1a1f2e]/60 transition-colors"
                          >
                            <td className="py-2.5 px-2 text-gray-400 whitespace-nowrap">
                              {sig.createdAt
                                ? new Date(sig.createdAt).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '-'}
                            </td>
                            <td className="py-2.5 px-2">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${signalBadgeClass(sigType)}`}
                              >
                                {badgeText}
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-right text-gray-300 font-mono">
                              ${parseFloat(sig.price || 0).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className="py-2.5 px-2 text-right text-gray-300">
                              {sig.confidence
                                ? `${sig.confidence.toFixed(1)}%`
                                : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-600 text-center py-10 text-sm">
                  No signals found
                </p>
              )}
            </div>

            {/* -- Trade History -- */}
            <div className="bg-[#151923] rounded-xl p-5 border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FiBarChart2 className="text-purple-400" size={16} />
                  <h3 className="text-white font-semibold text-sm">
                    Trade History
                  </h3>
                </div>
                <span className="text-xs font-semibold text-gray-400">
                  <span className="text-gray-500 mr-1">&#916;</span>AVG P/L:{' '}
                  <span
                    className={
                      avgPLDisplay.startsWith('+')
                        ? 'text-emerald-400'
                        : avgPLDisplay.startsWith('-')
                          ? 'text-red-400'
                          : 'text-gray-300'
                    }
                  >
                    {avgPLDisplay}
                  </span>
                </span>
              </div>

              {trades.length > 0 ? (
                <div className="overflow-x-auto max-h-[380px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-[#151923]">
                      <tr className="text-gray-500 border-b border-gray-800 uppercase tracking-wider">
                        <th className="text-left py-2 px-2 font-medium">Asset</th>
                        <th className="text-left py-2 px-2 font-medium">Date</th>
                        <th className="text-left py-2 px-2 font-medium">Side</th>
                        <th className="text-right py-2 px-2 font-medium">Size</th>
                        <th className="text-right py-2 px-2 font-medium">P/L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trades.slice(0, 20).map((trade, i) => {
                        const pnl = parseFloat(
                          trade.pnl ?? trade.profit ?? trade.profitLoss ?? 0
                        );
                        const entry = parseFloat(trade.entryPrice || 0);
                        const pnlPct =
                          entry > 0 ? ((pnl / entry) * 100).toFixed(2) : '0.00';
                        const badge = sideBadge(trade.type || trade.side);

                        return (
                          <tr
                            key={trade.id || i}
                            className="border-b border-gray-800/40 hover:bg-[#1a1f2e]/60 transition-colors"
                          >
                            <td className="py-2.5 px-2 text-white font-medium whitespace-nowrap">
                              {trade.symbol || '-'}
                            </td>
                            <td className="py-2.5 px-2 text-gray-400 whitespace-nowrap">
                              {(trade.openedAt || trade.createdAt)
                                ? new Date(trade.openedAt || trade.createdAt).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '-'}
                            </td>
                            <td className="py-2.5 px-2">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${badge.cls}`}
                              >
                                {badge.label}
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-right text-gray-300 font-mono">
                              {trade.quantity || trade.size || '-'}
                            </td>
                            <td className="py-2.5 px-2 text-right whitespace-nowrap">
                              <span
                                className={`font-semibold ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                              >
                                {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                              </span>
                              <span className="text-gray-500 ml-1 text-[10px]">
                                {pnl >= 0 ? '+' : ''}
                                {pnlPct}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-600 text-center py-10 text-sm">
                  No trades found
                </p>
              )}
            </div>
          </div>

          {/* ===== CONSOLIDATED ANALYTICS ===== */}
          <div className="bg-[#151923] rounded-xl p-6 border border-gray-800">
            <h2 className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-5">
              Consolidated Analytics
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left: text summary + buttons */}
              <div className="lg:col-span-3 flex flex-col justify-between">
                <p className="text-gray-400 text-sm leading-relaxed mb-5">
                  Your reporting period covers{' '}
                  <span className="text-white font-medium">
                    {analytics.totalTrades} trades
                  </span>{' '}
                  with an overall win rate of{' '}
                  <span className="text-white font-medium">
                    {analytics.winRate}%
                  </span>
                  . The average P/L per trade is{' '}
                  <span
                    className={`font-medium ${parseFloat(analytics.avgPnl) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                  >
                    ${analytics.avgPnl}
                  </span>
                  {analytics.bestStrategy && (
                    <>
                      {'. '}
                      <span className="text-white font-medium">
                        {analytics.bestStrategy.strategyType ||
                          analytics.bestStrategy.strategy}
                      </span>{' '}
                      delivered the highest ROI of{' '}
                      <span className="text-emerald-400 font-medium">
                        {parseFloat(analytics.bestStrategy.roi || 0).toFixed(1)}%
                      </span>
                    </>
                  )}
                  . Net cumulative P/L stands at{' '}
                  <span
                    className={`font-medium ${parseFloat(analytics.totalPnl) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                  >
                    ${analytics.totalPnl}
                  </span>
                  . Consider reviewing under-performing strategies and adjusting
                  position sizing to optimise risk-adjusted returns.
                </p>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => toast.info('Coming soon')}
                    className="flex items-center gap-2 border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 text-xs font-semibold px-4 py-2 rounded-lg transition-colors tracking-wide"
                  >
                    <FiDownload size={13} />
                    DOWNLOAD REPORT
                  </button>
                  <button
                    onClick={() => toast.info('Coming soon')}
                    className="flex items-center gap-2 border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 text-xs font-semibold px-4 py-2 rounded-lg transition-colors tracking-wide"
                  >
                    <FiClock size={13} />
                    SCHEDULE AUTO-REPORT
                  </button>
                </div>
              </div>

              {/* Right: mini chart */}
              <div className="lg:col-span-2 flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-2">
                  Live Growth Projection
                </span>
                <div className="flex-1 bg-[#1a1f2e] rounded-lg p-3 border border-gray-800 flex items-end">
                  <MiniAreaChart />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsPage;
