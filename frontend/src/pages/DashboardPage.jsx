import React, { useState, useEffect, useCallback } from 'react';
import Chart from 'react-apexcharts';
import { marketAPI, signalAPI } from '../services/api';
import { toast } from 'react-toastify';
import { FiActivity, FiTrendingUp } from 'react-icons/fi';

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];
const STRATEGIES = ['RSI', 'MACD', 'EMA', 'BOLLINGER_BANDS', 'COMBINED'];
const STRATEGY_LABELS = {
  RSI: 'RSI',
  MACD: 'MACD',
  EMA: 'EMA',
  BOLLINGER_BANDS: 'Bollinger',
  COMBINED: 'Combined',
};
const TIMEFRAMES = ['5m', '15m', '30m', '1h', '4h', '1d'];

const SIGNAL_EXPLANATIONS = {
  RSI: {
    BUY: 'RSI dropped below 30 — the asset entered the oversold zone, suggesting a potential bullish reversal.',
    SELL: 'RSI rose above 70 — the asset is overbought. A pullback or correction is likely.',
    HOLD: 'RSI is in the neutral range (30–70). No extreme readings — wait for a clearer signal.',
  },
  MACD: {
    BUY: 'MACD line crossed above the signal line, indicating building bullish momentum.',
    SELL: 'MACD line crossed below the signal line, indicating building bearish momentum.',
    HOLD: 'MACD shows no decisive crossover. Momentum is mixed — no trade recommended.',
  },
  EMA: {
    BUY: 'Price crossed above EMA 200, confirming a long-term uptrend.',
    SELL: 'Price crossed below EMA 200, confirming a long-term downtrend.',
    HOLD: 'Price is near the EMA levels. Trend direction is unclear — reduce position risk.',
  },
  BOLLINGER_BANDS: {
    BUY: "Price touched the lower Bollinger Band — statistically it's likely to revert toward the mean.",
    SELL: "Price touched the upper Bollinger Band — statistically it's likely to revert toward the mean.",
    HOLD: 'Price is within the Bollinger Bands range. No extreme volatility detected.',
  },
  COMBINED: {
    BUY: 'Multiple indicators align bullishly: RSI oversold + MACD bullish crossover + price above key EMA levels.',
    SELL: 'Multiple indicators align bearishly: RSI overbought + MACD bearish crossover + price below key EMA levels.',
    HOLD: 'Indicators show mixed signals. Conflicting evidence — better to wait for alignment.',
  },
};

const getExplanation = (strategyType, signalType) => {
  const st = (strategyType || '').toUpperCase();
  const sig = (signalType || '').toUpperCase();
  return (
    SIGNAL_EXPLANATIONS[st]?.[sig] ||
    (sig === 'BUY'
      ? 'Bullish signal detected by the algorithm.'
      : sig === 'SELL'
      ? 'Bearish signal detected by the algorithm.'
      : 'No clear directional signal at this time.')
  );
};

const SignalBadge = ({ type }) => {
  if (!type) return <span className="text-gray-500 text-xs">—</span>;
  const st = type.toUpperCase();
  if (st === 'BUY')
    return (
      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-500/15 text-green-400 border border-green-500/25">
        BUY
      </span>
    );
  if (st === 'SELL')
    return (
      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/25">
        SELL
      </span>
    );
  return (
    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">
      HOLD
    </span>
  );
};

