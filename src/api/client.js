import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://plstats-api.onrender.com/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

export default apiClient;