import axios from "axios";

const apiClient = axios.create({
  baseURL: "https://plstats-api.onrender.com/api",
  timeout: 30000,
});

export default apiClient;