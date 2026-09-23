from pathlib import Path
import html
import re
import unicodedata

import numpy as np
import pandas as pd

from rapidfuzz import fuzz, process


# --------------------------------------------------
# Project paths
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

PLAYER_SEASONS_FILE = (
    PROCESSED_DIR / "player_seasons.csv"
)

PLAYERS_FILE = (
    RAW_DIR / "players.csv.gz"
)

VALUATIONS_FILE = (
    RAW_DIR / "player_valuations.csv.gz"
)

TRANSFERS_FILE = (
    RAW_DIR / "transfers.csv.gz"
)

OUTPUT_FILE = (
    PROCESSED_DIR / "training_dataset.csv"
)

UNMATCHED_FILE = (
    PROCESSED_DIR / "unmatched_players.csv"
)


# --------------------------------------------------
# Known incorrect fuzzy matches
# --------------------------------------------------

BLOCKED_FUZZY_MATCHES = {
    ("dominic ballard", "dominic ball"),
    ("joseph gomez", "jose gomez"),
    ("samir", "sammir"),
    ("adrian", "adriano"),
}

BLOCKED_EXACT_IDENTITIES = {
    ("thiago", "brentford"),
}


# --------------------------------------------------
# Name matching
# --------------------------------------------------

def normalise_name(name):
    """
    Normalise player names for matching
    between Understat and Transfermarkt.
    """

    if pd.isna(name):
        return ""

    # Convert HTML entities:
    # N&#039;Golo -> N'Golo
    name = html.unescape(
        str(name)
    )

    name = name.strip().lower()

    # Remove accents.
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

    # Characters that Unicode
    # normalisation may not replace.
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

    # Keep only letters,
    # numbers and spaces.
    name = re.sub(
        r"[^a-z0-9 ]",
        " ",
        name,
    )

    # Remove repeated spaces.
    name = re.sub(
        r"\s+",
        " ",
        name,
    ).strip()

    return name


def find_player_candidates(
    understat_name,
    players_by_name,
    transfermarkt_names,
):
    """
    Try an exact normalised-name match.

    If that fails, use conservative
    fuzzy matching.
    """

    normalised = normalise_name(
        understat_name
    )

    # Exact match first.
    exact = players_by_name.get(
        normalised
    )

    if exact is not None:
        return (
            exact,
            "exact",
            100,
        )

    # Fuzzy match second.
    result = process.extractOne(
        normalised,
        transfermarkt_names,
        scorer=fuzz.token_sort_ratio,
        score_cutoff=88,
    )

    if result is None:
        return (
            None,
            None,
            None,
        )

    matched_name = result[0]
    score = result[1]

    # Reject fuzzy combinations that
    # we have manually verified as wrong.
    blocked_pair = (
        normalised,
        matched_name,
    )

    if (
        blocked_pair
        in BLOCKED_FUZZY_MATCHES
    ):
        return (
            None,
            None,
            None,
        )

    candidates = players_by_name.get(
        matched_name
    )

    return (
        candidates,
        "fuzzy",
        score,
    )


# --------------------------------------------------
# Season / age helpers
# --------------------------------------------------

def season_end_date(season):
    """
    Use June 30 following the season
    as the maximum valuation date.

    2017 -> 2018-06-30
    """

    return pd.Timestamp(
        year=int(season) + 1,
        month=6,
        day=30,
    )


def calculate_age(
    date_of_birth,
    reference_date,
):
    """
    Calculate player age on a specific
    reference date.
    """

    if (
        pd.isna(date_of_birth)
        or pd.isna(reference_date)
    ):
        return np.nan

    age = (
        reference_date.year
        - date_of_birth.year
    )

    birthday_passed = (
        (
            reference_date.month,
            reference_date.day,
        )
        >= (
            date_of_birth.month,
            date_of_birth.day,
        )
    )

    if not birthday_passed:
        age -= 1

    return age



# --------------------------------------------------
# Candidate identity scoring (V2.1)
# --------------------------------------------------

