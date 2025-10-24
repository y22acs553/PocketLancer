import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL, // <- uses .env.local
  withCredentials: true,                         // needed if JWT is sent as cookie
});

export default api;