from pathlib import Path
import html
import re
import unicodedata

import pandas as pd


# --------------------------------------------------
# Paths
# --------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[2]

TRANSFER_DIR = (
    PROJECT_ROOT
    / "python"
    / "transfer_value"
    / "data"
)

RAW_DIR = TRANSFER_DIR / "raw"
PROCESSED_DIR = TRANSFER_DIR / "processed"

TRAINING_FILE = (
    PROCESSED_DIR / "training_dataset.csv"
)

PLAYERS_FILE = (
    RAW_DIR / "players.csv.gz"
)

VALUATIONS_FILE = (
    RAW_DIR / "player_valuations.csv.gz"
)

OUTPUT_FILE = (
    PROCESSED_DIR
    / "duplicate_name_audit.csv"
)


# --------------------------------------------------
# Name normalisation
# --------------------------------------------------

def normalise_name(name):
    if pd.isna(name):
        return ""

    name = html.unescape(
        str(name)
    )

    name = name.strip().lower()

    name = unicodedata.normalize(
        "NFKD",
        name,
    )

    name = "".join(
        character
        for character in name
        if not unicodedata.combining(
            character
        )
    )

    replacements = {
        "ø": "o",
        "ð": "d",
        "þ": "th",
        "ł": "l",
        "đ": "d",
        "æ": "ae",
        "œ": "oe",
    }

    for old, new in replacements.items():
        name = name.replace(
            old,
            new,
        )

    name = re.sub(
        r"[^a-z0-9 ]",
        " ",
        name,
    )

    name = re.sub(
        r"\s+",
        " ",
        name,
    ).strip()

    return name


# --------------------------------------------------
# Main
# --------------------------------------------------

def main():

    print(
        "Loading PLStats training data..."
    )

    training = pd.read_csv(
        TRAINING_FILE
    )

    print(
        f"Training rows: "
        f"{len(training):,}"
    )

    print()
    print(
        "Loading Transfermarkt players..."
    )

    players = pd.read_csv(
        PLAYERS_FILE,
        compression="gzip",
        low_memory=False,
    )

    print(
        f"Transfermarkt players: "
        f"{len(players):,}"
    )

    print()
    print(
        "Loading valuations..."
    )

    valuations = pd.read_csv(
        VALUATIONS_FILE,
        compression="gzip",
        low_memory=False,
    )

    # ----------------------------------------------
    # Normalise names
    # ----------------------------------------------

    training["match_name"] = (
        training["player"]
        .apply(normalise_name)
    )

    players["match_name"] = (
        players["name"]
        .apply(normalise_name)
    )

    # ----------------------------------------------
    # Count duplicate Transfermarkt names
    # ----------------------------------------------

    name_counts = (
        players
        .groupby("match_name")
        .size()
    )

    duplicate_names = (
        name_counts[
            name_counts > 1
        ]
        .index
    )

    suspicious = training[
        training["match_name"].isin(
            duplicate_names
        )
    ].copy()

    print()
    print(
        "Duplicate-name audit:"
    )

    print(
        f"Player-season rows with "
        f"ambiguous names: "
        f"{len(suspicious):,}"
    )

    print(
        f"Unique ambiguous PLStats players: "
        f"{suspicious['player'].nunique():,}"
    )

    # ----------------------------------------------
    # Prepare valuation information
    # ----------------------------------------------

    valuations["date"] = pd.to_datetime(
        valuations["date"],
        errors="coerce",
    )

    valuation_summary = (
        valuations
        .groupby("player_id")
        .agg(
            valuation_count=(
                "market_value_in_eur",
                "count",
            ),
            earliest_valuation=(
                "date",
                "min",
            ),
            latest_valuation=(
                "date",
                "max",
            ),
            maximum_market_value=(
                "market_value_in_eur",
                "max",
            ),
        )
        .reset_index()
    )

    # ----------------------------------------------
    # Build audit table
    # ----------------------------------------------

    audit_rows = []

    unique_suspicious = (
        suspicious[
            [
                "player",
                "match_name",
                "team",
                "season",
                "transfermarkt_player_id",
                "market_value_eur",
            ]
        ]
        .drop_duplicates(
            [
                "player",
                "season",
            ]
        )
    )

    for _, row in (
        unique_suspicious.iterrows()
    ):

        candidates = players[
            players["match_name"]
            == row["match_name"]
        ].copy()

        for _, candidate in (
            candidates.iterrows()
        ):

            candidate_id = (
                candidate["player_id"]
            )

            valuation_info = (
                valuation_summary[
                    valuation_summary[
                        "player_id"
                    ]
                    == candidate_id
                ]
            )

            if valuation_info.empty:
                valuation_count = 0
                earliest = pd.NaT
                latest = pd.NaT
                max_value = None

            else:
                info = (
                    valuation_info.iloc[0]
                )

                valuation_count = (
                    info[
                        "valuation_count"
                    ]
                )

                earliest = (
                    info[
                        "earliest_valuation"
                    ]
                )

                latest = (
                    info[
                        "latest_valuation"
                    ]
                )

                max_value = (
                    info[
                        "maximum_market_value"
                    ]
                )

            audit_rows.append(
                {
                    "plstats_player":
                        row["player"],

                    "plstats_team":
                        row["team"],

                    "season":
                        row["season"],

                    "current_selected_id":
                        row[
                            "transfermarkt_player_id"
                        ],

                    "current_market_value":
                        row[
                            "market_value_eur"
                        ],

                    "candidate_id":
                        candidate_id,

                    "candidate_name":
                        candidate.get(
                            "name"
                        ),

                    "candidate_position":
                        candidate.get(
                            "position"
                        ),

                    "candidate_sub_position":
                        candidate.get(
                            "sub_position"
                        ),

                    "candidate_dob":
                        candidate.get(
                            "date_of_birth"
                        ),

                    "candidate_current_club":
                        candidate.get(
                            "current_club_name"
                        ),

                    "candidate_country":
                        candidate.get(
                            "country_of_citizenship"
                        ),

                    "valuation_count":
                        valuation_count,

                    "earliest_valuation":
                        earliest,

                    "latest_valuation":
                        latest,

                    "maximum_market_value":
                        max_value,

                    "currently_selected":
                        (
                            candidate_id
                            == row[
                                "transfermarkt_player_id"
                            ]
                        ),
                }
            )

    audit = pd.DataFrame(
        audit_rows
    )

    audit.to_csv(
        OUTPUT_FILE,
        index=False,
    )

    # ----------------------------------------------
    # Print the most suspicious current values
    # ----------------------------------------------

    print()
    print(
        "Lowest selected market values "
        "among ambiguous names:"
    )

    print(
        "-" * 100
    )

    selected = (
        audit[
            audit[
                "currently_selected"
            ]
            == True
        ]
        .sort_values(
            "current_market_value"
        )
    )

    columns = [
        "plstats_player",
        "plstats_team",
        "season",
        "current_selected_id",
        "current_market_value",
        "candidate_position",
        "candidate_dob",
        "candidate_current_club",
    ]

    print(
        selected[
            columns
        ]
        .head(40)
        .to_string(
            index=False
        )
    )

    print()
    print(
        "Audit saved to:"
    )

    print(
        OUTPUT_FILE
    )


if __name__ == "__main__":
    main()