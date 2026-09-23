import json
from pathlib import Path

import pandas as pd


# Project paths
PROJECT_ROOT = Path(__file__).resolve().parents[2]

UNDERSTAT_DIR = PROJECT_ROOT / "server" / "data"

OUTPUT_DIR = (
    PROJECT_ROOT
    / "python"
    / "transfer_value"
    / "data"
    / "processed"
)

OUTPUT_FILE = OUTPUT_DIR / "player_seasons.csv"


# Seasons we want for the first ML dataset
START_SEASON = 2017
END_SEASON = 2025


def load_understat_season(season):
    file_path = (
        UNDERSTAT_DIR
        / f"understat-players-{season}.json"
    )

    if not file_path.exists():
        print(
            f"WARNING: No Understat file for {season}"
        )
        return []

    with open(
        file_path,
        "r",
        encoding="utf-8",
    ) as file:
        data = json.load(file)

    return data.get("players", [])


def safe_per_90(value, minutes):
    if not minutes or minutes <= 0:
        return 0.0

    return (value / minutes) * 90


def build_player_seasons():
    rows = []

    for season in range(
        START_SEASON,
        END_SEASON + 1,
    ):
        players = load_understat_season(
            season
        )

        print(
            f"{season}/{str(season + 1)[-2:]}: "
            f"{len(players)} players"
        )

        for player in players:
            minutes = int(
                player.get("minutes", 0)
                or 0
            )

            goals = int(
                player.get("goals", 0)
                or 0
            )

            assists = int(
                player.get("assists", 0)
                or 0
            )

            shots = int(
                player.get("shots", 0)
                or 0
            )

            key_passes = int(
                player.get("keyPasses", 0)
                or 0
            )

            xg = float(
                player.get("xg", 0)
                or 0
            )

            xa = float(
                player.get("xa", 0)
                or 0
            )

            row = {
                "understat_id":
                    player.get(
                        "understatId"
                    ),

                "player":
                    player.get("name"),

                "season":
                    season,

                "team":
                    player.get("team"),

                "position":
                    player.get(
                        "position"
                    ),

                "appearances":
                    int(
                        player.get(
                            "appearances",
                            0,
                        )
                        or 0
                    ),

                "minutes":
                    minutes,

                "goals":
                    goals,

                "assists":
                    assists,

                "shots":
                    shots,

                "key_passes":
                    key_passes,

                "xg":
                    xg,

                "xa":
                    xa,

                "npg":
                    int(
                        player.get(
                            "npg",
                            0,
                        )
                        or 0
                    ),

                "npxg":
                    float(
                        player.get(
                            "npxg",
                            0,
                        )
                        or 0
                    ),

                "xg_chain":
                    float(
                        player.get(
                            "xgChain",
                            0,
                        )
                        or 0
                    ),

                "xg_buildup":
                    float(
                        player.get(
                            "xgBuildup",
                            0,
                        )
                        or 0
                    ),

                "yellow_cards":
                    int(
                        player.get(
                            "yellowCards",
                            0,
                        )
                        or 0
                    ),

                "red_cards":
                    int(
                        player.get(
                            "redCards",
                            0,
                        )
                        or 0
                    ),

                "goals_per_90":
                    safe_per_90(
                        goals,
                        minutes,
                    ),

                "assists_per_90":
                    safe_per_90(
                        assists,
                        minutes,
                    ),

                "xg_per_90":
                    safe_per_90(
                        xg,
                        minutes,
                    ),

                "xa_per_90":
                    safe_per_90(
                        xa,
                        minutes,
                    ),

                "shots_per_90":
                    safe_per_90(
                        shots,
                        minutes,
                    ),

                "key_passes_per_90":
                    safe_per_90(
                        key_passes,
                        minutes,
                    ),
            }

            rows.append(row)

    return pd.DataFrame(rows)


if __name__ == "__main__":
    print(
        "Building PLStats player-season dataset..."
    )
    print()

    dataframe = build_player_seasons()

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    dataframe.to_csv(
        OUTPUT_FILE,
        index=False,
    )

    print()
    print(
        "Dataset created successfully!"
    )
    print(
        "Rows:",
        len(dataframe),
    )
    print(
        "Columns:",
        len(dataframe.columns),
    )
    print(
        "Seasons:",
        dataframe["season"]
        .nunique(),
    )
    print()
    print(
        "Saved to:",
        OUTPUT_FILE,
    )

    print()
    print("Example:")
    print(
        dataframe.head().to_string(
            index=False
        )
    )