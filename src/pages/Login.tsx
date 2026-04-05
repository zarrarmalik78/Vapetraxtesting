import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const Login: React.FC = () => {
  const [view, setView] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle, signup, resetPassword, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const isBusy = loading || authLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please fill in your email address');
      return;
    }
    if (view !== 'reset' && !password) {
      toast.error('Please enter a password');
      return;
    }

    setLoading(true);
    try {
      if (view === 'login') {
        await login(email, password);
        navigate(from, { replace: true });
      } else if (view === 'signup') {
        if (password.length < 6) {
          toast.error('Password must be at least 6 characters');
          return;
        }
        await signup(email, password);
        navigate(from, { replace: true });
      } else if (view === 'reset') {
        await resetPassword(email);
        setView('login');
      }
    } catch (error) {
      // Errors are handled in AuthContext
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate(from, { replace: true });
    } catch (error) {
      // Error handled in AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-violet-100 selection:text-violet-900 font-sans">
      <div className="w-full max-w-[440px]">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-white shadow-sm border border-slate-200 mb-6 p-2">
            <img src="/icon.png" alt="VapeTrax Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-2">
            {view === 'login' && 'Sign in to VapeTrax'}
            {view === 'signup' && 'Create your account'}
            {view === 'reset' && 'Reset your password'}
          </h1>
          <p className="text-slate-500 text-sm">
            {view === 'login' && 'Welcome back! Please enter your details.'}
            {view === 'signup' && 'Start managing your retail business today.'}
            {view === 'reset' && 'We\'ll email you instructions to reset your password.'}
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <fieldset disabled={isBusy} className="space-y-5 disabled:opacity-80 transition-opacity">
              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-shadow shadow-sm"
                  placeholder="Enter your email"
                  required
                />
              </div>

              {/* Password Input */}
              {view !== 'reset' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-slate-700">Password</label>
                    {view === 'login' && (
                      <button
                        type="button"
                        onClick={() => setView('reset')}
                        className="text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors focus:outline-none"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-shadow shadow-sm"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Remember Me Toggle */}
              {view === 'login' && (
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="remember"
                    className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500/30 focus:ring-offset-0 cursor-pointer transition-all" 
                  />
                  <label htmlFor="remember" className="text-sm text-slate-600 cursor-pointer select-none">Remember for 30 days</label>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isBusy}
                className="w-full py-2.5 px-4 bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm rounded-lg shadow-sm shadow-violet-600/20 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isBusy ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  view === 'login' ? 'Sign In' : view === 'signup' ? 'Create Account' : 'Reset Password'
                )}
              </button>
            </fieldset>
          </form>

          {/* View Toggle */}
          <div className="mt-6 text-center">
            {view === 'login' ? (
              <p className="text-sm text-slate-500">
                Don't have an account?{' '}
                <button
                  onClick={() => setView('signup')}
                  disabled={isBusy}
                  className="font-medium text-violet-600 hover:text-violet-700 focus:outline-none ml-1"
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p className="text-sm text-slate-500">
                <button
                  onClick={() => setView('login')}
                  disabled={isBusy}
                  className="font-medium text-slate-600 hover:text-slate-900 focus:outline-none flex items-center justify-center gap-1 w-full"
                >
                  ← Back to login
                </button>
              </p>
            )}
          </div>

          {/* Social Auth Separator */}
          {view === 'login' && (
            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-white text-slate-500">Or continue with</span>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isBusy}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                  Google
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Feature Highlights (Signup Only) */}
        {view === 'signup' && (
          <div className="mt-8 grid grid-cols-2 gap-4 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span>Real-time inventory</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span>Detailed analytics</span>
            </div>
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {isBusy && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-auto bg-slate-50/50 backdrop-blur-[2px] transition-opacity duration-300">
          <div className="bg-white border border-slate-200 rounded-xl px-5 py-3 shadow-lg flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-slate-700">Please wait...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
