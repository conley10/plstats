import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from understatapi import UnderstatClient


PROJECT_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIRECTORY = PROJECT_ROOT / "server" / "data"

EARLIEST_SEASON = 2014


def number(value, default=0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def whole_number(value, default=0):
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def current_season_start_year():
    today = datetime.now()

    if today.month >= 7:
        return today.year

    return today.year - 1


def normalise_player(player):
    return {
        "understatId": str(player.get("id", "")),
        "name": player.get("player_name", "Unknown Player"),
        "team": player.get("team_title", "Unknown Team"),
        "position": player.get("position", "Unknown"),
        "appearances": whole_number(player.get("games")),
        "minutes": whole_number(player.get("time")),
        "goals": whole_number(player.get("goals")),
        "assists": whole_number(player.get("assists")),
        "shots": whole_number(player.get("shots")),
        "keyPasses": whole_number(player.get("key_passes")),
        "xg": round(number(player.get("xG")), 2),
        "xa": round(number(player.get("xA")), 2),
        "npg": whole_number(player.get("npg")),
        "npxg": round(number(player.get("npxG")), 2),
        "xgChain": round(number(player.get("xGChain")), 2),
        "xgBuildup": round(number(player.get("xGBuildup")), 2),
        "yellowCards": whole_number(player.get("yellow_cards")),
        "redCards": whole_number(player.get("red_cards")),
    }


def load_players(season):
    with UnderstatClient() as client:
        league = client.league(
            league="EPL",
        )

        players = league.get_player_data(
            season=str(season),
        )

    if not isinstance(players, list):
        raise RuntimeError(
            "Understat returned an unexpected player-data format."
        )

    return [normalise_player(player) for player in players]

def write_output(season, players):
    OUTPUT_DIRECTORY.mkdir(parents=True, exist_ok=True)

    output_path = (
        OUTPUT_DIRECTORY
        / f"understat-players-{season}.json"
    )

    # Check whether the existing player data has actually changed.
    if output_path.exists():
        try:
            existing_payload = json.loads(
                output_path.read_text(encoding="utf-8")
            )

            existing_players = existing_payload.get(
                "players",
                [],
            )

            if existing_players == players:
                print(
                    f"No player-data changes detected for "
                    f"{season}/{season + 1}."
                )

                return output_path

        except (json.JSONDecodeError, OSError):
            # If the existing file cannot be read,
            # simply overwrite it with fresh data.
            pass

    payload = {
        "season": str(season),
        "updatedAt": datetime.now(
            timezone.utc
        ).isoformat(),
        "count": len(players),
        "players": players,
    }

    output_path.write_text(
        json.dumps(
            payload,
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    return output_path


def import_season(season):
    print(f"Importing EPL season {season}/{season + 1}...")

    players = load_players(season)
    output_path = write_output(season, players)

    print(
        f"Imported {len(players)} players "
        f"to {output_path}"
    )

    return {
        "season": season,
        "count": len(players),
        "path": output_path,
    }


def import_all_seasons(start_season, end_season):
    successful = []
    failed = []

    for season in range(start_season, end_season + 1):
        try:
            result = import_season(season)
            successful.append(result)
        except Exception as error:
            print(
                f"Season {season}/{season + 1} failed: "
                f"{error}",
                file=sys.stderr,
            )

            failed.append(
                {
                    "season": season,
                    "error": str(error),
                }
            )

    print()
    print("Import complete.")
    print(f"Successful seasons: {len(successful)}")
    print(f"Failed seasons: {len(failed)}")

    if failed:
        print()
        print("Failed season list:")

        for item in failed:
            print(
                f"- {item['season']}/"
                f"{item['season'] + 1}: "
                f"{item['error']}"
            )

    if not successful:
        raise RuntimeError(
            "No seasons were imported successfully."
        )


def main():
    parser = argparse.ArgumentParser(
        description=(
            "Import Premier League player data "
            "from Understat."
        )
    )

    parser.add_argument(
        "--season",
        type=int,
        help=(
            "Import one season using its starting year, "
            "for example 2025."
        ),
    )

    parser.add_argument(
        "--all",
        action="store_true",
        help="Import every available configured season.",
    )

    parser.add_argument(
        "--from-season",
        type=int,
        default=EARLIEST_SEASON,
        help=(
            "Starting year when using --all. "
            f"Defaults to {EARLIEST_SEASON}."
        ),
    )

    parser.add_argument(
        "--to-season",
        type=int,
        default=current_season_start_year(),
        help=(
            "Final starting year when using --all. "
            "Defaults to the current season."
        ),
    )

    args = parser.parse_args()

    if args.all and args.season is not None:
        parser.error(
            "Use either --all or --season, not both."
        )

    try:
        if args.all:
            if args.from_season > args.to_season:
                parser.error(
                    "--from-season cannot be later "
                    "than --to-season."
                )

            import_all_seasons(
                args.from_season,
                args.to_season,
            )
        else:
            season = (
                args.season
                if args.season is not None
                else current_season_start_year()
            )

            import_season(season)

    except Exception as error:
        print(
            f"Understat import failed: {error}",
            file=sys.stderr,
        )

        raise SystemExit(1)


if __name__ == "__main__":
    main()