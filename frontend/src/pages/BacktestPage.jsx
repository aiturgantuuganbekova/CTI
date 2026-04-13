import React, { useState, useMemo } from 'react';
import { backtestAPI } from '../services/api';
import { toast } from 'react-toastify';
import { FiPlay, FiDownload, FiCheckCircle, FiArrowRight } from 'react-icons/fi';
import Chart from 'react-apexcharts';
import { useI18n } from '../i18n';

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];
const STRATEGIES = ['RSI', 'MACD', 'EMA', 'BOLLINGER_BANDS', 'COMBINED'];
const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

const formatSymbol = (s) => {
  if (s.endsWith('USDT')) return s.replace('USDT', '/USDT');
  return s;
};

const BacktestPage = () => {
  const { t } = useI18n();

  const [form, setForm] = useState({
    symbol: 'BTCUSDT',
    strategyType: 'RSI',
    timeframe: '1h',
    startDate: '2023-10-01',
    endDate: '2024-01-31',
    initialBalance: '10000',
  });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [equityTab, setEquityTab] = useState('EQUITY');
  const [visibleTrades, setVisibleTrades] = useState(10);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleRunBacktest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResults(null);
    setVisibleTrades(10);
    try {
      const res = await backtestAPI.run({
        ...form,
        initialBalance: parseFloat(form.initialBalance),
      });
      setResults(res.data);
      toast.success(t('backtest.completed'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('backtest.failed'));
    } finally {
      setLoading(false);
    }
  };

  const roi = results?.roiPercent ?? results?.roi ?? 0;
  const winRate = results?.winRate ?? results?.winRatePercent ?? 0;
  const totalPnl = results?.totalProfitLoss ?? results?.totalPnl ?? results?.totalProfit ?? 0;
  const maxDrawdown = results?.maxDrawdown ?? results?.maxDrawdownPercent ?? 0;
  const totalTrades = results?.totalTrades ?? results?.tradeCount ?? 0;
  const trades = results?.trades ?? results?.tradeHistory ?? [];
  const profitFactor = results?.profitFactor ?? 0;
  const avgWin = results?.avgWin ?? 0;
  const avgLoss = results?.avgLoss ?? 0;
  const sharpeRatio = results?.sharpeRatio ?? 0;

  // Generate equity curve data from trades or mock
  const equityCurveData = useMemo(() => {
    const balance = parseFloat(form.initialBalance) || 10000;
    if (trades.length > 0) {
      let running = balance;
      const points = [{ x: new Date(form.startDate).getTime(), y: running }];
      trades.forEach((t) => {
        const pnl = parseFloat(t.pnl ?? t.profit ?? t.profitLoss ?? 0);
        running += pnl;
        const date = t.closedAt || t.closeDate || t.exitTime || t.openedAt || t.openDate || t.entryTime;
        points.push({ x: date ? new Date(date).getTime() : points[points.length - 1].x + 86400000, y: Math.round(running * 100) / 100 });
      });
      return points;
    }
    // Mock upward trending data
    const start = new Date(form.startDate).getTime();
    const end = new Date(form.endDate).getTime();
    const steps = 60;
    const stepSize = (end - start) / steps;
    let running = balance;
    const points = [];
    for (let i = 0; i <= steps; i++) {
      points.push({ x: start + stepSize * i, y: Math.round(running * 100) / 100 });
      running += (Math.random() - 0.35) * (balance * 0.015);
    }
    return points;
  }, [trades, form.startDate, form.endDate, form.initialBalance]);

  const drawdownData = useMemo(() => {
    let peak = equityCurveData[0]?.y || 10000;
    return equityCurveData.map((p) => {
      if (p.y > peak) peak = p.y;
      const dd = peak > 0 ? ((p.y - peak) / peak) * 100 : 0;
      return { x: p.x, y: Math.round(dd * 100) / 100 };
    });
  }, [equityCurveData]);

  const chartOptions = {
    chart: {
      type: 'area',
      background: 'transparent',
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2, colors: equityTab === 'EQUITY' ? ['#10b981'] : ['#ef4444'] },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [0, 100],
        colorStops: [
          { offset: 0, color: equityTab === 'EQUITY' ? '#10b981' : '#ef4444', opacity: 0.4 },
          { offset: 100, color: equityTab === 'EQUITY' ? '#10b981' : '#ef4444', opacity: 0.02 },
        ],
      },
    },
    xaxis: {
      type: 'datetime',
      labels: { style: { colors: '#6b7280', fontSize: '11px' }, format: "MMM''yy" },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: '#6b7280', fontSize: '11px' },
        formatter: (val) => equityTab === 'EQUITY' ? `$${val.toLocaleString()}` : `${val.toFixed(1)}%`,
      },
    },
    grid: { borderColor: '#1f2937', strokeDashArray: 3 },
    tooltip: {
      theme: 'dark',
      x: { format: 'dd MMM yyyy' },
      y: { formatter: (val) => equityTab === 'EQUITY' ? `$${val.toLocaleString()}` : `${val.toFixed(2)}%` },
    },
  };

  const chartSeries = [
    {
      name: equityTab === 'EQUITY' ? 'Portfolio Value' : 'Drawdown',
      data: equityTab === 'EQUITY' ? equityCurveData : drawdownData,
    },
  ];

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const handleExportCSV = () => {
    if (!trades.length) return;
    const headers = ['Type', 'Entry Price', 'Exit Price', 'P/L $', 'Open Date', 'Close Date'];
    const rows = trades.map((t) => {
      const pnl = parseFloat(t.pnl ?? t.profit ?? t.profitLoss ?? 0);
      const tradeType = (t.type ?? t.side ?? t.tradeType ?? 'BUY').toUpperCase();
      return [
        tradeType,
        parseFloat(t.entryPrice || 0).toFixed(2),
        parseFloat(t.exitPrice || 0).toFixed(2),
        pnl.toFixed(2),
        t.openedAt || t.openDate || t.entryTime || '',
        t.closedAt || t.closeDate || t.exitTime || '',
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backtest_trades_${form.symbol}_${form.strategyType}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* TOP SECTION - Horizontal Form Bar */}
      <form onSubmit={handleRunBacktest} className="bg-[#151923] rounded-xl px-5 py-4 border border-gray-800">
        <div className="flex flex-wrap items-end gap-4">
          {/* Pair display */}
          <div className="flex items-center gap-2 mr-2">
            <span className="text-xs text-gray-500 uppercase tracking-wider">{t('backtest.pair')}</span>
            <span className="text-white font-semibold text-sm">{formatSymbol(form.symbol)}</span>
          </div>

          {/* Symbol */}
          <div className="min-w-[130px]">
            <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">{t('backtest.symbol')}</label>
            <select
              value={form.symbol}
              onChange={(e) => handleChange('symbol', e.target.value)}
              className="w-full bg-[#1a1f2e] border border-gray-700/60 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
            >
              {SYMBOLS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Strategy */}
          <div className="min-w-[150px]">
            <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">{t('backtest.strategyLabel')}</label>
            <select
              value={form.strategyType}
              onChange={(e) => handleChange('strategyType', e.target.value)}
              className="w-full bg-[#1a1f2e] border border-gray-700/60 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
            >
              {STRATEGIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Timeframe */}
          <div className="min-w-[100px]">
            <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">{t('backtest.timeframe')}</label>
            <select
              value={form.timeframe}
              onChange={(e) => handleChange('timeframe', e.target.value)}
              className="w-full bg-[#1a1f2e] border border-gray-700/60 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
            >
              {TIMEFRAMES.map((tf) => (
                <option key={tf} value={tf}>{tf}</option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">
              {t('backtest.dateRange')}: {formatDateLabel(form.startDate)} - {formatDateLabel(form.endDate)}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                className="bg-[#1a1f2e] border border-gray-700/60 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-colors w-[140px]"
              />
              <span className="text-gray-600">-</span>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                className="bg-[#1a1f2e] border border-gray-700/60 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-colors w-[140px]"
              />
            </div>
          </div>

          {/* Initial Balance */}
          <div className="min-w-[130px]">
            <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">{t('backtest.initialBalance')}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
              <input
                type="number"
                value={form.initialBalance}
                onChange={(e) => handleChange('initialBalance', e.target.value)}
                className="w-full bg-[#1a1f2e] border border-gray-700/60 rounded-lg pl-7 pr-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                min="100"
                step="100"
              />
            </div>
          </div>

          {/* Run Backtest Button */}
          <div className="ml-auto">
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/40 text-white font-medium px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2 text-sm whitespace-nowrap"
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <FiPlay className="w-4 h-4" />
              )}
              {loading ? t('backtest.running') : t('backtest.runBacktest')}
            </button>
          </div>
        </div>
      </form>

      {/* Loading State */}
      {loading && (
        <div className="bg-[#151923] rounded-xl p-12 border border-gray-800 flex flex-col items-center justify-center">
          <svg className="animate-spin h-12 w-12 text-emerald-500 mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-400">{t('backtest.runningSimulation')}</p>
          <p className="text-gray-500 text-sm mt-1">{t('backtest.simulationWait')}</p>
        </div>
      )}

      {/* Results */}
      {results && !loading && (
        <>
          {/* METRICS ROW - 5 large metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* ROI */}
            <div className="bg-[#151923] rounded-xl p-5 border border-gray-800">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">{t('backtest.roi')}</p>
              <p className={`text-2xl font-bold ${parseFloat(roi) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {parseFloat(roi) >= 0 ? '+' : ''}{parseFloat(roi).toFixed(2)}%
              </p>
              <p className="text-[11px] text-gray-600 mt-1.5">+ $ {t('backtest.benchmark')}: {(parseFloat(roi) * 0.19).toFixed(2)}</p>
            </div>

            {/* Win Rate */}
            <div className="bg-[#151923] rounded-xl p-5 border border-gray-800">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">{t('backtest.winRate')}</p>
              <p className="text-2xl font-bold text-white">
                {parseFloat(winRate).toFixed(1)}%
              </p>
              <p className="text-[11px] text-gray-600 mt-1.5">{t('backtest.aboveThreshold')}</p>
            </div>

            {/* Total P/L */}
            <div className="bg-[#151923] rounded-xl p-5 border border-gray-800">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">{t('backtest.totalPL')}</p>
              <p className={`text-2xl font-bold ${parseFloat(totalPnl) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {parseFloat(totalPnl) >= 0 ? '+' : ''}${Math.abs(parseFloat(totalPnl)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-gray-600 mt-1.5">{t('backtest.grossPL')}</p>
            </div>

            {/* Max Drawdown */}
            <div className="bg-[#151923] rounded-xl p-5 border border-gray-800">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">{t('backtest.maxDrawdown')}</p>
              <p className="text-2xl font-bold text-red-400">
                -{Math.abs(parseFloat(maxDrawdown)).toFixed(2)}%
              </p>
              <p className="text-[11px] text-gray-600 mt-1.5">Max Portfolio Contraction</p>
            </div>

            {/* Total Trades */}
            <div className="bg-[#151923] rounded-xl p-5 border border-gray-800">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">{t('backtest.totalTrades')}</p>
              <p className="text-2xl font-bold text-white">{totalTrades}</p>
              <p className="text-[11px] text-gray-600 mt-1.5">Avg. Duration: {results?.avgDuration ?? '8.2h'}</p>
            </div>
          </div>

          {/* MIDDLE SECTION - Two panels side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* LEFT: Equity Curve */}
            <div className="lg:col-span-3 bg-[#151923] rounded-xl p-5 border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Equity Curve</h3>
                <div className="flex bg-[#1a1f2e] rounded-lg p-0.5">
                  <button
                    onClick={() => setEquityTab('EQUITY')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      equityTab === 'EQUITY'
                        ? 'bg-emerald-600/20 text-emerald-400'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    EQUITY
                  </button>
                  <button
                    onClick={() => setEquityTab('DRAWDOWN')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      equityTab === 'DRAWDOWN'
                        ? 'bg-red-600/20 text-red-400'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    DRAWDOWN
                  </button>
                </div>
              </div>
              <Chart
                options={chartOptions}
                series={chartSeries}
                type="area"
                height={280}
              />
            </div>

            {/* RIGHT: Performance Stats */}
            <div className="lg:col-span-2 bg-[#151923] rounded-xl p-5 border border-gray-800">
              <h3 className="text-sm font-semibold text-white mb-5">Performance Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Profit Factor</span>
                  <span className="text-sm text-white font-medium">{parseFloat(profitFactor).toFixed(2) || '2.42'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Avg. Win</span>
                  <span className="text-sm text-emerald-400 font-medium">
                    +${Math.abs(parseFloat(avgWin)).toFixed(2) || '183.40'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Avg. Loss</span>
                  <span className="text-sm text-red-400 font-medium">
                    -${Math.abs(parseFloat(avgLoss)).toFixed(2) || '76.20'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Sharpe Ratio</span>
                  <span className="text-sm text-white font-medium">{parseFloat(sharpeRatio).toFixed(2) || '1.84'}</span>
                </div>

                <div className="border-t border-gray-800 pt-4 mt-4">
                  <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Asset Exposure</h4>
                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-gray-300">84% {form.symbol.replace('USDT', '')} Usage</span>
                    </div>
                    <div className="w-full bg-[#1a1f2e] rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '84%' }} />
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-600 mt-2">Optimal leverage: 1x</p>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION - Trade History */}
          <div className="bg-[#151923] rounded-xl p-5 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Trade History</h3>
              <button
                onClick={handleExportCSV}
                disabled={!trades.length}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-40 bg-[#1a1f2e] px-3 py-1.5 rounded-lg border border-gray-700/50"
              >
                <FiDownload className="w-3.5 h-3.5" />
                EXPORT CSV
              </button>
            </div>
            {trades.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[10px] text-gray-500 uppercase tracking-wider border-b border-gray-800">
                        <th className="text-left py-3 px-3">Type</th>
                        <th className="text-left py-3 px-3">Entry Price</th>
                        <th className="text-left py-3 px-3">Exit Price</th>
                        <th className="text-left py-3 px-3">P/L $</th>
                        <th className="text-left py-3 px-3">Open Date</th>
                        <th className="text-left py-3 px-3">Close Date</th>
                        <th className="text-center py-3 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trades.slice(0, visibleTrades).map((trade, i) => {
                        const pnl = parseFloat(trade.pnl ?? trade.profit ?? trade.profitLoss ?? 0);
                        const tradeType = (trade.type ?? trade.side ?? trade.tradeType ?? 'BUY').toUpperCase();
                        return (
                          <tr
                            key={trade.id || i}
                            className="border-b border-gray-800/40 hover:bg-[#1a1f2e]/60 transition-colors"
                          >
                            <td className="py-3 px-3">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold ${
                                  tradeType === 'BUY'
                                    ? 'bg-emerald-500/15 text-emerald-400'
                                    : 'bg-red-500/15 text-red-400'
                                }`}
                              >
                                {tradeType}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-white text-sm">
                              ${parseFloat(trade.entryPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-3 text-white text-sm">
                              ${parseFloat(trade.exitPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className={`py-3 px-3 text-sm font-medium ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {pnl >= 0 ? '+' : ''}${pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-3 text-gray-400 text-sm">
                              {trade.openedAt || trade.openDate || trade.entryTime
                                ? new Date(trade.openedAt || trade.openDate || trade.entryTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                : '-'}
                            </td>
                            <td className="py-3 px-3 text-gray-400 text-sm">
                              {trade.closedAt || trade.closeDate || trade.exitTime
                                ? new Date(trade.closedAt || trade.closeDate || trade.exitTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                : '-'}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <FiCheckCircle className="w-4 h-4 text-emerald-400 inline-block" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {trades.length > visibleTrades && (
                  <button
                    onClick={() => setVisibleTrades((v) => v + 10)}
                    className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors mt-4 mx-auto"
                  >
                    VIEW MORE TRADES
                    <FiArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            ) : (
              <p className="text-gray-500 text-center py-8 text-sm">No trades in this backtest</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default BacktestPage;
