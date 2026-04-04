import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useShallow } from 'zustand/react/shallow';
import { Lock, User, Loader2 } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, oauthLogin, error, isAuthenticated } = useAuthStore(useShallow(state => ({
    login: state.login,
    oauthLogin: state.oauthLogin,
    error: state.error,
    isAuthenticated: state.isAuthenticated
  })));
  const navigate = useNavigate();

  useEffect(() => {
    // Check for OAuth token in URL fragment (Implicit flow)
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=')) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      // For implicit flow, the username might not be directly available, 
      // but ServiceNow sys_user table queries require it. In a real setup,
      // the token allows fetching the current user info directly via /api/now/ui/user/current_user
      // We will clear the hash and call oauthLogin
      window.history.replaceState(null, '', window.location.pathname);
      if (accessToken) {
         oauthLogin(accessToken); 
      }
    }

    if (isAuthenticated) {
      navigate('/'); // Redirect to dashboard when authenticated
    }
  }, [isAuthenticated, navigate, oauthLogin]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Attempt authentication via sys_user proxy
    await login(username, password);
    setIsSubmitting(false);
  };

  const handleOAuthLogin = (provider) => {
    // In a real OAuth setup, this will redirect to ServiceNow's OAuth endpoint
    // which is configured for Multi-Provider SSO (e.g. Google).
    
    // Replace with your actual ServiceNow Instance URL and OAuth Client ID
    const instanceUrl = 'https://dev318299.service-now.com'; 
    const clientId = 'YOUR_OAUTH_CLIENT_ID'; 
    const redirectUri = window.location.origin; // Usually something like /auth/callback
    
    const oauthUrl = `${instanceUrl}/oauth_auth.do?response_type=token&client_id=${clientId}&redirect_uri=${redirectUri}`;
    
    // Redirect user to ServiceNow to authenticate via Google
    window.location.href = oauthUrl;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        <div className="bg-surface/60 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 shadow-2xl transition-all duration-300 hover:border-slate-600/50 hover:shadow-primary/5">
          
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-indigo-600 rounded-xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
              <span className="text-3xl font-bold text-white">S</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-slate-400">Sign in to the ESC Portal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200"
                  placeholder="admin"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 p-3 rounded-lg flex items-start animate-fade-in">
                <span className="mr-2">⚠️</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
              {isSubmitting ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                'Log in'
              )}
            </button>

            <div className="flex justify-between text-sm text-slate-300 mt-4 px-2">
              <a href="#" className="hover:text-primary transition-colors">Login with SSO</a>
              <a href="#" className="hover:text-primary transition-colors">Forgot Password ?</a>
            </div>

            <div className="relative mt-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-slate-800/80 text-slate-400">Or log in with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOAuthLogin('google')}
              className="mt-6 w-full flex items-center justify-center gap-2 py-3 px-4 border border-slate-600 rounded-lg shadow-sm text-sm font-medium text-white bg-transparent hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-slate-500 transition-all duration-200"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </button>
          </form>
          
          <div className="mt-6 text-center text-xs text-slate-500">
            Powered by ServiceNow REST APIs
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
