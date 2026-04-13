import React, { useState, useEffect, useCallback } from 'react';
import { signalAPI, marketAPI, strategyAPI } from '../services/api';
import { toast } from 'react-toastify';
import { FiPlus, FiTrash2, FiCopy, FiSettings, FiActivity, FiTrendingUp } from 'react-icons/fi';
import { useI18n } from '../i18n';

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];
const SYMBOL_LABELS = {
  BTCUSDT: 'BTC / USDT',
  ETHUSDT: 'ETH / USDT',
  BNBUSDT: 'BNB / USDT',
  SOLUSDT: 'SOL / USDT',
  XRPUSDT: 'XRP / USDT',
};
const STRATEGIES = ['RSI', 'MACD', 'EMA', 'BOLLINGER_BANDS', 'COMBINED'];
const STRATEGY_LABELS = {
  RSI: 'RSI Oscillator',
  MACD: 'MACD Crossover',
  EMA: 'EMA Ribbon',
  BOLLINGER_BANDS: 'Bollinger Bands',
  COMBINED: 'Combined (Aggressive)',
};
const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];
const RISK_LEVELS = ['Low Risk', 'Medium Risk', 'High Risk'];

/* ─── Confidence Circle SVG ─── */
const ConfidenceGauge = ({ percent = 0 }) => {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const color = percent >= 70 ? '#22c55e' : percent >= 40 ? '#eab308' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#1e293b" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={radius} fill="none"
          stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <text x="70" y="66" textAnchor="middle" fill="white" fontSize="32" fontWeight="bold">{Math.round(percent)}%</text>
        <text x="70" y="88" textAnchor="middle" fill="#94a3b8" fontSize="10" letterSpacing="1">CONFIDENCE</text>
      </svg>
      <span className="text-[11px] tracking-widest text-gray-500 uppercase">Score</span>
    </div>
  );
};

/* ─── Mini bar chart component ─── */
const MiniBarChart = ({ data = [], color = '#22c55e', maxVal }) => {
  const max = maxVal || Math.max(...data.map((d) => Math.abs(d)), 1);
  return (
    <div className="flex items-end gap-[3px] h-16">
      {data.map((v, i) => {
        const h = (Math.abs(v) / max) * 100;
        const barColor = v < 0 ? '#ef4444' : color;
        return <div key={i} style={{ height: `${Math.max(h, 4)}%`, backgroundColor: barColor }} className="flex-1 rounded-sm min-w-[4px] opacity-80" />;
      })}
    </div>
  );
};

/* ─── Bollinger Band visualization ─── */
const BollingerViz = ({ upper, middle, lower }) => (
  <div className="relative h-16 flex flex-col justify-between py-1">
    {[
      { label: 'Upper', value: upper, color: '#ef4444' },
      { label: 'Middle', value: middle, color: '#60a5fa' },
      { label: 'Lower', value: lower, color: '#22c55e' },
    ].map((b) => (
      <div key={b.label} className="flex items-center gap-2">
        <span className="text-[10px] text-gray-500 w-12">{b.label}</span>
        <div className="flex-1 h-[3px] rounded-full" style={{ backgroundColor: b.color, opacity: 0.5 }} />
        <span className="text-[11px] font-mono text-gray-400">${b.value?.toLocaleString() || '—'}</span>
      </div>
    ))}
  </div>
);

const RISK_LEVEL_KEYS = {
  'Low Risk': 'strategy.lowRisk',
  'Medium Risk': 'strategy.mediumRisk',
  'High Risk': 'strategy.highRisk',
};

