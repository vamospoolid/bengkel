import axios from 'axios';

const getServerUrl = () => {
  const savedIp = localStorage.getItem('server_ip');
  if (savedIp) return `http://${savedIp}/api`;
  return `http://${window.location.hostname}/api`;
};

const api = axios.create({
  baseURL: getServerUrl(),
});

// Update baseURL dynamically when needed
export const updateApiBaseUrl = (newIp: string) => {
  api.defaults.baseURL = `http://${newIp}/api`;
};

export default api;
