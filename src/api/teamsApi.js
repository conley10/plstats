const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export async function getTeams(params = {}) {
  const query = new URLSearchParams(params).toString();

  const url = query
    ? `${API_BASE_URL}/teams?${query}`
    : `${API_BASE_URL}/teams`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Unable to load teams: ${response.status}`,
    );
  }

  return response.json();
}

export async function getTeam(
  teamId,
  params = {},
) {
  const query = new URLSearchParams(params).toString();

  const url = query
    ? `${API_BASE_URL}/teams/${teamId}?${query}`
    : `${API_BASE_URL}/teams/${teamId}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Unable to load team: ${response.status}`,
    );
  }

  return response.json();
}

export async function getTeamHeadToHead(
  teamOneId,
  teamTwoId,
  params = {},
) {
  const query = new URLSearchParams(params).toString();

  const path =
    `${API_BASE_URL}/teams/${teamOneId}/headtohead/${teamTwoId}`;

  const url = query ? `${path}?${query}` : path;
  const response = await fetch(url);

  if (!response.ok) {
    const payload = await response.json().catch(() => null);

    throw new Error(
      payload?.error ||
        `Unable to load head-to-head history: ${response.status}`,
    );
  }

  return response.json();
}
