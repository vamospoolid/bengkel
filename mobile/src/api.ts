import axios from 'axios';

const getServerUrl = () => {
  const savedIp = localStorage.getItem('server_ip');
  if (savedIp) return `http://${savedIp}:3002/api`;
  return `http://${window.location.hostname}:3002/api`;
};

const api = axios.create({
  baseURL: getServerUrl(),
});

// Update baseURL dynamically when needed
export const updateApiBaseUrl = (newIp: string) => {
  api.defaults.baseURL = `http://${newIp}:3002/api`;
};

export default api;
