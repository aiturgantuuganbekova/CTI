import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI, strategyAPI } from '../services/api';
import { toast } from 'react-toastify';
import { FiUser, FiMessageSquare, FiActivity, FiSave, FiSend } from 'react-icons/fi';

const SettingsPage = () => {
  const { user } = useAuth();

  // Telegram state
  const [chatId, setChatId] = useState('');
  const [savedChatId, setSavedChatId] = useState('');
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

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
      toast.warning('Please enter a Chat ID');
      return;
    }
    setTelegramLoading(true);
    try {
      await userAPI.updateTelegram(chatId.trim());
      setSavedChatId(chatId.trim());
      toast.success('Telegram Chat ID saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save Chat ID');
    } finally {
      setTelegramLoading(false);
    }
  };

  // Send test message
  const handleTestTelegram = async () => {
    if (!savedChatId) {
      toast.warning('Save a Chat ID first');
      return;
    }
    setTestLoading(true);
    try {
      await userAPI.testTelegram();
      toast.success('Test message sent! Check your Telegram.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send test message');
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
      toast.success('Strategy updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle strategy');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your profile, notifications, and monitoring preferences</p>
      </div>

      {/* Profile Section */}
      <div className="bg-[#151923] rounded-xl p-6 border border-gray-800">
        <div className="flex items-center gap-2 mb-5">
          <FiUser className="text-blue-400" size={18} />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Profile</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Username</label>
            <div className="bg-[#1a1f2e] border border-gray-700/60 rounded-lg px-4 py-2.5 text-white text-sm">
              {user?.username || user?.name || '-'}
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
            <div className="bg-[#1a1f2e] border border-gray-700/60 rounded-lg px-4 py-2.5 text-white text-sm">
              {user?.email || '-'}
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Role</label>
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
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Telegram Notifications</h2>
        </div>
        <p className="text-sm text-gray-400 mb-4">
          Connect your Telegram account to receive real-time signal alerts and trade notifications.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Chat ID</label>
            <input
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="Enter your Telegram Chat ID"
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
            Save
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
            Send Test
          </button>
        </div>
        {savedChatId && (
          <p className="text-xs text-gray-500 mt-3">
            Current Chat ID: <span className="text-gray-400 font-mono">{savedChatId}</span>
          </p>
        )}
      </div>

      {/* Monitoring Section */}
      <div className="bg-[#151923] rounded-xl p-6 border border-gray-800">
        <div className="flex items-center gap-2 mb-5">
          <FiActivity className="text-purple-400" size={18} />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Strategy Monitoring</h2>
        </div>
        <p className="text-sm text-gray-400 mb-4">
          Toggle active monitoring for your configured strategies.
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
            No strategies configured. Go to the Strategy page to create one.
          </p>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
