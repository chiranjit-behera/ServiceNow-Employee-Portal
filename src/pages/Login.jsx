import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useShallow } from 'zustand/react/shallow';
import { Lock, User, Loader2 } from 'lucide-react';

// Google "G" Logo SVG
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      fill="#4285F4"
    />
    <path
      d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      fill="#34A853"
    />
    <path
      d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      fill="#FBBC05"
    />
    <path
      d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      fill="#EA4335"
    />
  </svg>
);

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const { login, oauthLogin, googleLogin, error, isAuthenticated } = useAuthStore(
    useShallow(state => ({
      login: state.login,
      oauthLogin: state.oauthLogin,
      googleLogin: state.googleLogin,
      error: state.error,
      isAuthenticated: state.isAuthenticated,
    }))
  );

  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('=')) {
      const params = new URLSearchParams(hash.substring(1));
      const state = params.get('state') || '';

      window.history.replaceState(null, '', window.location.pathname);

      if (state.startsWith('google|')) {
        const idToken = params.get('id_token');
        const savedNonce = sessionStorage.getItem('oauth_nonce');
        sessionStorage.removeItem('oauth_nonce');
        sessionStorage.removeItem('oauth_state');

        if (idToken) {
          setOauthLoading(true);
          googleLogin(idToken, savedNonce).finally(() => setOauthLoading(false));
        }
      } else if (params.get('access_token')) {
        const accessToken = params.get('access_token');
        setOauthLoading(true);
        oauthLogin(accessToken).finally(() => setOauthLoading(false));
      }
    }

    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate, oauthLogin, googleLogin]);

  const handleSSOLogin = () => {
    const instanceUrl =
      import.meta.env.VITE_SN_INSTANCE_URL || 'https://dev318299.service-now.com';
    const clientId = import.meta.env.VITE_SN_CLIENT_ID;
    const redirectUri =
      import.meta.env.VITE_SN_REDIRECT_URI || window.location.origin + '/login';

    if (!clientId || clientId === 'YOUR_SERVICENOW_OAUTH_CLIENT_ID_HERE') {
      alert('Please configure VITE_SN_CLIENT_ID in your .env file.');
      return;
    }

    const state = 'sso|' + Math.random().toString(36).substring(2, 15);
    const ssoId = import.meta.env.VITE_SN_SSO_ID;
    
    let oauthUrl =
      `${instanceUrl}/oauth_auth.do?response_type=token` +
      `&client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=user_info` +
      `&state=${encodeURIComponent(state)}`;

    if (ssoId && ssoId !== 'YOUR_SAML_SSO_SYS_ID_HERE') {
      oauthUrl += `&glide_sso_id=${encodeURIComponent(ssoId)}`;
    }

    window.location.href = oauthUrl;
  };

  const handleGoogleLogin = () => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const redirectUri =
      import.meta.env.VITE_SN_REDIRECT_URI || window.location.origin + '/login';

    if (!googleClientId || googleClientId === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
      alert('Please configure VITE_GOOGLE_CLIENT_ID in your .env file.');
      return;
    }

    const nonce = Math.random().toString(36).substring(2, 18);
    const state = 'google|' + Math.random().toString(36).substring(2, 15);

    sessionStorage.setItem('oauth_nonce', nonce);
    sessionStorage.setItem('oauth_state', state);

    const googleAuthUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?response_type=id_token` +
      `&client_id=${encodeURIComponent(googleClientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=openid%20email%20profile` +
      `&nonce=${encodeURIComponent(nonce)}` +
      `&state=${encodeURIComponent(state)}`;

    window.location.href = googleAuthUrl;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    await login(username, password);
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
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

          {oauthLoading && (
            <div className="flex flex-col items-center justify-center py-8 gap-3 animate-fade-in">
              <Loader2 className="animate-spin h-8 w-8 text-primary" />
              <p className="text-slate-400 text-sm">Completing sign-in…</p>
            </div>
          )}

          {!oauthLoading && (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Username
                </label>
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
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Password
                </label>
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
                <button
                  type="button"
                  onClick={handleSSOLogin}
                  className="hover:text-primary transition-colors cursor-pointer"
                >
                  Login with SSO
                </button>
                <a href="#" className="hover:text-primary transition-colors">
                  Forgot Password?
                </a>
              </div>

              <div className="relative mt-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-slate-800/80 text-slate-400">
                    Or log in with
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="mt-4 w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-600 rounded-lg shadow-sm text-sm font-medium text-white bg-transparent hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-slate-500 transition-all duration-200"
              >
                <GoogleIcon />
                <span>Continue with Google</span>
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-xs text-slate-500">
            Powered by ServiceNow REST APIs
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
