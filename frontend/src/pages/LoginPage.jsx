import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { toast } from 'react-toastify';
import { FiMail, FiLock, FiShield, FiCheck, FiArrowRight, FiGithub } from 'react-icons/fi';

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [staySignedIn, setStaySignedIn] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const googleCallbackRef = useRef(null);

  const handleGoogleCallback = useCallback(async (response) => {
    setLoading(true);
    setError('');
    try {
      const res = await authAPI.google({ credential: response.credential });
      const { token, username: uname, role } = res.data;
      login(token, { username: uname, role });
      toast.success('Google login successful!');
      navigate('/');
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.error || 'Google login failed';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [login, navigate]);

  googleCallbackRef.current = handleGoogleCallback;

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
      window.google.accounts.id.initialize({
        client_id: '509566552309-8huhumpmchand8gsnv5aocgsjsas59hn.apps.googleusercontent.com',
        callback: (resp) => googleCallbackRef.current(resp),
      });
    };

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let response;
      if (isLogin) {
        response = await authAPI.login({ username, password });
      } else {
        response = await authAPI.register({ username, password, email });
      }

      const { token, user } = response.data;
      login(token, user || { username });
      toast.success(isLogin ? 'Login successful!' : 'Registration successful!');
      navigate('/');
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        (isLogin ? 'Invalid credentials' : 'Registration failed');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0d14] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow blobs */}
      <div
        className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-[80px] opacity-30 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #22c55e 0%, transparent 70%)',
          filter: 'blur(120px)',
        }}
      />
      <div
        className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-[80px] opacity-30 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #6366f1 0%, #3b82f6 30%, transparent 70%)',
          filter: 'blur(120px)',
        }}
      />

      {/* Main content */}
      <div className="w-full max-w-md z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#3b82f6" fillOpacity="0.15" />
              <path
                d="M16 6L26 26H6L16 6Z"
                stroke="#3b82f6"
                strokeWidth="2"
                fill="#3b82f6"
                fillOpacity="0.3"
              />
            </svg>
            <span className="text-2xl font-bold text-white tracking-wide">Aiturgan</span>
          </div>
          <p
            className="text-gray-500 text-xs font-medium"
            style={{ letterSpacing: '0.25em' }}
          >
            CRYPTO ANALYTICS PRECISION
          </p>
        </div>

        {/* Auth card */}
        <div className="bg-[#151923] rounded-2xl p-8 shadow-2xl border border-gray-800/60">
          {/* Tab switcher */}
          <div className="flex mb-6 border-b border-gray-700/50">
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setError('');
              }}
              className={`flex-1 pb-3 text-sm font-semibold tracking-wider transition-colors ${
                isLogin
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              LOGIN
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLogin(false);
                setError('');
              }}
              className={`flex-1 pb-3 text-sm font-semibold tracking-wider transition-colors ${
                !isLogin
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              REGISTER
            </button>
          </div>

          {/* OAuth buttons */}
          <div className="flex gap-3 mb-5">
            <button
              type="button"
              onClick={() => {
                if (window.google?.accounts?.id) {
                  window.google.accounts.id.prompt();
                } else {
                  toast.info('Google Sign-In loading...');
                }
              }}
              className="flex-1 flex items-center justify-center gap-2 bg-[#1a1f2e] border border-gray-700 rounded-lg py-2.5 text-gray-300 text-sm font-medium hover:border-gray-500 transition-colors"
            >
              <span className="text-base font-bold" style={{ fontFamily: 'sans-serif' }}>
                G
              </span>
              Google
            </button>
            <button
              type="button"
              onClick={() => toast.info('Github login coming soon!')}
              className="flex-1 flex items-center justify-center gap-2 bg-[#1a1f2e] border border-gray-700 rounded-lg py-2.5 text-gray-300 text-sm font-medium hover:border-gray-500 transition-colors"
            >
              <FiGithub className="text-base" />
              Github
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gray-700/50" />
            <span className="text-gray-500 text-xs">or use email</span>
            <div className="flex-1 h-px bg-gray-700/50" />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username (used as login identifier) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#1a1f2e] border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-sm"
                    placeholder="Username"
                    required
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    <FiCheck size={16} />
                  </span>
                </div>
              </div>
            )}

            {/* Email Address */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <input
                  type={isLogin ? 'text' : 'email'}
                  value={isLogin ? username : email}
                  onChange={(e) =>
                    isLogin
                      ? setUsername(e.target.value)
                      : setEmail(e.target.value)
                  }
                  className="w-full bg-[#1a1f2e] border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-sm"
                  placeholder="name@analytics.com"
                  required
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  <FiMail size={16} />
                </span>
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-400">Password</label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => toast.info('Password reset coming soon!')}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#1a1f2e] border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-sm"
                  placeholder="••••••••"
                  required
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  <FiLock size={16} />
                </span>
              </div>
            </div>

            {/* Stay signed in */}
            {isLogin && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStaySignedIn(!staySignedIn)}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    staySignedIn
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-gray-600 bg-transparent'
                  }`}
                >
                  {staySignedIn && <FiCheck size={10} className="text-white" />}
                </button>
                <span className="text-gray-400 text-sm">Stay signed in for 30 days</span>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-semibold py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm tracking-wider mt-2 disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #22c55e 0%, #10b981 50%, #059669 100%)',
              }}
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
              ) : (
                <>
                  {isLogin ? 'ACCESS DASHBOARD' : 'CREATE ACCOUNT'}
                  <FiArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Security badges */}
          <div className="flex items-center justify-center gap-4 mt-6 pt-5 border-t border-gray-700/40">
            <div className="flex items-center gap-1.5 text-gray-500 text-xs">
              <FiLock size={12} />
              <span>256-bit AES</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-500 text-xs">
              <FiShield size={12} />
              <span>SOC2 Compliant</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-500 text-xs">
              <FiLock size={12} />
              <span>Multi-Sig</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="z-10 mt-10 text-center">
        <p className="text-gray-600 text-xs mb-2">
          &copy; 2025 Aiturgan Global Crypto Analytics. All rights reserved.
        </p>
        <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
          <button
            type="button"
            onClick={() => toast.info('Coming soon!')}
            className="hover:text-gray-300 transition-colors"
          >
            Privacy Policy
          </button>
          <span>&bull;</span>
          <button
            type="button"
            onClick={() => toast.info('Coming soon!')}
            className="hover:text-gray-300 transition-colors"
          >
            Terms of Service
          </button>
          <span>&bull;</span>
          <button
            type="button"
            onClick={() => toast.info('Coming soon!')}
            className="hover:text-gray-300 transition-colors"
          >
            Support
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
