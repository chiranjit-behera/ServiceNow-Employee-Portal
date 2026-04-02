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
  if (user && user.basicAuthToken) {
    config.headers['Authorization'] = user.basicAuthToken;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default serviceNowClient;
