import apiClient from "./client";

export async function getFixture(fixtureId) {
  const response = await apiClient.get(`/fixtures/${fixtureId}`);
  return response.data;
}

export async function getFixtures(params = {}) {
  const response = await apiClient.get("/fixtures", {
    params,
  });

  return response.data;
}