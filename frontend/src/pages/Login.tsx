import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/Button';
import { useAuthStore } from '../store/authStore';
import lumbiaLogo from '../assets/lumbia_logo.png';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const login = useAuthStore(state => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-[1000px] w-full grid grid-cols-1 md:grid-cols-2 bg-white rounded-2xl shadow-xl overflow-hidden min-h-[600px] border border-gray-150">

        {/* Left Side (Branding Panel) */}
        <div
          className="relative hidden md:flex p-12 flex-col justify-between text-white bg-[#004D36]"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 77, 54, 0.9), rgba(0, 77, 54, 0.95)), url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Top Logo */}
          <div className="flex items-center space-x-3">
            <div className="bg-[#006B4D]/0 p-2 rounded-full">
              <img src={lumbiaLogo} alt="LCS Logo" className="h-10 w-10 object-contain rounded-full" />
            </div>
            <span className="text-xl font-bold tracking-wide text-white">LCS Treasury</span>
          </div>

          {/* Core Text */}
          <div className="space-y-4 my-auto pr-4">
            <h1 className="text-3xl lg:text-4xl font-extrabold leading-tight tracking-tight">
              Secure Treasury Management for Modern Schools.
            </h1>
            <p className="text-gray-300 text-sm lg:text-base leading-relaxed font-light">
              Keeping every peso of canteen money safe, accounted for, and always in the right hands.
            </p>
          </div>

        </div>

        {/* Right Side (Form) */}
        <div className="flex flex-col justify-between p-8 md:p-12 bg-white">
          <div className="w-full max-w-md mx-auto my-auto space-y-6">

            {/* Header */}
            <div>
              <h2 className="text-2xl font-bold text-gray-950 tracking-tight">Welcome Back</h2>
              <p className="mt-1 text-sm text-gray-500 font-light">
                Please enter your credentials to access your account.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-md">
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 block" htmlFor="username">
                  Username or Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    {/* User profile icon outline */}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#F0F4F8] border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="e.g. admin"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 block" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    {/* Lock icon outline */}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-[#F0F4F8] border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono tracking-widest"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Utilities */}
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center space-x-2 text-gray-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>
                <a href="#forgot" className="text-primary font-semibold hover:underline">
                  Forgot Password?
                </a>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-[#006B4D] hover:bg-[#00523b] text-white py-2.5 rounded-lg font-semibold transition-colors mt-2 text-sm shadow-sm"
                isLoading={isLoading}
              >
                Login to Dashboard
              </Button>
            </form>

            {/* Divider & Register Link */}
            <div className="pt-6 border-t border-gray-100 text-center text-xs">
              <span className="text-gray-500">Don't have an account? </span>
              <button
                type="button"
                disabled
                className="text-[#006B4D] opacity-50 font-bold block mx-auto mt-1 cursor-not-allowed focus:outline-none"
              >
                Register a new account
              </button>
            </div>

          </div>

          {/* Copyright Footer */}
          <div className="text-[10px] text-gray-400 text-center mt-8">
            &copy; 2024 LCS Treasury Management System. All rights reserved.
          </div>
        </div>

      </div>
    </div>
  );
}
