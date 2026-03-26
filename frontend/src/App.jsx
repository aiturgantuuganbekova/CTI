import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FiHome, FiActivity, FiBarChart2, FiFileText, FiLogOut, FiBell, FiSettings } from 'react-icons/fi';
import { marketAPI } from './services/api';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import StrategyPage from './pages/StrategyPage';
import BacktestPage from './pages/BacktestPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

const navItems = [
  { to: '/', icon: FiHome, label: 'Dashboard' },
  { to: '/strategy', icon: FiActivity, label: 'Strategy' },
  { to: '/backtest', icon: FiBarChart2, label: 'Backtest' },
  { to: '/reports', icon: FiFileText, label: 'Reports' },
  { to: '/settings', icon: FiSettings, label: 'Settings' },
];

const Sidebar = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] bg-[#151923] flex flex-col z-50">
      {/* Logo */}
      <div className="px-6 py-6">
        <h1 className="text-2xl font-bold text-blue-500 tracking-tight">Aiturgan</h1>
        <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mt-1">Crypto Analytics</p>
      </div>

      {/* Navigation */}
      <nav className="px-3 py-4 space-y-1 flex-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors relative ${
                isActive
                  ? 'text-blue-400 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:bg-blue-500 before:rounded-r'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Icon size={17} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-800/60">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-400
                     hover:text-red-400 hover:bg-red-500/10 transition-colors w-full rounded"
        >
          <FiLogOut size={17} />
          Logout
        </button>
      </div>
    </aside>
  );
};

const TopBar = () => {
  const [priceData, setPriceData] = useState({ price: 0, change: 0 });

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await marketAPI.getPrice('BTCUSDT');
        const data = res.data;
        setPriceData({
          price: parseFloat(data.price || data.lastPrice || 0),
          change: parseFloat(data.priceChangePercent || data.change || 0),
        });
      } catch (err) {
        // silently ignore fetch errors
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 10000);
    return () => clearInterval(interval);
  }, []);

  const formattedPrice = priceData.price.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });

  const isPositive = priceData.change >= 0;

  return (
    <header className="h-14 flex items-center justify-between px-6 bg-[#151923]/60 backdrop-blur border-b border-gray-800/40">
      {/* Left: pair info */}
      <div className="flex items-center gap-4">
        <span className="text-white font-bold text-sm">BTC/USDT</span>
        <span className="text-white text-sm font-medium">{formattedPrice}</span>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded ${
            isPositive
              ? 'bg-green-500/15 text-green-400'
              : 'bg-red-500/15 text-red-400'
          }`}
        >
          {isPositive ? '+' : ''}{priceData.change.toFixed(2)}%
        </span>
        <span className="text-gray-500 text-xs">Vol: 1.2B</span>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-3">
        <button className="bg-green-600 hover:bg-green-500 text-white text-xs font-semibold px-4 py-2 rounded transition-colors">
          EXECUTE TRADE
        </button>
        <button className="text-gray-400 hover:text-white transition-colors p-2 rounded hover:bg-white/5">
          <FiBell size={17} />
        </button>
        <button className="text-gray-400 hover:text-white transition-colors p-2 rounded hover:bg-white/5">
          <FiSettings size={17} />
        </button>
      </div>
    </header>
  );
};

const AppLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#0a0d14]">
      <Sidebar />
      <div className="ml-[220px] flex flex-col min-h-screen">
        <TopBar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout><DashboardPage /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/strategy"
            element={
              <ProtectedRoute>
                <AppLayout><StrategyPage /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/backtest"
            element={
              <ProtectedRoute>
                <AppLayout><BacktestPage /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <AppLayout><ReportsPage /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <AppLayout><SettingsPage /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