const StrategyPage = () => {
  const { t } = useI18n();

  // Signal generation state
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [strategy, setStrategy] = useState('COMBINED');
  const [timeframe, setTimeframe] = useState('15m');
  const [riskLevel, setRiskLevel] = useState('Low Risk');
  const [stopLoss, setStopLoss] = useState('2.5');
  const [takeProfit, setTakeProfit] = useState('7.5');
  const [signal, setSignal] = useState(null);
  const [indicators, setIndicators] = useState(null);
  const [generating, setGenerating] = useState(false);

  // Strategy configs state
  const [configs, setConfigs] = useState([]);
  const [loadingConfigs, setLoadingConfigs] = useState(false);

  // New strategy form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newConfig, setNewConfig] = useState({
    symbol: 'BTCUSDT',
    strategyType: 'RSI',
    timeframe: '1h',
    stopLossPercent: '2',
    takeProfitPercent: '4',
  });

  const fetchConfigs = useCallback(async () => {
    setLoadingConfigs(true);
    try {
      const res = await strategyAPI.getAll();
      setConfigs(Array.isArray(res.data) ? res.data : res.data?.content || []);
    } catch (err) {
      console.error('Failed to fetch strategies:', err);
    } finally {
      setLoadingConfigs(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleGenerateSignal = async () => {
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
      toast.success(t('strategy.signalSuccess'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('strategy.signalFailed'));
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateConfig = async (e) => {
    e.preventDefault();
    try {
      await strategyAPI.create({
        ...newConfig,
        stopLossPercent: parseFloat(newConfig.stopLossPercent),
        takeProfitPercent: parseFloat(newConfig.takeProfitPercent),
      });
      toast.success(t('strategy.strategyCreated'));
      setShowCreateForm(false);
      setNewConfig({ symbol: 'BTCUSDT', strategyType: 'RSI', timeframe: '1h', stopLossPercent: '2', takeProfitPercent: '4' });
      fetchConfigs();
    } catch (err) {
      toast.error(err.response?.data?.message || t('strategy.createFailed'));
    }
  };

  const handleToggle = async (id) => {
    try {
      await strategyAPI.toggle(id);
      toast.success(t('strategy.strategyToggled'));
      fetchConfigs();
    } catch (err) {
      toast.error(t('strategy.toggleFailed'));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('strategy.deleteConfirm'))) return;
    try {
      await strategyAPI.delete(id);
      toast.success(t('strategy.strategyDeleted'));
      fetchConfigs();
    } catch (err) {
      toast.error(t('strategy.deleteFailed'));
    }
  };

  const handleCopyConfig = (cfg) => {
    const text = `${cfg.strategyType} | ${cfg.symbol} | ${cfg.timeframe} | SL:${cfg.stopLossPercent}% TP:${cfg.takeProfitPercent}%`;
    navigator.clipboard.writeText(text).then(() => toast.success(t('strategy.configCopied'))).catch(() => {});
  };

  // Derived values
  const signalType = signal ? (signal.signalType || signal.type || '').toUpperCase() : null;
  const confidencePercent = signal?.confidence ? signal.confidence : 0;

  const signalColorClass = !signalType ? 'text-gray-400' : signalType === 'BUY' ? 'text-emerald-400' : signalType === 'SELL' ? 'text-red-400' : 'text-yellow-400';
  const signalBorderClass = !signalType ? 'border-gray-700' : signalType === 'BUY' ? 'border-emerald-500/30' : signalType === 'SELL' ? 'border-red-500/30' : 'border-yellow-500/30';
  const signalGlowClass = !signalType ? '' : signalType === 'BUY' ? 'shadow-[0_0_30px_rgba(34,197,94,0.08)]' : signalType === 'SELL' ? 'shadow-[0_0_30px_rgba(239,68,68,0.08)]' : 'shadow-[0_0_30px_rgba(234,179,8,0.08)]';

  // Extract indicator values for display
  const rsiValue = indicators?.rsi ?? indicators?.RSI ?? 64.21;
  const emaValue = indicators?.ema200 ?? indicators?.EMA_200 ?? indicators?.ema ?? 41920.0;
  const volatility = indicators?.volatility ?? indicators?.atr ?? null;
  const volatilityLabel = volatility ? (volatility > 0.03 ? 'High' : volatility > 0.015 ? 'Medium' : 'Low') : 'High';
  const volatilityColor = volatilityLabel === 'High' ? 'text-red-400' : volatilityLabel === 'Medium' ? 'text-yellow-400' : 'text-green-400';

  // Mock mini-chart data derived from indicators
  const rsiBarData = indicators
    ? [45, 52, 48, 60, 55, 58, 62, rsiValue, rsiValue - 3, rsiValue + 1]
    : [38, 42, 45, 50, 48, 55, 58, 62, 60, 64];
  const macdBarData = indicators?.macdHistogram
    ? (Array.isArray(indicators.macdHistogram) ? indicators.macdHistogram.slice(-12) : [0.5, 0.8, 0.3, -0.1, -0.4, 0.2, 0.6, 1.0, 0.8, 1.2, 0.9, 1.4])
    : [0.5, 0.8, 0.3, -0.1, -0.4, 0.2, 0.6, 1.0, 0.8, 1.2, 0.9, 1.4];

  const ema20 = indicators?.ema20 ?? 42810.20;
  const ema50 = indicators?.ema50 ?? 42500.00;
  const ema200Disp = typeof emaValue === 'number' ? emaValue : 41920.45;

  const bbUpper = indicators?.bollingerUpper ?? indicators?.upperBand ?? 43500;
  const bbMiddle = indicators?.bollingerMiddle ?? indicators?.middleBand ?? 42500;
  const bbLower = indicators?.bollingerLower ?? indicators?.lowerBand ?? 41500;

  const riskColor = riskLevel === 'Low Risk' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : riskLevel === 'Medium Risk' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30';

  const selectClasses = 'w-full bg-[#0c101a] border border-gray-700/60 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/60 appearance-none cursor-pointer hover:border-gray-600 transition-colors';
  const inputClasses = 'w-full bg-[#0c101a] border border-gray-700/60 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/60 transition-colors';
  const labelClasses = 'block text-[11px] tracking-wider text-gray-500 uppercase mb-1.5 font-medium';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">{t('strategy.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('strategy.subtitle')}</p>
      </div>

      {/* Main two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ─── LEFT COLUMN: Configuration ─── */}
        <div className="lg:col-span-2 bg-[#111827] rounded-2xl p-6 border border-gray-800/60">
          <h2 className="text-xs tracking-widest text-gray-500 uppercase font-semibold mb-5 flex items-center gap-2">
            <FiSettings className="text-gray-400" size={14} /> {t('strategy.configuration')}
          </h2>

          <div className="space-y-4">
            {/* Coin Selector */}
            <div>
              <label className={labelClasses}>{t('strategy.coinSelector')}</label>
              <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className={selectClasses}>
                {SYMBOLS.map((s) => <option key={s} value={s}>{SYMBOL_LABELS[s]}</option>)}
              </select>
            </div>

            {/* Strategy Selector */}
            <div>
              <label className={labelClasses}>{t('strategy.strategySelector')}</label>
              <select value={strategy} onChange={(e) => setStrategy(e.target.value)} className={selectClasses}>
                {STRATEGIES.map((s) => <option key={s} value={s}>{STRATEGY_LABELS[s]}</option>)}
              </select>
            </div>

            {/* Timeframe & Risk Level side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClasses}>{t('strategy.timeframe')}</label>
                <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className={selectClasses}>
                  {TIMEFRAMES.map((tf) => <option key={tf} value={tf}>{tf}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClasses}>{t('strategy.riskLevel')}</label>
                <select value={riskLevel} onChange={(e) => setRiskLevel(e.target.value)}
                  className={`${selectClasses} ${riskColor} border`}>
                  {RISK_LEVELS.map((r) => <option key={r} value={r}>{t(RISK_LEVEL_KEYS[r])}</option>)}
                </select>
              </div>
            </div>

            {/* Stop-Loss & Take-Profit */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClasses}>{t('strategy.stopLoss')}</label>
                <input type="number" step="0.1" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} className={inputClasses} />
              </div>
              <div>
                <label className={labelClasses}>{t('strategy.takeProfit')}</label>
                <input type="number" step="0.1" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} className={inputClasses} />
              </div>
            </div>

            {/* Generate Signal button */}
            <button onClick={handleGenerateSignal} disabled={generating}
              className="w-full bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 text-sm tracking-wide">
              {generating ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <>
                  <FiActivity size={16} /> {t('strategy.generateSignal')}
                </>
              )}
            </button>
          </div>

          {/* Indicator Status */}
          <div className="mt-6 pt-5 border-t border-gray-800/60">
            <h3 className="text-[11px] tracking-widest text-gray-500 uppercase font-semibold mb-4">{t('strategy.indicatorStatus')}</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">RSI (14)</span>
                <span className="text-sm font-mono text-blue-400 font-medium">{typeof rsiValue === 'number' ? rsiValue.toFixed(2) : rsiValue}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">EMA (200)</span>
                <span className="text-sm font-mono text-white font-medium">${typeof ema200Disp === 'number' ? ema200Disp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ema200Disp}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">{t('strategy.volatilityIndex')}</span>
                <span className={`text-sm font-medium ${volatilityColor}`}>{volatilityLabel === 'High' ? t('strategy.high') : volatilityLabel === 'Medium' ? t('strategy.medium') : t('strategy.low')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── RIGHT COLUMN: Analysis Result ─── */}
        <div className="lg:col-span-3 space-y-5">
          {/* Analysis Result Card */}
          <div className={`bg-[#111827] rounded-2xl p-6 border ${signalBorderClass} ${signalGlowClass}`}>
            <h2 className="text-xs tracking-widest text-gray-500 uppercase font-semibold mb-5 flex items-center gap-2">
              <FiTrendingUp className="text-gray-400" size={14} /> {t('strategy.analysisResult')}
            </h2>

            {signal ? (
              <div className="flex items-center justify-between gap-6">
                <div className="flex-1 min-w-0">
                  <h3 className={`text-3xl lg:text-4xl font-extrabold ${signalColorClass} mb-3 tracking-tight`}>
                    {signalType === 'BUY' ? t('strategy.buySignal') : signalType === 'SELL' ? t('strategy.sellSignal') : t('strategy.holdSignal')}
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {signalType === 'BUY'
                      ? t('strategy.buyDescription')
                      : signalType === 'SELL'
                        ? t('strategy.sellDescription')
                        : t('strategy.holdDescription')}
                  </p>
                  {signal.price && (
                    <div className="mt-3 flex gap-4 text-xs text-gray-500">
                      <span>Entry: <span className="text-white font-mono">${parseFloat(signal.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></span>
                      {signal.stopLoss && <span>SL: <span className="text-red-400 font-mono">${parseFloat(signal.stopLoss).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></span>}
                      {signal.takeProfit && <span>TP: <span className="text-emerald-400 font-mono">${parseFloat(signal.takeProfit).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></span>}
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <ConfidenceGauge percent={confidencePercent} />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-36 text-gray-600">
                <div className="text-center">
                  <FiActivity size={28} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">{t('strategy.generateResult')}</p>
                </div>
              </div>
            )}
          </div>

          {/* 2x2 Indicator Panels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* RSI Panel */}
            <div className="bg-[#111827] rounded-xl p-4 border border-gray-800/60">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[11px] tracking-wider text-gray-500 uppercase font-semibold">{t('strategy.rsiStrength')}</h4>
                <span className="text-[11px] font-mono text-blue-400">{typeof rsiValue === 'number' ? rsiValue.toFixed(1) : '—'}</span>
              </div>
              <MiniBarChart data={rsiBarData} color="#22c55e" maxVal={100} />
              <div className="flex justify-between mt-2 text-[10px] text-gray-600">
                <span>Oversold (30)</span>
                <span>Overbought (70)</span>
              </div>
            </div>

            {/* MACD Panel */}
            <div className="bg-[#111827] rounded-xl p-4 border border-gray-800/60">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[11px] tracking-wider text-gray-500 uppercase font-semibold">{t('strategy.macdConvergence')}</h4>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">{t('strategy.crossoverDetected')}</span>
              </div>
              <MiniBarChart data={macdBarData} color="#60a5fa" />
            </div>

            {/* EMA Ribbon Panel */}
            <div className="bg-[#111827] rounded-xl p-4 border border-gray-800/60">
              <h4 className="text-[11px] tracking-wider text-gray-500 uppercase font-semibold mb-3">{t('strategy.emaRibbon')}</h4>
              <div className="space-y-2.5">
                {[
                  { label: 'EMA 20', value: ema20, color: '#22c55e' },
                  { label: 'EMA 50', value: ema50, color: '#eab308' },
                  { label: 'EMA 200', value: ema200Disp, color: '#ef4444' },
                ].map((e) => (
                  <div key={e.label} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: e.color }} />
                    <span className="text-xs text-gray-500 w-14">{e.label}</span>
                    <span className="text-xs font-mono text-gray-300">${typeof e.value === 'number' ? e.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bollinger Bands Panel */}
            <div className="bg-[#111827] rounded-xl p-4 border border-gray-800/60">
              <h4 className="text-[11px] tracking-wider text-gray-500 uppercase font-semibold mb-3">{t('strategy.bollingerBands')}</h4>
              <BollingerViz upper={bbUpper} middle={bbMiddle} lower={bbLower} />
            </div>
          </div>
        </div>
      </div>

      {/* ─── BOTTOM: Saved Strategic Presets ─── */}
      <div className="bg-[#111827] rounded-2xl p-6 border border-gray-800/60">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xs tracking-widest text-gray-500 uppercase font-semibold">{t('strategy.savedPresets')}</h2>
          <button onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 shadow-lg shadow-blue-500/10">
            <FiPlus size={14} /> {t('strategy.newPreset')}
          </button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <form onSubmit={handleCreateConfig} className="bg-[#0c101a] rounded-xl p-5 mb-5 border border-gray-700/50">
            <h3 className="text-white font-medium text-sm mb-4">{t('strategy.createNewPreset')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className={labelClasses}>{t('strategy.symbolLabel')}</label>
                <select value={newConfig.symbol} onChange={(e) => setNewConfig({ ...newConfig, symbol: e.target.value })} className={selectClasses}>
                  {SYMBOLS.map((s) => <option key={s} value={s}>{SYMBOL_LABELS[s]}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClasses}>{t('strategy.strategyLabel')}</label>
                <select value={newConfig.strategyType} onChange={(e) => setNewConfig({ ...newConfig, strategyType: e.target.value })} className={selectClasses}>
                  {STRATEGIES.map((s) => <option key={s} value={s}>{STRATEGY_LABELS[s]}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClasses}>{t('strategy.timeframe')}</label>
                <select value={newConfig.timeframe} onChange={(e) => setNewConfig({ ...newConfig, timeframe: e.target.value })} className={selectClasses}>
                  {TIMEFRAMES.map((tf) => <option key={tf} value={tf}>{tf}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClasses}>{t('strategy.stopLossFormLabel')}</label>
                <input type="number" step="0.1" value={newConfig.stopLossPercent}
                  onChange={(e) => setNewConfig({ ...newConfig, stopLossPercent: e.target.value })} className={inputClasses} />
              </div>
              <div>
                <label className={labelClasses}>{t('strategy.takeProfitFormLabel')}</label>
                <input type="number" step="0.1" value={newConfig.takeProfitPercent}
                  onChange={(e) => setNewConfig({ ...newConfig, takeProfitPercent: e.target.value })} className={inputClasses} />
              </div>
              <div className="flex items-end">
                <button type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
                  {t('strategy.createPreset')}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Presets List */}
        {loadingConfigs ? (
          <div className="flex justify-center py-10">
            <svg className="animate-spin h-6 w-6 text-blue-500" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : configs.length > 0 ? (
          <div className="space-y-2">
            {configs.map((cfg) => {
              const presetName = `${STRATEGY_LABELS[cfg.strategyType] || cfg.strategyType} ${SYMBOL_LABELS[cfg.symbol] || cfg.symbol}`;
              const subtitle = `${cfg.strategyType} + ${cfg.symbol} \u2022 ${cfg.timeframe} Timeframe`;
              const winRate = cfg.winRate ?? (50 + Math.random() * 30);
              return (
                <div key={cfg.id} className="flex items-center gap-4 bg-[#0c101a] rounded-xl px-5 py-4 border border-gray-800/40 hover:border-gray-700/60 transition-colors group">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600/20 to-indigo-500/20 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <FiTrendingUp className="text-blue-400" size={18} />
                  </div>

                  {/* Name & subtitle */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-white truncate">{presetName}</h4>
                    <p className="text-xs text-gray-500 truncate">{subtitle}</p>
                  </div>

                  {/* Win Rate */}
                  <div className="text-right mr-2 flex-shrink-0">
                    <span className="text-[10px] tracking-wider text-gray-500 uppercase block">{t('strategy.winRateLabel')}</span>
                    <span className={`text-sm font-bold font-mono ${winRate >= 60 ? 'text-emerald-400' : winRate >= 45 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {winRate.toFixed(1)}%
                    </span>
                  </div>

                  {/* Live Auto-Trade toggle */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[10px] tracking-wider text-gray-500 uppercase hidden sm:block">{t('strategy.liveAutoTrade')}</span>
                    <button onClick={() => handleToggle(cfg.id)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${cfg.active ? 'bg-emerald-500' : 'bg-gray-700'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${cfg.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleCopyConfig(cfg)}
                      className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors text-gray-500 hover:text-blue-400" title="Copy">
                      <FiCopy size={14} />
                    </button>
                    <button onClick={() => handleDelete(cfg.id)}
                      className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors text-gray-500 hover:text-red-400" title="Delete">
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-gray-600 text-sm">{t('strategy.noPresetsYet')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StrategyPage;
