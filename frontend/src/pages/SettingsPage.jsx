import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI, strategyAPI, monitoringAPI } from '../services/api';
import { toast } from 'react-toastify';
import { FiUser, FiMessageSquare, FiActivity, FiSave, FiSend, FiClock, FiPlay, FiSquare } from 'react-icons/fi';
import { useI18n } from '../i18n';

const SettingsPage = () => {
  const { t } = useI18n();
  const { user } = useAuth();

  // Telegram state
  const [chatId, setChatId] = useState('');
  const [savedChatId, setSavedChatId] = useState('');
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  // Monitoring interval state
  const [monitoringRunning, setMonitoringRunning] = useState(false);
  const [intervalSeconds, setIntervalSeconds] = useState(60);
  const [monitoringLoading, setMonitoringLoading] = useState(false);

  // Strategy monitoring state
  const [strategies, setStrategies] = useState([]);
  const [strategiesLoading, setStrategiesLoading] = useState(true);

  // Load telegram chat ID
  useEffect(() => {
    const fetchTelegram = async () => {
      try {
        const res = await userAPI.getTelegram();
        const id = res.data?.chatId || res.data || '';
        setChatId(String(id));
        setSavedChatId(String(id));
      } catch {
        // No saved chat ID yet
      }
    };
    fetchTelegram();
  }, []);

  // Load monitoring status
  useEffect(() => {
    const fetchMonitoring = async () => {
      try {
        const res = await monitoringAPI.getStatus();
        setMonitoringRunning(res.data.running);
        setIntervalSeconds(res.data.intervalSeconds || 60);
      } catch {
        // silently fail
      }
    };
    fetchMonitoring();
  }, []);

  // Load strategies
  const fetchStrategies = useCallback(async () => {
    setStrategiesLoading(true);
    try {
      const res = await strategyAPI.getAll();
      const data = Array.isArray(res.data) ? res.data : res.data?.content || [];
      setStrategies(data);
    } catch {
      // silently fail
    } finally {
      setStrategiesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStrategies();
  }, [fetchStrategies]);

  // Save telegram chat ID
  const handleSaveTelegram = async () => {
    if (!chatId.trim()) {
      toast.warning(t('settings.chatIdRequired'));
      return;
    }
    setTelegramLoading(true);
    try {
      await userAPI.updateTelegram(chatId.trim());
      setSavedChatId(chatId.trim());
      toast.success(t('settings.chatIdSaved'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('settings.chatIdFailed'));
    } finally {
      setTelegramLoading(false);
    }
  };

  // Send test message
  const handleTestTelegram = async () => {
    if (!savedChatId) {
      toast.warning(t('settings.saveChatIdFirst'));
      return;
    }
    setTestLoading(true);
    try {
      await userAPI.testTelegram();
      toast.success(t('settings.testSent'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('settings.testFailed'));
    } finally {
      setTestLoading(false);
    }
  };

  // Toggle strategy active state
  const handleToggleStrategy = async (id) => {
    try {
      await strategyAPI.toggle(id);
      setStrategies((prev) =>
        prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s))
      );
      toast.success(t('settings.strategyUpdated'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('settings.strategyFailed'));
    }
  };

  const handleStartMonitoring = async () => {
    setMonitoringLoading(true);
    try {
      await monitoringAPI.start(intervalSeconds * 1000);
      setMonitoringRunning(true);
      toast.success(`Monitoring started (every ${intervalSeconds}s)`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start monitoring');
    } finally {
      setMonitoringLoading(false);
    }
  };

  const handleStopMonitoring = async () => {
    setMonitoringLoading(true);
    try {
      await monitoringAPI.stop();
      setMonitoringRunning(false);
      toast.success('Monitoring stopped');
    } catch {
      toast.error('Failed to stop monitoring');
    } finally {
      setMonitoringLoading(false);
    }
  };

  const handleUpdateInterval = async () => {
    setMonitoringLoading(true);
    try {
      await monitoringAPI.updateInterval(intervalSeconds * 1000);
      setMonitoringRunning(true);
      toast.success(`Interval updated to ${intervalSeconds}s`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update interval');
    } finally {
      setMonitoringLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-bold text-white">{t('settings.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('settings.subtitle')}</p>
      </div>

      {/* Profile Section */}
      <div className="bg-[#151923] rounded-xl p-6 border border-gray-800">
        <div className="flex items-center gap-2 mb-5">
          <FiUser className="text-blue-400" size={18} />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">{t('settings.profile')}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">{t('settings.username')}</label>
            <div className="bg-[#1a1f2e] border border-gray-700/60 rounded-lg px-4 py-2.5 text-white text-sm">
              {user?.username || user?.name || '-'}
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">{t('settings.email')}</label>
            <div className="bg-[#1a1f2e] border border-gray-700/60 rounded-lg px-4 py-2.5 text-white text-sm">
              {user?.email || '-'}
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">{t('settings.role')}</label>
            <div className="bg-[#1a1f2e] border border-gray-700/60 rounded-lg px-4 py-2.5 text-white text-sm">
              <span className="bg-blue-500/15 text-blue-400 border border-blue-500/30 text-xs font-semibold px-2 py-0.5 rounded">
                {user?.role || 'USER'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Telegram Section */}
      <div className="bg-[#151923] rounded-xl p-6 border border-gray-800">
        <div className="flex items-center gap-2 mb-5">
          <FiMessageSquare className="text-emerald-400" size={18} />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">{t('settings.telegram')}</h2>
        </div>
        <p className="text-sm text-gray-400 mb-4">
          {t('settings.telegramDesc')}
        </p>

        {/* Setup Instructions */}
        <div className="bg-[#1a1f2e] border border-gray-700/40 rounded-xl p-5 mb-6">
          <h3 className="text-white text-sm font-semibold mb-4 flex items-center gap-2">
            <span className="bg-emerald-500/15 text-emerald-400 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">?</span>
            {t('settings.howToSetup')}
          </h3>
          <div className="space-y-4">
            <div className="flex gap-3">
              <span className="bg-blue-500/15 text-blue-400 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">1</span>
              <div>
                <p className="text-white text-sm font-medium">{t('settings.step1Title')}</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {t('settings.step1Desc')} <a href="https://t.me/aiturgan_cti_bot" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">{t('settings.step1Bot')}</a> {t('settings.step1Suffix')}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="bg-blue-500/15 text-blue-400 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">2</span>
              <div>
                <p className="text-white text-sm font-medium">{t('settings.step2Title')}</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {t('settings.step2Desc')} <span className="bg-[#151923] text-gray-300 px-1.5 py-0.5 rounded text-[11px] font-mono">{t('settings.step2Action')}</span> {t('settings.step2Or')} <span className="bg-[#151923] text-gray-300 px-1.5 py-0.5 rounded text-[11px] font-mono">{t('settings.step2Command')}</span> {t('settings.step2Suffix')}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="bg-blue-500/15 text-blue-400 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">3</span>
              <div>
                <p className="text-white text-sm font-medium">{t('settings.step3Title')}</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {t('settings.step3Desc')} <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">{t('settings.step3Bot')}</a> {t('settings.step3Suffix')}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="bg-blue-500/15 text-blue-400 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">4</span>
              <div>
                <p className="text-white text-sm font-medium">{t('settings.step4Title')}</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {t('settings.step4Desc')} <span className="text-emerald-400 font-medium">{t('settings.step4Action')}</span> {t('settings.step4Suffix')}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-700/30">
            <p className="text-gray-500 text-[11px]">
              {t('settings.alertInfo')} <span className="text-green-400 font-medium">{t('settings.alertBuy')}</span> {t('settings.alertAnd')} <span className="text-red-400 font-medium">{t('settings.alertSell')}</span> {t('settings.alertSuffix')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">{t('settings.chatId')}</label>
            <input
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder={t('settings.chatIdPlaceholder')}
              className="w-full bg-[#1a1f2e] border border-gray-700/60 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-colors placeholder-gray-600"
            />
          </div>
          <button
            onClick={handleSaveTelegram}
            disabled={telegramLoading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/40 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            {telegramLoading ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <FiSave size={15} />
            )}
            {t('settings.save')}
          </button>
          <button
            onClick={handleTestTelegram}
            disabled={testLoading || !savedChatId}
            className="flex items-center gap-2 border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 disabled:opacity-40 text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            {testLoading ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <FiSend size={15} />
            )}
            {t('settings.sendTest')}
          </button>
        </div>
        {savedChatId && (
          <p className="text-xs text-gray-500 mt-3">
            {t('settings.currentChatId')}: <span className="text-gray-400 font-mono">{savedChatId}</span>
          </p>
        )}
      </div>

      {/* Monitoring Interval Section */}
      <div className="bg-[#151923] rounded-xl p-6 border border-gray-800">
        <div className="flex items-center gap-2 mb-5">
          <FiClock className="text-orange-400" size={18} />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Monitoring Interval</h2>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <span className={`w-2.5 h-2.5 rounded-full ${monitoringRunning ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
          <span className={`text-sm font-medium ${monitoringRunning ? 'text-emerald-400' : 'text-gray-500'}`}>
            {monitoringRunning ? `Active — every ${intervalSeconds}s` : 'Stopped'}
          </span>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Interval (seconds)</label>
            <input
              type="number"
              min="5"
              max="3600"
              value={intervalSeconds}
              onChange={(e) => setIntervalSeconds(Math.max(5, parseInt(e.target.value) || 5))}
              className="w-full bg-[#1a1f2e] border border-gray-700/60 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/50 transition-colors"
            />
          </div>

          <div className="flex gap-2">
            {[10, 30, 60, 300].map((sec) => (
              <button
                key={sec}
                onClick={() => setIntervalSeconds(sec)}
                className={`px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  intervalSeconds === sec
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                    : 'bg-[#1a1f2e] text-gray-400 border border-gray-700/60 hover:text-white'
                }`}
              >
                {sec < 60 ? `${sec}s` : `${sec / 60}m`}
              </button>
            ))}
          </div>

          <button
            onClick={handleUpdateInterval}
            disabled={monitoringLoading}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-600/40 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            <FiSave size={15} />
            Apply
          </button>

          {monitoringRunning ? (
            <button
              onClick={handleStopMonitoring}
              disabled={monitoringLoading}
              className="flex items-center gap-2 border border-red-500/50 text-red-400 hover:bg-red-500/10 disabled:opacity-40 text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              <FiSquare size={15} />
              Stop
            </button>
          ) : (
            <button
              onClick={handleStartMonitoring}
              disabled={monitoringLoading}
              className="flex items-center gap-2 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-40 text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              <FiPlay size={15} />
              Start
            </button>
          )}
        </div>

        <p className="text-gray-600 text-[11px] mt-3">
          Min: 5s. Signals (BUY/SELL/HOLD) will be sent to Telegram every cycle for all active strategies below.
        </p>
      </div>

      {/* Strategy Monitoring Section */}
      <div className="bg-[#151923] rounded-xl p-6 border border-gray-800">
        <div className="flex items-center gap-2 mb-5">
          <FiActivity className="text-purple-400" size={18} />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">{t('settings.monitoring')}</h2>
        </div>
        <p className="text-sm text-gray-400 mb-4">
          {t('settings.monitoringDesc')}
        </p>

        {strategiesLoading ? (
          <div className="flex justify-center py-8">
            <svg className="animate-spin h-6 w-6 text-blue-500" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : strategies.length > 0 ? (
          <div className="space-y-3">
            {strategies.map((strategy) => (
              <div
                key={strategy.id}
                className="flex items-center justify-between bg-[#1a1f2e] border border-gray-700/60 rounded-lg px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full ${strategy.active ? 'bg-emerald-400' : 'bg-gray-600'}`}
                  />
                  <div>
                    <span className="text-white text-sm font-medium">
                      {strategy.strategyType || strategy.name || 'Strategy'}
                    </span>
                    <span className="text-gray-500 text-xs ml-2">
                      {strategy.symbol || ''} {strategy.timeframe ? `/ ${strategy.timeframe}` : ''}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleStrategy(strategy.id)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    strategy.active ? 'bg-emerald-600' : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      strategy.active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 text-center py-8 text-sm">
            {t('settings.noStrategies')}
          </p>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
