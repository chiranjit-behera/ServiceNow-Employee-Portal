import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const serviceCatalogClient = axios.create({
  baseURL: '/api/sn_sc',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

serviceCatalogClient.interceptors.request.use(
  (config) => {
    const { user } = useAuthStore.getState();
    const authHeader = user?.authHeader || user?.basicAuthToken;

    if (authHeader) {
      config.headers.Authorization = authHeader;
      if (user?.impersonateUser) {
        config.headers['X-ServiceNow-User'] = user.impersonateUser;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export default serviceCatalogClient;
