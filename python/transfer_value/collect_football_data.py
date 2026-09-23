import os
from pathlib import Path

import requests
from dotenv import load_dotenv


# Project root
PROJECT_ROOT = Path(__file__).resolve().parents[2]

# Load variables from the root .env file
load_dotenv(PROJECT_ROOT / ".env")

API_KEY = os.getenv("FOOTBALL_DATA_API_KEY")

BASE_URL = "https://api.football-data.org/v4"


if not API_KEY:
    raise RuntimeError(
        "FOOTBALL_DATA_API_KEY was not found in .env"
    )


headers = {
    "X-Auth-Token": API_KEY
}


def get_premier_league():
    url = f"{BASE_URL}/competitions/PL"

    response = requests.get(
        url,
        headers=headers,
        timeout=30,
    )

    response.raise_for_status()

    return response.json()

def get_premier_league_matches(season):
    url = f"{BASE_URL}/competitions/PL/matches"

    params = {
        "season": season
    }

    response = requests.get(
        url,
        headers=headers,
        params=params,
        timeout=30,
    )

    print(
        f"Season {season} status:",
        response.status_code,
    )

    response.raise_for_status()

    return response.json()


if __name__ == "__main__":
    print("Testing historical Premier League data...")
    print()

    data = get_premier_league_matches(2017)

    matches = data.get("matches", [])

    print("2017/18 matches found:", len(matches))

    if matches:
        first_match = matches[0]

        print()
        print("Example match:")
        print(
            first_match["homeTeam"]["name"],
            "vs",
            first_match["awayTeam"]["name"],
        )

        print("Date:", first_match["utcDate"])
        print("Status:", first_match["status"])