const Spinner = ({ size = 6 }) => (
  <svg className={`animate-spin h-${size} w-${size} text-blue-500`} viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const DashboardPage = () => {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('1h');
  const [strategy, setStrategy] = useState('COMBINED');
  const [klines, setKlines] = useState([]);
  const [signals, setSignals] = useState([]);
  const [signal, setSignal] = useState(null);
  const [indicators, setIndicators] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [chartLoading, setChartLoading] = useState(true);

  const fetchKlines = useCallback(async () => {
    setChartLoading(true);
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
    } finally {
      setChartLoading(false);
    }
  }, [symbol, timeframe]);

  const fetchSignals = useCallback(async () => {
    try {
      const res = await signalAPI.getAll();
      const data = Array.isArray(res.data) ? res.data : res.data?.content || [];
      setSignals(data.slice(0, 12));
    } catch (err) {
      console.error('Failed to fetch signals:', err);
    }
  }, []);

  useEffect(() => {
    fetchKlines();
  }, [fetchKlines]);

  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 15000);
    return () => clearInterval(interval);
  }, [fetchSignals]);

  const handleAnalyze = async () => {
    setGenerating(true);
    setSignal(null);
    setIndicators(null);
    try {
      const [signalRes, indicatorRes] = await Promise.all([
        signalAPI.generate(symbol, strategy, timeframe),
        marketAPI.getIndicators(symbol, strategy, timeframe).catch(() => null),
      ]);
      setSignal(signalRes.data);
      if (indicatorRes) setIndicators(indicatorRes.data);
      fetchSignals();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Signal generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const chartOptions = {
    chart: {
      type: 'candlestick',
      height: 360,
      background: 'transparent',
      toolbar: { show: false },
      animations: { enabled: false },
    },
    theme: { mode: 'dark' },
    grid: { borderColor: '#1e293b' },
    xaxis: { type: 'datetime', labels: { style: { colors: '#475569' }, datetimeUTC: false } },
    yaxis: {
      opposite: true,
      tooltip: { enabled: true },
      labels: { style: { colors: '#475569' }, formatter: (val) => val?.toFixed(0) },
    },
    plotOptions: {
      candlestick: { colors: { upward: '#22c55e', downward: '#ef4444' } },
    },
    tooltip: { theme: 'dark' },
  };

  const signalType = signal ? (signal.signalType || signal.type || '').toUpperCase() : null;
  const signalColorClass =
    signalType === 'BUY' ? 'text-emerald-400' : signalType === 'SELL' ? 'text-red-400' : 'text-yellow-400';
  const signalBorderClass =
    signalType === 'BUY'
      ? 'border-emerald-500/30'
      : signalType === 'SELL'
      ? 'border-red-500/30'
      : signalType === 'HOLD'
      ? 'border-yellow-500/30'
      : 'border-gray-800';

  const rsiValue = indicators?.rsi ?? indicators?.RSI ?? null;
  const ema200 = indicators?.ema200 ?? indicators?.EMA_200 ?? indicators?.ema ?? null;
  const volatility = indicators?.volatility ?? indicators?.atr ?? null;
  const volatilityLabel = volatility
    ? volatility > 0.03
      ? 'High'
      : volatility > 0.015
      ? 'Medium'
      : 'Low'
    : null;
  const volatilityColor =
    volatilityLabel === 'High'
      ? 'text-red-400'
      : volatilityLabel === 'Medium'
      ? 'text-yellow-400'
      : 'text-emerald-400';

  return (
    <div className="space-y-5">
      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Symbol tabs */}
        <div className="flex items-center gap-1.5">
          {SYMBOLS.map((s) => (
            <button
              key={s}
              onClick={() => setSymbol(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                symbol === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#151923] text-gray-400 border border-gray-700/70 hover:border-gray-600'
              }`}
            >
              {s.replace('USDT', '')}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-gray-800 hidden sm:block" />

        {/* Timeframe */}
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                timeframe === tf ? 'bg-[#1e293b] text-white' : 'text-gray-600 hover:text-gray-300'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-gray-800 hidden sm:block" />

        {/* Strategy selector */}
        <select
          value={strategy}
          onChange={(e) => setStrategy(e.target.value)}
          className="bg-[#151923] border border-gray-700/70 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-blue-500/60 appearance-none cursor-pointer"
        >
          {STRATEGIES.map((s) => (
            <option key={s} value={s}>
              {STRATEGY_LABELS[s]}
            </option>
          ))}
        </select>

        {/* Analyze button */}
        <button
          onClick={handleAnalyze}
          disabled={generating}
          className="ml-auto flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold px-5 py-2 rounded-lg transition-colors"
        >
          {generating ? <Spinner size={3} /> : <FiActivity size={13} />}
          Analyze
        </button>
      </div>

      {/* Main: chart + signal panel */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Candlestick chart */}
        <div className="lg:col-span-3 bg-[#151923] rounded-xl p-5 border border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white font-semibold text-sm">
              {symbol} <span className="text-gray-600 font-normal">/ {timeframe}</span>
            </span>
            <FiTrendingUp className="text-gray-700" size={16} />
          </div>
          {chartLoading ? (
            <div className="flex items-center justify-center h-[360px]">
              <Spinner size={7} />
            </div>
          ) : klines.length > 0 ? (
            <Chart options={chartOptions} series={[{ data: klines }]} type="candlestick" height={360} />
          ) : (
            <div className="flex items-center justify-center h-[360px] text-gray-600 text-sm">
              No chart data
            </div>
          )}
        </div>

        {/* Signal panel */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Signal result */}
          <div className={`bg-[#151923] rounded-xl p-5 border ${signalBorderClass} flex-1`}>
            <h3 className="text-[10px] tracking-widest text-gray-500 uppercase font-semibold mb-4">
              Current Signal
            </h3>
            {signal ? (
              <>
                <div className={`text-5xl font-extrabold tracking-tight ${signalColorClass} mb-4`}>
                  {signalType}
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {getExplanation(signal.strategyType || strategy, signalType)}
                </p>
                <div className="mt-4 pt-4 border-t border-gray-800 flex flex-wrap gap-4 text-xs text-gray-500">
                  {signal.price && (
                    <span>
                      Entry:{' '}
                      <span className="text-white font-mono">
                        ${parseFloat(signal.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </span>
                  )}
                  {signal.confidence && (
                    <span>
                      Confidence:{' '}
                      <span className="text-white font-mono">{Math.round(signal.confidence)}%</span>
                    </span>
                  )}
                  <span>
                    Strategy: <span className="text-gray-300">{signal.strategyType || strategy}</span>
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-gray-600">
                <FiActivity size={28} className="mb-3 opacity-30" />
                <p className="text-sm text-center">
                  Select a symbol, strategy, and timeframe above, then click "Analyze".
                </p>
              </div>
            )}
          </div>

          {/* Indicator readings */}
          <div className="bg-[#151923] rounded-xl p-5 border border-gray-800">
            <h3 className="text-[10px] tracking-widest text-gray-500 uppercase font-semibold mb-4">
              Indicator Readings
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">RSI (14)</span>
                <span
                  className={`text-sm font-mono font-medium ${
                    rsiValue !== null
                      ? rsiValue > 70
                        ? 'text-red-400'
                        : rsiValue < 30
                        ? 'text-emerald-400'
                        : 'text-blue-400'
                      : 'text-gray-700'
                  }`}
                >
                  {rsiValue !== null ? rsiValue.toFixed(2) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">EMA (200)</span>
                <span className="text-sm font-mono text-gray-300">
                  {ema200 !== null
                    ? `$${Number(ema200).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`
                    : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Volatility</span>
                <span className={`text-sm font-medium ${volatilityLabel ? volatilityColor : 'text-gray-700'}`}>
                  {volatilityLabel || '—'}
                </span>
              </div>
            </div>
            {!signal && (
              <p className="text-[11px] text-gray-700 mt-4">Run "Analyze" to populate readings.</p>
            )}
          </div>
        </div>
      </div>

      {/* Live signals from monitoring */}
      <div className="bg-[#151923] rounded-xl p-5 border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">
            Live Signals
            <span className="text-gray-600 text-xs font-normal ml-2">auto-refreshes every 15s</span>
          </h2>
        </div>
        {signals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-600 text-[10px] uppercase tracking-wider border-b border-gray-800">
                  <th className="text-left py-2 px-3">Time</th>
                  <th className="text-left py-2 px-3">Symbol</th>
                  <th className="text-left py-2 px-3">Strategy</th>
                  <th className="text-left py-2 px-3">Signal</th>
                  <th className="text-left py-2 px-3">Price</th>
                  <th className="text-left py-2 px-3 hidden lg:table-cell">Why</th>
                </tr>
              </thead>
              <tbody>
                {signals.map((sig, i) => {
                  const sigType = (sig.signalType || sig.type || '').toUpperCase();
                  return (
                    <tr
                      key={sig.id || i}
                      className="border-b border-gray-800/40 hover:bg-[#1a1f2e] transition-colors"
                    >
                      <td className="py-2.5 px-3 text-gray-500 text-xs">
                        {sig.createdAt ? new Date(sig.createdAt).toLocaleTimeString() : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-white font-medium text-xs">{sig.symbol}</td>
                      <td className="py-2.5 px-3 text-gray-400 text-xs">{sig.strategyType || '—'}</td>
                      <td className="py-2.5 px-3">
                        <SignalBadge type={sigType} />
                      </td>
                      <td className="py-2.5 px-3 text-gray-300 text-xs font-mono">
                        $
                        {parseFloat(sig.price || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600 text-xs hidden lg:table-cell max-w-xs truncate">
                        {getExplanation(sig.strategyType, sigType)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-600 text-sm text-center py-10">
            No signals yet. Go to Settings → activate a strategy to start monitoring.
          </p>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