def normalise_club_name(value):
    """Normalise club/team names for comparison."""
    if pd.isna(value):
        return ""

    value = normalise_name(value)

    aliases = {
        "manchester utd": "manchester united",
        "man utd": "manchester united",
        "man city": "manchester city",
        "newcastle utd": "newcastle united",
        "west ham utd": "west ham",
        "wolverhampton wanderers": "wolves",
        "wolverhampton": "wolves",
        "tottenham hotspur": "tottenham",
    }

    return aliases.get(value, value)


def split_understat_teams(team):
    """Understat can contain multiple clubs separated by commas."""
    if pd.isna(team):
        return []

    return [
        normalise_club_name(part)
        for part in str(team).split(",")
        if normalise_club_name(part)
    ]


def position_compatible(understat_position, tm_position):
    """Compare broad Understat and Transfermarkt position groups."""
    us = str(understat_position or "").upper()
    tm = str(tm_position or "").lower()

    if not us or not tm or tm == "missing":
        return None

    if "GK" in us:
        return "goalkeeper" in tm

    allowed = set()

    if "D" in us:
        allowed.add("defender")
    if "M" in us:
        allowed.add("midfield")
    if "F" in us or "S" in us:
        allowed.add("attack")

    if not allowed:
        return None

    return any(group in tm for group in allowed)


def candidate_club_evidence(
    player_id,
    understat_team,
    season_end,
    transfers_by_player,
    current_club_name=None,
):
    """Score evidence that a candidate belongs to the Understat club."""
    target_teams = set(
        split_understat_teams(understat_team)
    )

    if not target_teams:
        return 0, "no_team"

    current_club = normalise_club_name(
        current_club_name
    )

    if current_club in target_teams:
        return 30, "current_club"

    history = transfers_by_player.get(
        player_id
    )

    if history is None or history.empty:
        return 0, "no_transfer_history"

    # Small future window covers summer moves just after season end.
    window_end = (
        season_end
        + pd.Timedelta(days=120)
    )

    relevant = history[
        history["transfer_date"]
        <= window_end
    ]

    if relevant.empty:
        return 0, "no_relevant_transfer"

    best_score = 0
    best_reason = "club_not_seen"

    for _, transfer in relevant.iterrows():
        transfer_date = transfer.get(
            "transfer_date"
        )

        from_club = normalise_club_name(
            transfer.get("from_club_name")
        )

        to_club = normalise_club_name(
            transfer.get("to_club_name")
        )

        clubs = {
            from_club,
            to_club,
        } - {""}

        if target_teams.intersection(clubs):
            days_away = abs(
                (
                    season_end
                    - transfer_date
                ).days
            )

            if days_away <= 550:
                score = 60
                reason = "recent_transfer_club"
            elif days_away <= 1100:
                score = 45
                reason = "transfer_club"
            else:
                score = 25
                reason = "old_transfer_club"

            if score > best_score:
                best_score = score
                best_reason = reason

    return best_score, best_reason


def score_candidate(
    candidate,
    row,
    season_end,
    valuations_by_player,
    transfers_by_player,
):
    """Score one Transfermarkt identity candidate."""
    player_id = candidate["player_id"]

    score = 0
    reasons = []

    club_score, club_reason = (
        candidate_club_evidence(
            player_id,
            row.get("team"),
            season_end,
            transfers_by_player,
            candidate.get(
                "current_club_name"
            ),
        )
    )

    score += club_score

    reasons.append(
        f"club:{club_reason}:{club_score}"
    )

    compatible = position_compatible(
        row.get("position"),
        candidate.get("position"),
    )

    if compatible is True:
        score += 20
        reasons.append("position:+20")

    elif compatible is False:
        score -= 35
        reasons.append("position:-35")

    else:
        reasons.append("position:unknown")

    dob = candidate.get(
        "date_of_birth"
    )

    if pd.notna(dob):
        candidate_age = calculate_age(
            dob,
            season_end,
        )

        if 15 <= candidate_age <= 42:
            score += 15
            reasons.append("age:+15")
        else:
            score -= 60
            reasons.append("age:-60")

    else:
        reasons.append("age:unknown")

    market_value, valuation_date = (
        find_market_value(
            player_id,
            season_end,
            valuations_by_player,
        )
    )

    if pd.notna(market_value):
        score += 15
        reasons.append("valuation:+15")
    else:
        reasons.append("valuation:none")

    return {
        "candidate": candidate,
        "score": score,
        "reasons": ";".join(reasons),
        "market_value": market_value,
        "valuation_date": valuation_date,
    }


