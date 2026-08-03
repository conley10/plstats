import apiClient from "./client";

export async function getHomeData() {
  const response = await apiClient.get("/home");
  return response.data;
}