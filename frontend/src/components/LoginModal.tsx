import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from './Button';
import { useAuthStore } from '../store/authStore';
import lumbiaLogo from '../assets/lumbia_logo.png';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const login = useAuthStore(state => state.login);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setUsername('');
      setPassword('');
      setError('');
      setShowPassword(false);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

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
      onClose();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="login-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Login"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        animation: 'loginOverlayFadeIn 0.2s ease',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '900px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          borderRadius: '1.25rem',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
          minHeight: '540px',
          animation: 'loginModalSlideIn 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Left Branding Panel */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '2.5rem',
            color: 'white',
            backgroundImage: `linear-gradient(rgba(0,77,54,0.92), rgba(0,77,54,0.97)), url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Top Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src={lumbiaLogo} alt="LCS Logo" style={{ height: '2.5rem', width: '2.5rem', borderRadius: '50%', objectFit: 'contain' }} />
            <span style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.04em' }}>LCS Treasury</span>
          </div>

          {/* Core Text */}
          <div style={{ margin: 'auto 0', paddingRight: '1rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, lineHeight: 1.25, letterSpacing: '-0.02em', margin: '0 0 0.75rem 0' }}>
              Secure Treasury Management for Modern Schools.
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', lineHeight: 1.65, fontWeight: 300, margin: 0 }}>
              Keeping every peso of canteen money safe, accounted for, and always in the right hands.
            </p>
          </div>

          {/* Decorative circles */}
          <div style={{
            position: 'absolute', bottom: '-2rem', right: '-2rem',
            width: '10rem', height: '10rem', borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', top: '-1.5rem', left: '-1.5rem',
            width: '7rem', height: '7rem', borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
          }} />
        </div>

        {/* Right Form Panel */}
        <div style={{ background: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '2.5rem' }}>
          {/* Close Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
            <button
              onClick={onClose}
              aria-label="Close login modal"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '0.35rem', borderRadius: '0.5rem', color: '#9ca3af',
                display: 'flex', alignItems: 'center', transition: 'color 0.15s, background 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#374151'; (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#9ca3af'; (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1.25rem' }}>
            {/* Header */}
            <div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#030712', margin: '0 0 0.25rem 0', letterSpacing: '-0.02em' }}>
                Welcome Back
              </h3>
              <p style={{ fontSize: '0.8125rem', color: '#6b7280', fontWeight: 300, margin: 0 }}>
                Please enter your credentials to access your account.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div style={{ background: '#fef2f2', borderLeft: '4px solid #ef4444', padding: '0.625rem 0.75rem', borderRadius: '0.375rem' }}>
                <p style={{ fontSize: '0.75rem', color: '#b91c1c', margin: 0 }}>{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Username */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label htmlFor="modal-username" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151' }}>
                  Username or Email
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: '0 auto 0 0', paddingLeft: '0.875rem', display: 'flex', alignItems: 'center', pointerEvents: 'none', color: '#9ca3af' }}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    id="modal-username"
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="e.g. admin"
                    required
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      paddingLeft: '2.5rem', paddingRight: '1rem', paddingTop: '0.625rem', paddingBottom: '0.625rem',
                      fontSize: '0.875rem', background: '#F0F4F8',
                      border: '1px solid #e5e7eb', borderRadius: '0.5rem',
                      color: '#111827', outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#006B4D'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,107,77,0.12)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label htmlFor="modal-password" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: '0 auto 0 0', paddingLeft: '0.875rem', display: 'flex', alignItems: 'center', pointerEvents: 'none', color: '#9ca3af' }}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="modal-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      paddingLeft: '2.5rem', paddingRight: '2.5rem', paddingTop: '0.625rem', paddingBottom: '0.625rem',
                      fontSize: '0.875rem', background: '#F0F4F8',
                      border: '1px solid #e5e7eb', borderRadius: '0.5rem',
                      color: '#111827', outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
                      fontFamily: 'monospace', letterSpacing: '0.1em',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#006B4D'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,107,77,0.12)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', inset: '0 0 0 auto', paddingRight: '0.875rem',
                      display: 'flex', alignItems: 'center', background: 'none', border: 'none',
                      cursor: 'pointer', color: '#9ca3af',
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Utilities */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', cursor: 'pointer', userSelect: 'none' }}>
                  <input type="checkbox" style={{ width: '0.875rem', height: '0.875rem', cursor: 'pointer' }} />
                  <span>Remember me</span>
                </label>
                <a href="#forgot" style={{ color: '#006B4D', fontWeight: 600, textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline'}
                  onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none'}
                >
                  Forgot Password?
                </a>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full bg-[#006B4D] hover:bg-[#00523b] text-white py-2.5 rounded-lg font-semibold transition-colors mt-1 text-sm shadow-sm"
                isLoading={isLoading}
              >
                Login to Dashboard
              </Button>
            </form>

            {/* Register Link */}
            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '1rem', textAlign: 'center', fontSize: '0.75rem' }}>
              <span style={{ color: '#6b7280' }}>Don't have an account? </span>
              <button
                type="button"
                disabled
                style={{ color: '#006B4D', opacity: 0.5, fontWeight: 700, display: 'block', margin: '0.25rem auto 0', cursor: 'not-allowed', background: 'none', border: 'none' }}
              >
                Register a new account
              </button>
            </div>
          </div>

          {/* Footer */}
          <div style={{ fontSize: '0.625rem', color: '#9ca3af', textAlign: 'center', marginTop: '1rem' }}>
            &copy; 2024 LCS Treasury Management System. All rights reserved.
          </div>
        </div>
      </div>

      {/* Keyframe animations injected via style tag */}
      <style>{`
        @keyframes loginOverlayFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes loginModalSlideIn {
          from { opacity: 0; transform: scale(0.93) translateY(12px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @media (max-width: 640px) {
          .login-modal-overlay > div {
            grid-template-columns: 1fr !important;
          }
          .login-modal-overlay > div > div:first-child {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
