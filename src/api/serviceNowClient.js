import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const serviceNowClient = axios.create({
  baseURL: '/api/now',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }
});

serviceNowClient.interceptors.request.use((config) => {
  const { user } = useAuthStore.getState();
  if (user && user.authHeader) {
    config.headers['Authorization'] = user.authHeader;
    // Handle user impersonation for Service Account based logins (e.g. Google)
    if (user.impersonateUser) {
      config.headers['X-ServiceNow-User'] = user.impersonateUser;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default serviceNowClient;
