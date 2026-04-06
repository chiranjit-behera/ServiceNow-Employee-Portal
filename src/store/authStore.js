import { create } from 'zustand';
import { persist } from 'zustand/middleware';


const fetchUserProfile = async (authHeader) => {
  let userDetails = { authHeader, roles: [] };

  try {
    const userRes = await fetch(
      `/api/now/table/sys_user?sysparm_query=sys_id=javascript:gs.getUserID()` +
      `&sysparm_limit=1` +
      `&sysparm_fields=user_name,first_name,last_name,email,mobile_phone,name,sys_id,sys_class_name`,
      { headers: { Authorization: authHeader, Accept: 'application/json' } }
    );

    if (userRes.ok) {
      const data = await userRes.json();
      if (data?.result?.length > 0) {
        const u = data.result[0];
        Object.assign(userDetails, {
          username: u.user_name || '',
          first_name: u.first_name || '',
          last_name: u.last_name || '',
          email: u.email || '',
          mobile_phone: u.mobile_phone || u.phone || '',
          name: u.name || '',
          sys_id: u.sys_id || '',
          sys_class_name: u.sys_class_name || '',
        });

        // Fetch roles
        if (userDetails.sys_id) {
          try {
            const roleRes = await fetch(
              `/api/now/table/sys_user_has_role?sysparm_query=user=${userDetails.sys_id}` +
              `&sysparm_display_value=true&sysparm_fields=role`,
              { headers: { Authorization: authHeader, Accept: 'application/json' } }
            );
            if (roleRes.ok) {
              const roleData = await roleRes.json();
              userDetails.roles = (roleData?.result || [])
                .map((r) => r.role?.display_value || r.role || '')
                .filter(Boolean)
                .map((r) => r.toLowerCase());
            }
          } catch (roleErr) {
            console.warn('Could not fetch user roles:', roleErr);
          }
        }
      }
    }
  } catch (e) {
    console.warn('Could not fetch user profile:', e);
  }

  return userDetails;
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      error: null,

      oauthLogin: async (accessToken) => {
        try {
          const authHeader = `Bearer ${accessToken}`;
          const userDetails = await fetchUserProfile(authHeader);

          set({ user: userDetails, isAuthenticated: true, error: null });
          return true;
        } catch (err) {
          console.error('OAuth login failed:', err);
          set({ error: 'OAuth authentication failed.', isAuthenticated: false });
          return false;
        }
      },

     
      googleLogin: async (idToken) => {
        try {
          const payloadBase64 = idToken.split('.')[1];
          if (!payloadBase64) throw new Error('Invalid Google id_token format.');

          const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
          const googleProfile = JSON.parse(payloadJson);

          const googleEmail = googleProfile.email;
          const googleName = googleProfile.name || '';

          if (!googleEmail) throw new Error('Google id_token did not contain an email claim.');

          const saUser = import.meta.env.VITE_SN_SERVICE_ACCOUNT_USER;
          const saPass = import.meta.env.VITE_SN_SERVICE_ACCOUNT_PASS;

          if (!saUser || !saPass) {
            throw new Error(
              'Missing VITE_SN_SERVICE_ACCOUNT_USER or VITE_SN_SERVICE_ACCOUNT_PASS in .env'
            );
          }

          const authHeader = `Basic ${btoa(`${saUser}:${saPass}`)}`;

          const userRes = await fetch(
            `/api/now/table/sys_user` +
            `?sysparm_query=email=${encodeURIComponent(googleEmail)}` +
            `&sysparm_limit=1` +
            `&sysparm_fields=user_name,first_name,last_name,email,mobile_phone,name,sys_id,sys_class_name`,
            { headers: { Authorization: authHeader, Accept: 'application/json' } }
          );

          if (!userRes.ok) {
            throw new Error(`ServiceNow user lookup failed (${userRes.status})`);
          }

          const userData = await userRes.json();

          if (!userData?.result?.length) {
            throw new Error(
              `No ServiceNow user found with email "${googleEmail}". ` +
              `Ask your admin to add this email to your user record.`
            );
          }

          const u = userData.result[0];

          let roles = [];
          try {
            const roleRes = await fetch(
              `/api/now/table/sys_user_has_role` +
              `?sysparm_query=user=${u.sys_id}` +
              `&sysparm_display_value=true&sysparm_fields=role`,
              { headers: { Authorization: authHeader, Accept: 'application/json' } }
            );
            if (roleRes.ok) {
              const roleData = await roleRes.json();
              roles = (roleData?.result || [])
                .map((r) => r.role?.display_value || r.role || '')
                .filter(Boolean)
                .map((r) => r.toLowerCase());
            }
          } catch (roleErr) {
            console.warn('Could not fetch roles for Google user:', roleErr);
          }

          set({
            user: {
              authHeader,
              loginProvider: 'google',
              username: u.user_name || googleEmail,
              first_name: u.first_name || googleName.split(' ')[0] || '',
              last_name: u.last_name || googleName.split(' ')[1] || '',
              email: u.email || googleEmail,
              mobile_phone: u.mobile_phone || '',
              name: u.name || googleName,
              sys_id: u.sys_id || '',
              sys_class_name: u.sys_class_name || '',
              roles,
            },
            isAuthenticated: true,
            error: null,
          });

          return true;
        } catch (err) {
          console.error('Google login failed:', err);
          set({
            error: err.message || 'Google sign-in failed. Please try again.',
            isAuthenticated: false,
          });
          return false;
        }
      },

      login: async (username, password) => {
        try {
          const encoded = btoa(`${username}:${password}`);
          const authHeader = `Basic ${encoded}`;

          const response = await fetch('/api/now/table/incident?sysparm_limit=1', {
            headers: { Authorization: authHeader, Accept: 'application/json' },
          });

          if (response.status === 401) throw new Error('Invalid credentials');
          if (!response.ok && response.status !== 403)
            throw new Error(`API error: ${response.status}`);

          const userDetails = await fetchUserProfile(authHeader);

          set({
            user: { username, ...userDetails, loginProvider: 'basic' },
            isAuthenticated: true,
            error: null,
          });

          return true;
        } catch (err) {
          console.error('Login attempt failed:', err);
          set({
            error:
              err.message === 'Invalid credentials'
                ? 'Invalid username or password.'
                : 'Invalid username or password. (Check network or permissions)',
            isAuthenticated: false,
          });
          return false;
        }
      },

      logout: () => {
        set({ user: null, isAuthenticated: false, error: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
