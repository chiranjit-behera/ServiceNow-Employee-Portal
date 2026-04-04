import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      error: null,
      oauthLogin: async (accessToken) => {
        try {
          const authHeader = `Bearer ${accessToken}`;
          // Set user details from basic token if possible, else fetch them.
          let userDetails = { username: '', authHeader, roles: [] };
          // Attempt to fetch specific user details using the bearer token
          try {
            // Using javascript:gs.getUserID() to get the currently authenticated user's sys_user record
            const userRes = await fetch(`/api/now/table/sys_user?sysparm_query=sys_id=javascript:gs.getUserID()&sysparm_limit=1&sysparm_fields=user_name,first_name,last_name,email,mobile_phone,name,sys_id,sys_class_name`, {
              headers: {
                'Authorization': authHeader,
                'Accept': 'application/json'
              }
            });
            if (userRes.ok) {
              const data = await userRes.json();
              if (data && data.result && data.result.length > 0) {
                const u = data.result[0];
                Object.assign(userDetails, {
                  username: u.user_name || '',
                  first_name: u.first_name || '',
                  last_name: u.last_name || '',
                  email: u.email || '',
                  mobile_phone: u.mobile_phone || u.phone || '',
                  name: u.name || '',
                  sys_id: u.sys_id || '',
                  sys_class_name: u.sys_class_name || ''
                });
                
                if (userDetails.sys_id) {
                  try {
                    const roleRes = await fetch(`/api/now/table/sys_user_has_role?sysparm_query=user=${userDetails.sys_id}&sysparm_display_value=true&sysparm_fields=role`, {
                      headers: {
                        'Authorization': authHeader,
                        'Accept': 'application/json'
                      }
                    });
                    if (roleRes.ok) {
                      const roleData = await roleRes.json();
                      if (roleData && roleData.result) {
                         userDetails.roles = roleData.result.map(r => r.role?.display_value || r.role || '').filter(Boolean).map(r => r.toLowerCase());
                      }
                    }
                  } catch (roleErr) {
                    console.warn("Could not fetch user roles via OAuth", roleErr);
                  }
                }
              }
            }
          } catch (e) {
            console.warn("Could not fetch extra user details via OAuth", e);
          }

          set({
            user: userDetails,
            isAuthenticated: true,
            error: null
          });
          return true;
        } catch (err) {
          console.error("OAuth Login attempt failed: ", err);
          set({ error: 'OAuth authentication failed.', isAuthenticated: false });
          return false;
        }
      },
      login: async (username, password) => {
        try {
          const encoded = btoa(`${username}:${password}`);
          const authHeader = `Basic ${encoded}`;
          const response = await fetch('/api/now/table/incident?sysparm_limit=1', {
            headers: {
              'Authorization': authHeader,
              'Accept': 'application/json'
            }
          });

          if (response.status === 401) {
            throw new Error('Invalid credentials');
          }

          if (!response.ok && response.status !== 403) {
            throw new Error(`API error: ${response.status}`);
          }

          // Attempt to fetch specific user details requested
          let userDetails = {};
          try {
            const userRes = await fetch(`/api/now/table/sys_user?sysparm_query=user_name=${username}&sysparm_limit=1&sysparm_fields=first_name,last_name,email,mobile_phone,name,sys_id,sys_class_name`, {
              headers: {
                'Authorization': authHeader,
                'Accept': 'application/json'
              }
            });
            if (userRes.ok) {
              const data = await userRes.json();
              if (data && data.result && data.result.length > 0) {
                const u = data.result[0];
                userDetails = {
                  first_name: u.first_name || '',
                  last_name: u.last_name || '',
                  email: u.email || '',
                  mobile_phone: u.mobile_phone || u.phone || '',
                  name: u.name || '',
                  sys_id: u.sys_id || '',
                  sys_class_name: u.sys_class_name || '',
                  roles: []
                };
                
                if (userDetails.sys_id) {
                  try {
                    const roleRes = await fetch(`/api/now/table/sys_user_has_role?sysparm_query=user=${userDetails.sys_id}&sysparm_display_value=true&sysparm_fields=role`, {
                      headers: {
                        'Authorization': authHeader,
                        'Accept': 'application/json'
                      }
                    });
                    if (roleRes.ok) {
                      const roleData = await roleRes.json();
                      if (roleData && roleData.result) {
                         // sysparm_display_value=true usually returns an object for reference fields: { display_value: 'admin', link: '...' }
                         userDetails.roles = roleData.result.map(r => r.role?.display_value || r.role || '').filter(Boolean).map(r => r.toLowerCase());
                      }
                    }
                  } catch (roleErr) {
                    console.warn("Could not fetch user roles", roleErr);
                  }
                }
              }
            }
          } catch (e) {
            console.warn("Could not fetch extra user details due to ACLs or network", e);
          }

          set({
            user: { username, authHeader, ...userDetails },
            isAuthenticated: true,
            error: null
          });

          return true;
        } catch (err) {
          console.error("Login attempt failed: ", err);
          let errorMsg = 'Invalid username or password.';
          if (err.message !== 'Invalid credentials') {
            errorMsg = 'Invalid username or password. (Check network or permissions)';
          }
          set({ error: errorMsg, isAuthenticated: false });
          return false;
        }
      },

      logout: () => {
        set({ user: null, isAuthenticated: false, error: null });
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      }),
    }
  )
);
