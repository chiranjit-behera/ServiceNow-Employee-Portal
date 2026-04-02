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
    if (user && user.basicAuthToken) {
      config.headers.Authorization = user.basicAuthToken;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export default serviceCatalogClient;

