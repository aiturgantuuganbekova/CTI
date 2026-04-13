import React, { useState, useEffect, useCallback } from 'react';
import Chart from 'react-apexcharts';
import { marketAPI, signalAPI } from '../services/api';
import { toast } from 'react-toastify';
import { FiCheckCircle, FiTarget, FiRefreshCw, FiBarChart2, FiTrendingUp } from 'react-icons/fi';
import { useI18n } from '../i18n';

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];
const TIMEFRAMES = ['5m', '15m', '30m', '1h', '4h', '1d'];

const DashboardPage = () => {
  const { t } = useI18n();
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('1h');
  const [price, setPrice] = useState(null);
  const [klines, setKlines] = useState([]);
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPrice = useCallback(async () => {
    try {
      const res = await marketAPI.getPrice(symbol);
      setPrice(res.data);
    } catch (err) {
      console.error('Failed to fetch price:', err);
    }
  }, [symbol]);

  const fetchKlines = useCallback(async () => {
    try {
      const res = await marketAPI.getKlines(symbol, timeframe, 100);
      const data = res.data;
      const formatted = (Array.isArray(data) ? data : []).map((k) => ({
        x: new Date(k.openTime || k.timestamp || k[0]),
        y: [
          parseFloat(k.open || k[1]),
          parseFloat(k.high || k[2]),
          parseFloat(k.low || k[3]),
          parseFloat(k.close || k[4]),
        ],
      }));
      setKlines(formatted);
    } catch (err) {
      console.error('Failed to fetch klines:', err);
    }
  }, [symbol, timeframe]);

  const fetchSignals = useCallback(async () => {
    try {
      const res = await signalAPI.getAll();
      const data = Array.isArray(res.data) ? res.data : res.data?.content || [];
      setSignals(data.slice(0, 5));
    } catch (err) {
      console.error('Failed to fetch signals:', err);
    }
  }, []);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchPrice(), fetchKlines(), fetchSignals()]);
      setLoading(false);
    };
    loadAll();
  }, [fetchPrice, fetchKlines, fetchSignals]);

  useEffect(() => {
    const interval = setInterval(fetchPrice, 10000);
    return () => clearInterval(interval);
  }, [fetchPrice]);

  const chartOptions = {
    chart: {
      type: 'candlestick',
      height: 450,
      background: '#151923',
      toolbar: { show: true, tools: { download: true, zoom: true, pan: true, reset: true } },
    },
    theme: { mode: 'dark' },
    grid: { borderColor: '#1e293b' },
    xaxis: {
      type: 'datetime',
      labels: { style: { colors: '#94a3b8' } },
    },
    yaxis: {
      opposite: true,
      tooltip: { enabled: true },
      labels: {
        style: { colors: '#94a3b8' },
        formatter: (val) => val?.toFixed(2),
      },
    },
    plotOptions: {
      candlestick: {
        colors: { upward: '#22c55e', downward: '#ef4444' },
      },
    },
    tooltip: { theme: 'dark' },
  };

  const chartSeries = [{ data: klines }];

  const signalTypeBadge = (type) => {
    if (!type) return <span className="text-gray-400">-</span>;
    const st = type.toUpperCase();
    if (st === 'BUY')
      return (
        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-green-500 text-white">
          BUY
        </span>
      );
    if (st === 'SELL')
      return (
        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-red-500 text-white">
          SELL
        </span>
      );
    return (
      <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-yellow-500 text-black">
        HOLD
      </span>
    );
  };

  const confidenceBar = (confidence) => {
    if (!confidence && confidence !== 0) return <span className="text-gray-500">-</span>;
    const pct = Math.round(confidence);
    let barColor = 'bg-green-500';
    if (pct < 50) barColor = 'bg-red-500';
    else if (pct < 70) barColor = 'bg-yellow-500';
    return (
      <div className="flex items-center gap-2">
        <div className="w-24 h-2 rounded-full bg-gray-700 overflow-hidden">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-gray-400 text-xs">{pct}%</span>
      </div>
    );
  };

  const metricCards = [
    {
      icon: <FiCheckCircle className="text-green-400" size={18} />,
      label: t('dashboard.roi'),
      value: '12.4%',
      valueColor: 'text-green-400',
      sub: '+2.3% ' + t('dashboard.roiSubtitle'),
      iconBg: 'bg-green-500/10',
    },
    {
      icon: <FiTarget className="text-blue-400" size={18} />,
      label: t('dashboard.winRate'),
      value: '68%',
      valueColor: 'text-white',
      sub: t('common.over') + ' 142 ' + t('dashboard.winRateSubtitle'),
      iconBg: 'bg-blue-500/10',
    },
    {
      icon: <FiRefreshCw className="text-purple-400" size={18} />,
      label: t('dashboard.activeSignals'),
      value: String(signals.length || 3),
      valueColor: 'text-white',
      sub: t('dashboard.activeSignalsSubtitle'),
      iconBg: 'bg-purple-500/10',
    },
    {
      icon: <FiBarChart2 className="text-orange-400" size={18} />,
      label: t('dashboard.totalTrades'),
      value: '142',
      valueColor: 'text-white',
      sub: t('dashboard.totalTradesSubtitle'),
      iconBg: 'bg-orange-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card) => (
          <div
            key={card.label}
            className="bg-[#151923] rounded-xl p-5 border border-gray-800 relative"
          >
            <div className={`absolute top-4 right-4 p-2 rounded-lg ${card.iconBg}`}>
              {card.icon}
            </div>
            <p className="text-gray-400 text-xs font-semibold tracking-wider mb-2">{card.label}</p>
            <p className={`text-3xl font-bold ${card.valueColor}`}>{card.value}</p>
            <p className="text-sm text-gray-500 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Symbol Tabs & Timeframe Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          {SYMBOLS.map((s) => (
            <button
              key={s}
              onClick={() => setSymbol(s)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                symbol === s
                  ? 'bg-green-500 text-white'
                  : 'bg-[#151923] text-gray-400 border border-gray-700 hover:border-gray-500'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                timeframe === tf
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#1a1f2e] text-gray-400 hover:text-white border border-gray-700/50'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Candlestick Chart */}
      <div className="bg-[#151923] rounded-xl p-5 border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FiTrendingUp className="text-green-400" />
            <h2 className="text-lg font-semibold text-white">{symbol} Price Chart</h2>
          </div>
          <span className="text-xs text-gray-500">{timeframe} timeframe</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-[450px]">
            <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : klines.length > 0 ? (
          <Chart options={chartOptions} series={chartSeries} type="candlestick" height={450} />
        ) : (
          <div className="flex items-center justify-center h-[450px] text-gray-500">
            {t('dashboard.noChartData')}
          </div>
        )}
      </div>

      {/* Recent Signals Table */}
      <div className="bg-[#151923] rounded-xl p-5 border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white tracking-wide">{t('dashboard.recentSignals')}</h2>
          <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
            {t('dashboard.exportData')}
          </button>
        </div>
        {signals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-800">
                  <th className="text-left py-3 px-3">{t('dashboard.time')}</th>
                  <th className="text-left py-3 px-3">{t('dashboard.symbol')}</th>
                  <th className="text-left py-3 px-3">{t('dashboard.strategyCol')}</th>
                  <th className="text-left py-3 px-3">{t('dashboard.signalType')}</th>
                  <th className="text-left py-3 px-3">{t('dashboard.price')}</th>
                  <th className="text-left py-3 px-3">{t('dashboard.confidence')}</th>
                </tr>
              </thead>
              <tbody>
                {signals.map((sig, i) => (
                  <tr
                    key={sig.id || i}
                    className="border-b border-gray-800/50 hover:bg-[#1a1f2e] transition-colors"
                  >
                    <td className="py-3 px-3 text-gray-500 text-xs">
                      {sig.createdAt ? new Date(sig.createdAt).toLocaleString() : '-'}
                    </td>
                    <td className="py-3 px-3 text-white font-medium">{sig.symbol}</td>
                    <td className="py-3 px-3 text-gray-300">{sig.strategyType || sig.strategy || '-'}</td>
                    <td className="py-3 px-3">
                      {signalTypeBadge(sig.signalType || sig.type)}
                    </td>
                    <td className="py-3 px-3 text-gray-300">
                      ${parseFloat(sig.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3">
                      {confidenceBar(sig.confidence)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">{t('dashboard.noSignals')}</p>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
