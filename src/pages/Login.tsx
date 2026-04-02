import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, User, Lock, Eye, EyeOff, UserPlus, Key } from 'lucide-react';
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
    <div className="min-h-screen bg-[#f3f4f9] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-600/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-fuchsia-600/10 blur-[120px] rounded-full"></div>

      <div className="w-full max-w-md z-10">
        <div className="glass-card p-10 shadow-2xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white mb-6 shadow-xl shadow-violet-600/20 border border-slate-100 overflow-hidden">
              <img src="/icon.png" alt="VapeTrax" className="w-full h-full object-contain p-3" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">VapeTrax Web</h1>
            <p className="text-slate-500 font-medium">
              {view === 'login' && "Sign in to your business dashboard"}
              {view === 'signup' && "Create your new business account"}
              {view === 'reset' && "Reset your password"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <fieldset disabled={isBusy} className="space-y-8 disabled:opacity-80">
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <User size={14} className="text-violet-600" />
                Email Address
              </label>
              <div className="relative group">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-medium placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                  placeholder="admin@vapetrax.com"
                  required
                />
              </div>
            </div>

            {view !== 'reset' && (
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Lock size={14} className="text-violet-600" />
                  Password
                </label>
                <div className="relative group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-medium placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-violet-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            )}

            {view === 'login' && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-200 text-violet-600 focus:ring-violet-500/20 focus:ring-offset-0" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">Remember me</span>
                </label>
                <button 
                  type="button" 
                  onClick={() => setView('reset')}
                  disabled={isBusy}
                  className="text-xs font-bold text-violet-600 uppercase tracking-widest hover:text-violet-700 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isBusy}
              className="w-full py-4 px-6 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-violet-600/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {isBusy ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Please wait...
                </>
              ) : (
                <>
                  {view === 'login' && <LogIn size={20} />}
                  {view === 'signup' && <UserPlus size={20} />}
                  {view === 'reset' && <Key size={20} />}
                  {view === 'login' ? 'Sign In' : view === 'signup' ? 'Create Account' : 'Send Reset Link'}
                </>
              )}
            </button>
            </fieldset>
          </form>

          {view === 'login' && (
            <div className="text-center mt-6">
              <button 
                onClick={() => setView('signup')}
                disabled={isBusy}
                className="text-sm font-bold text-slate-500 hover:text-violet-600 transition-colors"
              >
                Don't have an account? <span className="underline">Sign up</span>
              </button>
            </div>
          )}

          {(view === 'signup' || view === 'reset') && (
            <div className="text-center mt-6">
              <button 
                onClick={() => setView('login')}
                disabled={isBusy}
                className="text-sm font-bold text-slate-500 hover:text-violet-600 transition-colors"
              >
                Back to Login
              </button>
            </div>
          )}

          {view === 'login' && (
            <>
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100"></div>
                </div>
                <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
                  <span className="px-4 bg-white text-slate-400">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isBusy}
                className="w-full py-4 px-6 bg-white border border-slate-100 hover:bg-slate-50 text-slate-600 font-bold text-xs uppercase tracking-widest rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-4 shadow-sm"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                Sign in with Google
              </button>
            </>
          )}

        </div>
      </div>
      {isBusy && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] z-20 flex items-center justify-center pointer-events-auto">
          <div className="bg-white/95 border border-slate-200 rounded-2xl px-6 py-4 shadow-xl flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
            <p className="text-sm font-semibold text-slate-700">Signing you in, please wait...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