def choose_best_candidate(
    candidates,
    row,
    season_end,
    valuations_by_player,
    transfers_by_player,
    base_match_method,
    base_name_score,
):
    """
    Resolve duplicate names conservatively.
    Reject an ambiguous identity instead of guessing.
    """
    if candidates is None or candidates.empty:
        return None

    scored = [
        score_candidate(
            candidate,
            row,
            season_end,
            valuations_by_player,
            transfers_by_player,
        )
        for _, candidate
        in candidates.iterrows()
    ]

    scored.sort(
        key=lambda item: item["score"],
        reverse=True,
    )

    best = scored[0]

    runner_up = (
        scored[1]
        if len(scored) > 1
        else None
    )

    if len(scored) == 1:
        margin = np.nan
        method = (
            f"{base_match_method}_unique"
        )

    else:
        margin = (
            best["score"]
            - runner_up["score"]
        )

        if (
            best["score"] < 20
            or margin < 15
        ):
            return {
                "rejected": True,
                "reason":
                    "ambiguous_identity",
                "best_score":
                    best["score"],
                "confidence_margin":
                    margin,
                "candidate_count":
                    len(scored),
                "best_candidate_id":
                    best["candidate"][
                        "player_id"
                    ],
                "best_candidate_name":
                    best["candidate"].get(
                        "name"
                    ),
                "identity_evidence":
                    best["reasons"],
            }

        method = (
            f"{base_match_method}_scored"
        )

    return {
        "rejected": False,
        "candidate": best["candidate"],
        "market_value":
            best["market_value"],
        "valuation_date":
            best["valuation_date"],
        "identity_score":
            best["score"],
        "identity_margin":
            margin,
        "identity_evidence":
            best["reasons"],
        "candidate_count":
            len(scored),
        "match_method":
            method,
        "name_match_score":
            base_name_score,
    }


# --------------------------------------------------
# Market value
# --------------------------------------------------

def find_market_value(
    player_id,
    season_end,
    valuations_by_player,
):
    """
    Find the most recent market valuation
    on or before the end of the season.
    """

    valuations = (
        valuations_by_player.get(
            player_id
        )
    )

    if valuations is None:
        return (
            np.nan,
            pd.NaT,
        )

    before_end = valuations[
        valuations["date"]
        <= season_end
    ]

    if before_end.empty:
        return (
            np.nan,
            pd.NaT,
        )

    latest = before_end.iloc[-1]

    return (
        latest[
            "market_value_in_eur"
        ],
        latest["date"],
    )


# --------------------------------------------------
# Leakage-safe historical market-value features (V3)
# --------------------------------------------------

def find_historical_market_features(
    player_id,
    target_valuation_date,
    valuations_by_player,
):
    """
    Build leakage-safe market-value features.

    All input valuations are strictly earlier than the target
    valuation date. The 1-year feature uses the latest valuation
    on or before target date minus 365 days.
    """

    empty_result = {
        "previous_market_value_eur": np.nan,
        "previous_valuation_date": pd.NaT,
        "days_since_previous_valuation": np.nan,
        "market_value_1y_ago_eur": np.nan,
        "market_value_1y_ago_date": pd.NaT,
        "previous_to_1y_change_eur": np.nan,
        "previous_to_1y_change_pct": np.nan,
    }

    if pd.isna(target_valuation_date):
        return empty_result

    valuations = valuations_by_player.get(player_id)

    if valuations is None or valuations.empty:
        return empty_result

    historical = valuations[
        valuations["date"] < target_valuation_date
    ]

    if historical.empty:
        return empty_result

    result = empty_result.copy()

    previous = historical.iloc[-1]
    previous_value = previous["market_value_in_eur"]
    previous_date = previous["date"]

    result["previous_market_value_eur"] = previous_value
    result["previous_valuation_date"] = previous_date
    result["days_since_previous_valuation"] = (
        target_valuation_date - previous_date
    ).days

    one_year_cutoff = (
        target_valuation_date - pd.Timedelta(days=365)
    )

    one_year_history = historical[
        historical["date"] <= one_year_cutoff
    ]

    if not one_year_history.empty:
        one_year = one_year_history.iloc[-1]
        one_year_value = one_year["market_value_in_eur"]

        result["market_value_1y_ago_eur"] = one_year_value
        result["market_value_1y_ago_date"] = one_year["date"]

        if pd.notna(previous_value) and pd.notna(one_year_value):
            change = previous_value - one_year_value
            result["previous_to_1y_change_eur"] = change

            if one_year_value != 0:
                result["previous_to_1y_change_pct"] = (
                    change / one_year_value
                ) * 100

    return result


# --------------------------------------------------
# Transfer history
# --------------------------------------------------

def find_latest_transfer(
    player_id,
    season_end,
    transfers_by_player,
):
    """
    Find the player's most recent transfer
    on or before the season end.

    Transfer fee is context only and is
    NOT the prediction target.
    """

    transfers = (
        transfers_by_player.get(
            player_id
        )
    )

    empty_result = {
        "latest_transfer_date":
            pd.NaT,

        "latest_transfer_fee":
            np.nan,

        "latest_from_club":
            None,

        "latest_to_club":
            None,
    }

    if transfers is None:
        return empty_result

    before_end = transfers[
        transfers["transfer_date"]
        <= season_end
    ]

    if before_end.empty:
        return empty_result

    latest = before_end.iloc[-1]

    return {
        "latest_transfer_date":
            latest.get(
                "transfer_date"
            ),

        "latest_transfer_fee":
            latest.get(
                "transfer_fee"
            ),

        "latest_from_club":
            latest.get(
                "from_club_name"
            ),

        "latest_to_club":
            latest.get(
                "to_club_name"
            ),
    }


# --------------------------------------------------
# Main merge
# --------------------------------------------------

def main():
    print(
        "Loading PLStats player seasons..."
    )

    seasons = pd.read_csv(
        PLAYER_SEASONS_FILE
    )

    print(
        f"Player-season rows: "
        f"{len(seasons):,}"
    )

    # ----------------------------------------------
    # Transfermarkt players
    # ----------------------------------------------

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

    # ----------------------------------------------
    # Valuations
    # ----------------------------------------------

    print()
    print(
        "Loading historical valuations..."
    )

    valuations = pd.read_csv(
        VALUATIONS_FILE,
        compression="gzip",
        low_memory=False,
    )

    print(
        f"Valuations: "
        f"{len(valuations):,}"
    )

    # ----------------------------------------------
    # Transfers
    # ----------------------------------------------

    print()
    print(
        "Loading transfers..."
    )

    transfers = pd.read_csv(
        TRANSFERS_FILE,
        compression="gzip",
        low_memory=False,
    )

    print(
        f"Transfers: "
        f"{len(transfers):,}"
    )

    # ----------------------------------------------
    # Prepare players
    # ----------------------------------------------

    players["date_of_birth"] = (
        pd.to_datetime(
            players["date_of_birth"],
            errors="coerce",
        )
    )

    players["match_name"] = (
        players["name"]
        .apply(normalise_name)
    )

    players_by_name = {
        name: group
        for name, group
        in players.groupby(
            "match_name"
        )
    }

    transfermarkt_names = list(
        players_by_name.keys()
    )

    # ----------------------------------------------
    # Prepare valuations
    # ----------------------------------------------

    valuations["date"] = (
        pd.to_datetime(
            valuations["date"],
            errors="coerce",
        )
    )

    valuations = (
        valuations
        .dropna(
            subset=[
                "player_id",
                "date",
                "market_value_in_eur",
            ]
        )
        .sort_values(
            [
                "player_id",
                "date",
            ]
        )
    )

    valuations_by_player = {
        player_id: group
        for player_id, group
        in valuations.groupby(
            "player_id"
        )
    }

    # ----------------------------------------------
    # Prepare transfers
    # ----------------------------------------------

    transfers["transfer_date"] = (
        pd.to_datetime(
            transfers[
                "transfer_date"
            ],
            errors="coerce",
        )
    )

    transfers = (
        transfers
        .dropna(
            subset=[
                "player_id",
                "transfer_date",
            ]
        )
        .sort_values(
            [
                "player_id",
                "transfer_date",
            ]
        )
    )

    transfers_by_player = {
        player_id: group
        for player_id, group
        in transfers.groupby(
            "player_id"
        )
    }

    # ----------------------------------------------
    # Understat -> Transfermarkt
    # ----------------------------------------------

    output_rows = []
    unmatched_rows = []

    print()
    print(
        "Matching Understat players "
        "to Transfermarkt..."
    )

    for index, row in seasons.iterrows():

        # ------------------------------------------
        # Known unresolved exact identities
        # ------------------------------------------

        understat_name = normalise_name(
            row["player"]
        )

        understat_teams = (
            split_understat_teams(
                row["team"]
            )
        )

        blocked_identity = any(
            (
                understat_name,
                team,
            )
            in BLOCKED_EXACT_IDENTITIES
            for team in understat_teams
        )

        if blocked_identity:
            unmatched_rows.append(
                {
                    "player":
                        row["player"],

                    "team":
                        row["team"],

                    "season":
                        row["season"],

                    "reason":
                        "blocked_exact_identity",
                }
            )

            continue

        candidates, match_method, match_score = (
            find_player_candidates(
                row["player"],
                players_by_name,
                transfermarkt_names,
            )
        )

        # No suitable player match.
        if candidates is None:
            unmatched_rows.append(
                {
                    "player":
                        row["player"],

                    "team":
                        row["team"],

                    "season":
                        row["season"],

                    "reason":
                        "name_not_found",
                }
            )

            continue

        candidate = candidates.copy()

        season_end = season_end_date(
            row["season"]
        )

        # If first_season exists,
        # remove candidates whose career
        # timing does not make sense.
        if (
            "first_season"
            in candidate.columns
        ):
            possible = candidate[
                candidate[
                    "first_season"
                ].fillna(0)
                <= row["season"]
            ]

            if not possible.empty:
                candidate = possible

        # V2.1: score candidate identities instead of
        # blindly selecting candidate.iloc[0].
        selection = choose_best_candidate(
            candidate,
            row,
            season_end,
            valuations_by_player,
            transfers_by_player,
            match_method,
            match_score,
        )

        if (
            selection is None
            or selection.get("rejected")
        ):
            unmatched_rows.append(
                {
                    "player":
                        row["player"],

                    "team":
                        row["team"],

                    "season":
                        row["season"],

                    "reason":
                        (
                            selection.get(
                                "reason",
                                "identity_not_resolved",
                            )
                            if selection
                            else "identity_not_resolved"
                        ),

                    "best_identity_score":
                        (
                            selection.get(
                                "best_score"
                            )
                            if selection
                            else np.nan
                        ),

                    "identity_margin":
                        (
                            selection.get(
                                "confidence_margin"
                            )
                            if selection
                            else np.nan
                        ),

                    "candidate_count":
                        (
                            selection.get(
                                "candidate_count"
                            )
                            if selection
                            else 0
                        ),

                    "best_candidate_id":
                        (
                            selection.get(
                                "best_candidate_id"
                            )
                            if selection
                            else np.nan
                        ),

                    "best_candidate_name":
                        (
                            selection.get(
                                "best_candidate_name"
                            )
                            if selection
                            else None
                        ),

                    "identity_evidence":
                        (
                            selection.get(
                                "identity_evidence"
                            )
                            if selection
                            else None
                        ),
                }
            )

            continue

        transfermarkt_player = (
            selection["candidate"]
        )

        player_id = (
            transfermarkt_player[
                "player_id"
            ]
        )

        market_value = (
            selection["market_value"]
        )

        valuation_date = (
            selection["valuation_date"]
        )

        match_method = (
            selection["match_method"]
        )

        match_score = (
            selection["name_match_score"]
        )

        if pd.isna(market_value):
            unmatched_rows.append(
                {
                    "player":
                        row["player"],

                    "team":
                        row["team"],

                    "season":
                        row["season"],

                    "reason":
                        "no_market_value",
                }
            )

            continue

        # ------------------------------------------
        # Age at valuation date
        # ------------------------------------------

        date_of_birth = (
            transfermarkt_player.get(
                "date_of_birth"
            )
        )

        age = calculate_age(
            date_of_birth,
            valuation_date,
        )

        # ------------------------------------------
        # V3 leakage-safe historical market values
        # ------------------------------------------

        historical_market_info = (
            find_historical_market_features(
                player_id,
                valuation_date,
                valuations_by_player,
            )
        )

        # ------------------------------------------
        # Latest historical transfer
        # ------------------------------------------

        transfer_info = (
            find_latest_transfer(
                player_id,
                season_end,
                transfers_by_player,
            )
        )

        # ------------------------------------------
        # Create training row
        # ------------------------------------------

        output = row.to_dict()

        output.update(
            {
                "transfermarkt_player_id":
                    player_id,

                "name_match_method":
                    match_method,

                "name_match_score":
                    match_score,

                "identity_score":
                    selection[
                        "identity_score"
                    ],

                "identity_margin":
                    selection[
                        "identity_margin"
                    ],

                "identity_candidate_count":
                    selection[
                        "candidate_count"
                    ],

                "identity_evidence":
                    selection[
                        "identity_evidence"
                    ],

                "date_of_birth":
                    date_of_birth,

                "age":
                    age,

                "transfermarkt_position":
                    transfermarkt_player.get(
                        "position"
                    ),

                "market_value_eur":
                    market_value,

                "valuation_date":
                    valuation_date,

                **historical_market_info,

                **transfer_info,
            }
        )

        output_rows.append(
            output
        )

        if (
            (index + 1) % 500
            == 0
        ):
            print(
                f"Processed "
                f"{index + 1:,} / "
                f"{len(seasons):,}"
            )

    # ----------------------------------------------
    # Build final DataFrames
    # ----------------------------------------------

    training = pd.DataFrame(
        output_rows
    )

    unmatched = pd.DataFrame(
        unmatched_rows
    )

    PROCESSED_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    training.to_csv(
        OUTPUT_FILE,
        index=False,
    )

    unmatched.to_csv(
        UNMATCHED_FILE,
        index=False,
    )

    # ----------------------------------------------
    # Report
    # ----------------------------------------------

    total = len(seasons)
    matched = len(training)
    failed = total - matched

    match_rate = (
        matched / total * 100
        if total
        else 0
    )

    print()
    print(
        "Market-value merge complete!"
    )

    print()

    print(
        f"Original rows: "
        f"{total:,}"
    )

    print(
        f"Matched rows:  "
        f"{matched:,}"
    )

    print(
        f"Unmatched:     "
        f"{failed:,}"
    )

    print(
        f"Match rate:    "
        f"{match_rate:.1f}%"
    )

    # ----------------------------------------------
    # Match-method report
    # ----------------------------------------------

    if (
        not training.empty
        and "name_match_method"
        in training.columns
    ):
        print()
        print(
            "Name matching:"
        )

        print(
            training[
                "name_match_method"
            ]
            .value_counts()
            .to_string()
        )

    # ----------------------------------------------
    # Market value summary
    # ----------------------------------------------

    if not training.empty:
        print()
        print(
            "Market value summary:"
        )

        print(
            training[
                "market_value_eur"
            ]
            .describe()
            .to_string()
        )

        if "previous_market_value_eur" in training.columns:
            historical_count = training[
                "previous_market_value_eur"
            ].notna().sum()

            print()
            print(
                "Rows with previous market value: "
                f"{historical_count:,} / {len(training):,} "
                f"({historical_count / len(training) * 100:.1f}%)"
            )

        print()
        print(
            "Example matched rows:"
        )

        example_columns = [
            "player",
            "season",
            "age",
            "team",
            "goals",
            "assists",
            "minutes",
            "market_value_eur",
            "valuation_date",
            "previous_market_value_eur",
            "previous_valuation_date",
            "market_value_1y_ago_eur",
            "name_match_method",
            "name_match_score",
            "identity_score",
            "identity_margin",
        ]

        print(
            training[
                example_columns
            ]
            .head(10)
            .to_string(
                index=False
            )
        )

    # ----------------------------------------------
    # Output locations
    # ----------------------------------------------

    print()

    print(
        "Training dataset:",
        OUTPUT_FILE,
    )

    print(
        "Unmatched players:",
        UNMATCHED_FILE,
    )


if __name__ == "__main__":
    main()