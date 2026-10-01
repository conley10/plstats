from pathlib import Path
import sys
from datetime import datetime
import math

import joblib
import numpy as np
import pandas as pd


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

MODEL_PATH = (
    BASE_DIR
    / "models"
    / "match_predictor_v10_production.joblib"
)

FEATURES_PATH = (
    BASE_DIR
    / "data"
    / "processed"
    / "match_features_v6.csv"
)

MATCHES_PATH = (
    BASE_DIR
    / "data"
    / "processed"
    / "historical_matches_enriched.csv"
)


# ============================================================
# HELPERS
# ============================================================

def safe_divide(a, b):
    if b is None or b == 0:
        return 0.0
    return a / b


def normalise_team_name(name):
    return str(name).strip().lower()


def poisson_probability(goals, expected_goals):
    return (
        math.exp(-expected_goals)
        * expected_goals ** goals
        / math.factorial(goals)
    )


def calculate_poisson_probabilities(
    home_expected_goals,
    away_expected_goals,
    max_goals=10,
):
    home_probability = 0.0
    draw_probability = 0.0
    away_probability = 0.0

    score_probabilities = []

    for home_goals in range(max_goals + 1):

        home_goal_probability = poisson_probability(
            home_goals,
            home_expected_goals,
        )

        for away_goals in range(max_goals + 1):

            away_goal_probability = poisson_probability(
                away_goals,
                away_expected_goals,
            )

            probability = (
                home_goal_probability
                * away_goal_probability
            )

            score_probabilities.append(
                (
                    probability,
                    home_goals,
                    away_goals,
                )
            )

            if home_goals > away_goals:
                home_probability += probability

            elif home_goals == away_goals:
                draw_probability += probability

            else:
                away_probability += probability

    total = (
        home_probability
        + draw_probability
        + away_probability
    )

    if total > 0:
        home_probability /= total
        draw_probability /= total
        away_probability /= total

    score_probabilities.sort(
        reverse=True,
        key=lambda x: x[0],
    )

    most_likely_score = score_probabilities[0]

    return {
        "H": home_probability,
        "D": draw_probability,
        "A": away_probability,
        "score": (
            most_likely_score[1],
            most_likely_score[2],
        ),
    }


# ============================================================
# LOAD DATA
# ============================================================

def load_data():

    print("Loading V10 production model...")

    model = joblib.load(MODEL_PATH)

    print(
        f"Model version: "
        f"{model.get('version', 'Unknown')}"
    )

    print("Loading V6 historical features...")

    features = pd.read_csv(FEATURES_PATH)

    features["date"] = pd.to_datetime(
        features["date"]
    )

    print(
        f"Feature rows: {len(features)}"
    )

    print("Loading historical matches...")

    matches = pd.read_csv(MATCHES_PATH)

    matches["date"] = pd.to_datetime(
        matches["date"]
    )

    matches = matches.sort_values(
        "date"
    ).reset_index(drop=True)

    print(
        f"Historical matches: {len(matches)}"
    )

    return model, features, matches


# ============================================================
# TEAM LOOKUP
# ============================================================

def find_team(team_input, matches):

    teams = sorted(
        set(matches["home_team"])
        | set(matches["away_team"])
    )

    lookup = {
        normalise_team_name(team): team
        for team in teams
    }

    requested = normalise_team_name(
        team_input
    )

    if requested in lookup:
        return lookup[requested]

    partial_matches = [
        team
        for team in teams
        if requested
        in normalise_team_name(team)
    ]

    if len(partial_matches) == 1:
        return partial_matches[0]

    raise ValueError(
        f"Could not uniquely identify team "
        f"'{team_input}'.\n"
        f"Available teams include:\n"
        + ", ".join(teams)
    )


# ============================================================
# BUILD CURRENT BASE FEATURES
# ============================================================

def build_base_features(
    home_team,
    away_team,
    features,
    model,
):
    """
    Build a future fixture from the most recent historical
    feature rows for each team.

    Difference-style features are recalculated below.
    """

    all_features = model["all_features"]

    fixture = pd.Series(
        0.0,
        index=all_features,
        dtype=float,
    )

    home_rows = features[
        (
            features["home_team"]
            == home_team
        )
        |
        (
            features["away_team"]
            == home_team
        )
    ].sort_values("date")

    away_rows = features[
        (
            features["home_team"]
            == away_team
        )
        |
        (
            features["away_team"]
            == away_team
        )
    ].sort_values("date")

    if home_rows.empty:
        raise ValueError(
            f"No historical features found "
            f"for {home_team}."
        )

    if away_rows.empty:
        raise ValueError(
            f"No historical features found "
            f"for {away_team}."
        )

    home_latest = home_rows.iloc[-1]
    away_latest = away_rows.iloc[-1]

    # --------------------------------------------------------
    # HOME TEAM
    # --------------------------------------------------------

    if (
        home_latest["home_team"]
        == home_team
    ):
        home_prefix = "home_"
    else:
        home_prefix = "away_"

    # --------------------------------------------------------
    # AWAY TEAM
    # --------------------------------------------------------

    if (
        away_latest["away_team"]
        == away_team
    ):
        away_prefix = "away_"
    else:
        away_prefix = "home_"

    # --------------------------------------------------------
    # COPY TEAM-SPECIFIC FEATURES
    # --------------------------------------------------------

    home_suffixes = [
        "last5_ppg",
        "last5_win_rate",
        "last5_draw_rate",
        "last5_loss_rate",
        "last5_goals_for",
        "last5_goals_against",
        "last5_goal_diff",
        "last5_xg_for",
        "last5_xg_against",
        "last5_xg_diff",
        "last5_shots_for",
        "last5_shots_against",
        "last5_shot_diff",
        "last5_sot_for",
        "last5_sot_against",
        "last5_sot_diff",
        "last5_clean_sheet_rate",
        "last5_failed_to_score_rate",

        "last10_ppg",
        "last10_win_rate",
        "last10_draw_rate",
        "last10_loss_rate",
        "last10_goals_for",
        "last10_goals_against",
        "last10_goal_diff",
        "last10_xg_for",
        "last10_xg_against",
        "last10_xg_diff",
        "last10_shots_for",
        "last10_shots_against",
        "last10_shot_diff",
        "last10_sot_for",
        "last10_sot_against",
        "last10_sot_diff",
        "last10_clean_sheet_rate",
        "last10_failed_to_score_rate",

        "season_ppg",
        "season_win_rate",
        "season_draw_rate",
        "season_loss_rate",
        "season_goals_for",
        "season_goals_against",
        "season_goal_diff",
        "season_xg_for",
        "season_xg_against",
        "season_xg_diff",
        "season_shots_for",
        "season_shots_against",
        "season_shot_diff",
        "season_sot_for",
        "season_sot_against",
        "season_sot_diff",
        "season_clean_sheet_rate",
        "season_failed_to_score_rate",
    ]

    for suffix in home_suffixes:

        target = f"home_{suffix}"
        source = f"{home_prefix}{suffix}"

        if (
            target in fixture.index
            and source in features.columns
        ):
            fixture[target] = float(
                home_latest[source]
            )

    for suffix in home_suffixes:

        target = f"away_{suffix}"
        source = f"{away_prefix}{suffix}"

        if (
            target in fixture.index
            and source in features.columns
        ):
            fixture[target] = float(
                away_latest[source]
            )

    # --------------------------------------------------------
    # ELO
    # --------------------------------------------------------

    home_elo_source = (
        "home_elo"
        if home_latest["home_team"]
        == home_team
        else "away_elo"
    )

    away_elo_source = (
        "away_elo"
        if away_latest["away_team"]
        == away_team
        else "home_elo"
    )

    fixture["home_elo"] = float(
        home_latest[home_elo_source]
    )

    fixture["away_elo"] = float(
        away_latest[away_elo_source]
    )

    fixture["elo_diff"] = (
        fixture["home_elo"]
        - fixture["away_elo"]
    )

    # V2 used +60 home Elo advantage.
    fixture["elo_diff_with_home"] = (
        fixture["elo_diff"]
        + 60.0
    )

    return fixture


# ============================================================
# VENUE FEATURES
# ============================================================

def calculate_venue_features(
    fixture,
    home_team,
    away_team,
    matches,
):

    # Use current-season matches where possible.
    latest_season = matches.iloc[-1]["season"]

    season_matches = matches[
        matches["season"]
        == latest_season
    ].copy()

    home_matches = season_matches[
        season_matches["home_team"]
        == home_team
    ]

    away_matches = season_matches[
        season_matches["away_team"]
        == away_team
    ]

    def venue_stats(
        rows,
        side,
    ):

        if rows.empty:
            return None

        if side == "home":
            gf = rows["home_goals"]
            ga = rows["away_goals"]
            xgf = rows["home_xg"]
            xga = rows["away_xg"]

        else:
            gf = rows["away_goals"]
            ga = rows["home_goals"]
            xgf = rows["away_xg"]
            xga = rows["home_xg"]

        played = len(rows)

        wins = (gf > ga).sum()
        draws = (gf == ga).sum()
        losses = (gf < ga).sum()

        points = (
            wins * 3
            + draws
        )

        return {
            "ppg":
                points / played,

            "win_rate":
                wins / played,

            "draw_rate":
                draws / played,

            "loss_rate":
                losses / played,

            "goals_for":
                gf.mean(),

            "goals_against":
                ga.mean(),

            "goal_diff":
                (gf - ga).mean(),

            "xg_for":
                xgf.mean(),

            "xg_against":
                xga.mean(),

            "xg_diff":
                (xgf - xga).mean(),

            "clean_sheet_rate":
                (ga == 0).mean(),

            "failed_to_score_rate":
                (gf == 0).mean(),
        }

    home_stats = venue_stats(
        home_matches,
        "home",
    )

    away_stats = venue_stats(
        away_matches,
        "away",
    )

    if home_stats:

        for key, value in home_stats.items():

            column = f"home_venue_{key}"

            if column in fixture.index:
                fixture[column] = value

    if away_stats:

        for key, value in away_stats.items():

            column = f"away_venue_{key}"

            if column in fixture.index:
                fixture[column] = value

    return fixture


# ============================================================
# DIFFERENCE FEATURES
# ============================================================

def calculate_difference_features(
    fixture,
):

    mappings = {
        "last5_ppg_diff":
            (
                "home_last5_ppg",
                "away_last5_ppg",
            ),

        "last10_ppg_diff":
            (
                "home_last10_ppg",
                "away_last10_ppg",
            ),

        "season_ppg_diff":
            (
                "home_season_ppg",
                "away_season_ppg",
            ),

        "last5_xg_diff":
            (
                "home_last5_xg_diff",
                "away_last5_xg_diff",
            ),

        "last10_xg_diff":
            (
                "home_last10_xg_diff",
                "away_last10_xg_diff",
            ),

        "season_xg_diff":
            (
                "home_season_xg_diff",
                "away_season_xg_diff",
            ),

        "season_goal_diff":
            (
                "home_season_goal_diff",
                "away_season_goal_diff",
            ),

        "season_shot_diff":
            (
                "home_season_shot_diff",
                "away_season_shot_diff",
            ),

        "venue_ppg_diff":
            (
                "home_venue_ppg",
                "away_venue_ppg",
            ),
    }

    for target, (
        home_column,
        away_column,
    ) in mappings.items():

        if (
            target in fixture.index
            and home_column in fixture.index
            and away_column in fixture.index
        ):
            fixture[target] = (
                fixture[home_column]
                - fixture[away_column]
            )

    return fixture


# ============================================================
# MATCHUP FEATURES
# ============================================================

def calculate_matchup_features(
    fixture,
):

    def average(a, b):
        return (a + b) / 2.0

    mappings = {
        "home_attack_vs_away_defence_xg":
            (
                "home_season_xg_for",
                "away_season_xg_against",
            ),

        "away_attack_vs_home_defence_xg":
            (
                "away_season_xg_for",
                "home_season_xg_against",
            ),

        "home_attack_vs_away_defence_goals":
            (
                "home_season_goals_for",
                "away_season_goals_against",
            ),

        "away_attack_vs_home_defence_goals":
            (
                "away_season_goals_for",
                "home_season_goals_against",
            ),
    }

    for target, (
        attack,
        defence,
    ) in mappings.items():

        if target in fixture.index:
            fixture[target] = average(
                fixture[attack],
                fixture[defence],
            )

    if (
        "draw_rate_average_last10"
        in fixture.index
    ):
        fixture[
            "draw_rate_average_last10"
        ] = average(
            fixture[
                "home_last10_draw_rate"
            ],
            fixture[
                "away_last10_draw_rate"
            ],
        )

    if "strength_closeness" in fixture.index:

        fixture[
            "strength_closeness"
        ] = 1 / (
            1
            + abs(
                fixture["elo_diff"]
            ) / 100.0
        )

    return fixture


# ============================================================
# V3 FEATURES
# ============================================================

def calculate_v3_features(
    fixture,
):

    # Expected-goal matchup estimates.
    home_xg = (
        fixture[
            "home_attack_vs_away_defence_xg"
        ]
    )

    away_xg = (
        fixture[
            "away_attack_vs_home_defence_xg"
        ]
    )

    # Keep estimates within a sensible Poisson range.
    home_xg = float(
        np.clip(
            home_xg,
            0.20,
            4.50,
        )
    )

    away_xg = float(
        np.clip(
            away_xg,
            0.20,
            4.50,
        )
    )

    fixture[
        "v3_home_expected_goals"
    ] = home_xg

    fixture[
        "v3_away_expected_goals"
    ] = away_xg

    fixture[
        "v3_expected_goal_diff"
    ] = home_xg - away_xg

    fixture[
        "v3_expected_goal_total"
    ] = home_xg + away_xg

    poisson = (
        calculate_poisson_probabilities(
            home_xg,
            away_xg,
        )
    )

    fixture[
        "v3_poisson_home_prob"
    ] = poisson["H"]

    fixture[
        "v3_poisson_draw_prob"
    ] = poisson["D"]

    fixture[
        "v3_poisson_away_prob"
    ] = poisson["A"]

    # Approximate strength components from the
    # already-generated historical team statistics.

    fixture[
        "v3_home_attack_strength"
    ] = fixture[
        "home_season_goals_for"
    ]

    fixture[
        "v3_home_defence_weakness"
    ] = fixture[
        "home_season_goals_against"
    ]

    fixture[
        "v3_away_attack_strength"
    ] = fixture[
        "away_season_goals_for"
    ]

    fixture[
        "v3_away_defence_weakness"
    ] = fixture[
        "away_season_goals_against"
    ]

    fixture[
        "v3_home_venue_attack"
    ] = fixture.get(
        "home_venue_goals_for",
        0.0,
    )

    fixture[
        "v3_home_venue_defence"
    ] = fixture.get(
        "home_venue_goals_against",
        0.0,
    )

    fixture[
        "v3_away_venue_attack"
    ] = fixture.get(
        "away_venue_goals_for",
        0.0,
    )

    fixture[
        "v3_away_venue_defence"
    ] = fixture.get(
        "away_venue_goals_against",
        0.0,
    )

    fixture[
        "v3_xg_matchup_home"
    ] = home_xg

    fixture[
        "v3_xg_matchup_away"
    ] = away_xg

    fixture[
        "v3_shot_matchup_home"
    ] = (
        fixture["home_season_shots_for"]
        + fixture[
            "away_season_shots_against"
        ]
    ) / 2.0

    fixture[
        "v3_shot_matchup_away"
    ] = (
        fixture["away_season_shots_for"]
        + fixture[
            "home_season_shots_against"
        ]
    ) / 2.0

    fixture[
        "v3_sot_matchup_home"
    ] = (
        fixture["home_season_sot_for"]
        + fixture[
            "away_season_sot_against"
        ]
    ) / 2.0

    fixture[
        "v3_sot_matchup_away"
    ] = (
        fixture["away_season_sot_for"]
        + fixture[
            "home_season_sot_against"
        ]
    ) / 2.0

    return fixture


# ============================================================
# CURRENT LEAGUE TABLE
# ============================================================

def calculate_table_features(
    fixture,
    home_team,
    away_team,
    matches,
):

    latest_season = (
        matches.iloc[-1]["season"]
    )

    season_matches = matches[
        matches["season"]
        == latest_season
    ].sort_values("date")

    teams = sorted(
        set(season_matches["home_team"])
        | set(season_matches["away_team"])
    )

    table = {
        team: {
            "played": 0,
            "points": 0,
            "gf": 0,
            "ga": 0,
            "xgf": 0.0,
            "xga": 0.0,
        }
        for team in teams
    }

    for _, match in season_matches.iterrows():

        home = match["home_team"]
        away = match["away_team"]

        hg = int(match["home_goals"])
        ag = int(match["away_goals"])

        hxg = float(match["home_xg"])
        axg = float(match["away_xg"])

        table[home]["played"] += 1
        table[away]["played"] += 1

        table[home]["gf"] += hg
        table[home]["ga"] += ag

        table[away]["gf"] += ag
        table[away]["ga"] += hg

        table[home]["xgf"] += hxg
        table[home]["xga"] += axg

        table[away]["xgf"] += axg
        table[away]["xga"] += hxg

        if hg > ag:
            table[home]["points"] += 3

        elif hg < ag:
            table[away]["points"] += 3

        else:
            table[home]["points"] += 1
            table[away]["points"] += 1

    standings = []

    for team, stats in table.items():

        standings.append(
            {
                "team": team,
                "points": stats["points"],
                "goal_diff":
                    stats["gf"]
                    - stats["ga"],
                "goals_for":
                    stats["gf"],
            }
        )

    standings = sorted(
        standings,
        key=lambda x: (
            x["points"],
            x["goal_diff"],
            x["goals_for"],
        ),
        reverse=True,
    )

    positions = {
        row["team"]: index + 1
        for index, row
        in enumerate(standings)
    }

    home_stats = table[home_team]
    away_stats = table[away_team]

    fixture[
        "v6_home_league_position"
    ] = positions[home_team]

    fixture[
        "v6_away_league_position"
    ] = positions[away_team]

    fixture[
        "v6_league_position_diff"
    ] = (
        positions[away_team]
        - positions[home_team]
    )

    fixture[
        "v6_home_points"
    ] = home_stats["points"]

    fixture[
        "v6_away_points"
    ] = away_stats["points"]

    fixture[
        "v6_points_diff"
    ] = (
        home_stats["points"]
        - away_stats["points"]
    )

    home_played = home_stats["played"]
    away_played = away_stats["played"]

    fixture[
        "v6_home_table_ppg"
    ] = safe_divide(
        home_stats["points"],
        home_played,
    )

    fixture[
        "v6_away_table_ppg"
    ] = safe_divide(
        away_stats["points"],
        away_played,
    )

    fixture[
        "v6_table_ppg_diff"
    ] = (
        fixture["v6_home_table_ppg"]
        - fixture["v6_away_table_ppg"]
    )

    home_goal_diff = (
        home_stats["gf"]
        - home_stats["ga"]
    )

    away_goal_diff = (
        away_stats["gf"]
        - away_stats["ga"]
    )

    fixture[
        "v6_home_table_goal_diff"
    ] = home_goal_diff

    fixture[
        "v6_away_table_goal_diff"
    ] = away_goal_diff

    fixture[
        "v6_table_goal_diff_difference"
    ] = (
        home_goal_diff
        - away_goal_diff
    )

    home_xg_diff = safe_divide(
        home_stats["xgf"]
        - home_stats["xga"],
        home_played,
    )

    away_xg_diff = safe_divide(
        away_stats["xgf"]
        - away_stats["xga"],
        away_played,
    )

    fixture[
        "v6_home_table_xg_diff_pg"
    ] = home_xg_diff

    fixture[
        "v6_away_table_xg_diff_pg"
    ] = away_xg_diff

    fixture[
        "v6_table_xg_diff_pg"
    ] = (
        home_xg_diff
        - away_xg_diff
    )

    # --------------------------------------------------------
    # REST DAYS
    # --------------------------------------------------------

    latest_date = matches["date"].max()

    home_history = matches[
        (
            matches["home_team"]
            == home_team
        )
        |
        (
            matches["away_team"]
            == home_team
        )
    ]

    away_history = matches[
        (
            matches["home_team"]
            == away_team
        )
        |
        (
            matches["away_team"]
            == away_team
        )
    ]

    home_last_date = (
        home_history["date"].max()
    )

    away_last_date = (
        away_history["date"].max()
    )

    # We don't yet know the actual future fixture
    # date, so use neutral 7-day rest.
    home_rest = 7
    away_rest = 7

    fixture[
        "v6_home_rest_days"
    ] = home_rest

    fixture[
        "v6_away_rest_days"
    ] = away_rest

    fixture[
        "v6_rest_days_diff"
    ] = (
        home_rest
        - away_rest
    )

    return fixture


# ============================================================
# V6 ENGINEERED FEATURES
# ============================================================

def calculate_v6_features(
    fixture,
):

    fixture[
        "v6_elo_x_form"
    ] = (
        fixture["elo_diff"]
        * fixture["last5_ppg_diff"]
    )

    fixture[
        "v6_elo_x_season"
    ] = (
        fixture["elo_diff"]
        * fixture["season_ppg_diff"]
    )

    fixture[
        "v6_form_x_xg"
    ] = (
        fixture["last5_ppg_diff"]
        * fixture["last5_xg_diff"]
    )

    fixture[
        "v6_long_form_x_xg"
    ] = (
        fixture["last10_ppg_diff"]
        * fixture["last10_xg_diff"]
    )

    fixture[
        "v6_strength_composite"
    ] = (
        0.35
        * (
            fixture["elo_diff"]
            / 100.0
        )
        + 0.25
        * fixture["season_ppg_diff"]
        + 0.20
        * fixture["last10_ppg_diff"]
        + 0.20
        * fixture["season_xg_diff"]
    )

    fixture[
        "v6_expected_goal_closeness"
    ] = (
        1
        / (
            1
            + abs(
                fixture[
                    "v3_expected_goal_diff"
                ]
            )
        )
    )

    fixture[
        "v6_elo_closeness"
    ] = (
        1
        / (
            1
            + abs(
                fixture["elo_diff"]
            ) / 100.0
        )
    )

    fixture[
        "v6_form_closeness"
    ] = (
        1
        / (
            1
            + abs(
                fixture[
                    "last10_ppg_diff"
                ]
            )
        )
    )

    fixture[
        "v6_draw_context"
    ] = (
        fixture[
            "draw_rate_average_last10"
        ]
        * fixture[
            "v6_expected_goal_closeness"
        ]
        * fixture[
            "v6_elo_closeness"
        ]
    )

    return fixture


# ============================================================
# MODEL PREDICTION
# ============================================================

def predict(
    fixture,
    model,
):

    all_features = model[
        "all_features"
    ]

    rf_features = model[
        "rf_features"
    ]

    # Ensure correct ordering.
    X_all = pd.DataFrame(
        [
            fixture[
                all_features
            ].to_dict()
        ]
    )

    X_rf = X_all[
        rf_features
    ]

    # --------------------------------------------------------
    # POISSON GOAL MODELS
    # --------------------------------------------------------

    home_goal_model = model[
        "home_goal_model"
    ]

    away_goal_model = model[
        "away_goal_model"
    ]

    expected_home_goals = float(
        home_goal_model.predict(
            X_all
        )[0]
    )

    expected_away_goals = float(
        away_goal_model.predict(
            X_all
        )[0]
    )

    clip_min = model.get(
        "expected_goal_clip_min",
        0.05,
    )

    clip_max = model.get(
        "expected_goal_clip_max",
        5.0,
    )

    expected_home_goals = float(
        np.clip(
            expected_home_goals,
            clip_min,
            clip_max,
        )
    )

    expected_away_goals = float(
        np.clip(
            expected_away_goals,
            clip_min,
            clip_max,
        )
    )

    poisson = (
        calculate_poisson_probabilities(
            expected_home_goals,
            expected_away_goals,
            max_goals=model.get(
                "poisson_max_goals",
                10,
            ),
        )
    )

    # --------------------------------------------------------
    # RANDOM FOREST
    # --------------------------------------------------------

    random_forest = model[
        "random_forest"
    ]

    rf_raw = (
        random_forest.predict_proba(
            X_rf
        )[0]
    )

    rf_probabilities = dict(
        zip(
            random_forest.classes_,
            rf_raw,
        )
    )

    # --------------------------------------------------------
    # V10 ENSEMBLE
    # --------------------------------------------------------

    poisson_weight = model[
        "poisson_weight"
    ]

    rf_weight = model[
        "rf_weight"
    ]

    probabilities = {}

    for result in [
        "H",
        "D",
        "A",
    ]:

        probabilities[result] = (
            poisson_weight
            * poisson[result]
            + rf_weight
            * rf_probabilities.get(
                result,
                0.0,
            )
        )

    total = sum(
        probabilities.values()
    )

    probabilities = {
        key: value / total
        for key, value
        in probabilities.items()
    }

    prediction = max(
        probabilities,
        key=probabilities.get,
    )

    return {
        "expected_home_goals":
            expected_home_goals,

        "expected_away_goals":
            expected_away_goals,

        "probabilities":
            probabilities,

        "prediction":
            prediction,

        "score":
            poisson["score"],

        "poisson":
            poisson,

        "rf":
            rf_probabilities,
    }


# ============================================================
# MAIN
# ============================================================

def main():

    if len(sys.argv) < 3:

        print()
        print(
            "Usage:"
        )

        print(
            "python "
            "python/match_predictor/"
            "predict_fixture_v10.py "
            "\"Home Team\" "
            "\"Away Team\""
        )

        print()

        sys.exit(1)

    home_input = sys.argv[1]
    away_input = sys.argv[2]

    model, features, matches = (
        load_data()
    )

    home_team = find_team(
        home_input,
        matches,
    )

    away_team = find_team(
        away_input,
        matches,
    )

    if home_team == away_team:
        raise ValueError(
            "Home and away teams "
            "cannot be the same."
        )

    print()
    print(
        f"Building fixture: "
        f"{home_team} vs {away_team}"
    )

    fixture = build_base_features(
        home_team,
        away_team,
        features,
        model,
    )

    fixture = calculate_venue_features(
        fixture,
        home_team,
        away_team,
        matches,
    )

    fixture = calculate_difference_features(
        fixture
    )

    fixture = calculate_matchup_features(
        fixture
    )

    fixture = calculate_v3_features(
        fixture
    )

    fixture = calculate_table_features(
        fixture,
        home_team,
        away_team,
        matches,
    )

    fixture = calculate_v6_features(
        fixture
    )

    # --------------------------------------------------------
    # FINAL FEATURE CHECK
    # --------------------------------------------------------

    required = model[
        "all_features"
    ]

    missing = [
        feature
        for feature in required
        if feature not in fixture.index
    ]

    if missing:

        raise ValueError(
            "Missing model features:\n"
            + "\n".join(missing)
        )

    values = fixture[
        required
    ]

    if values.isna().any():

        bad = values[
            values.isna()
        ]

        raise ValueError(
            "NaN values found:\n"
            + bad.to_string()
        )

    # --------------------------------------------------------
    # PREDICT
    # --------------------------------------------------------

    result = predict(
        fixture,
        model,
    )

    probabilities = result[
        "probabilities"
    ]

    prediction_labels = {
        "H": f"{home_team} WIN",
        "D": "DRAW",
        "A": f"{away_team} WIN",
    }

    home_score, away_score = (
        result["score"]
    )

    print()
    print(
        "=" * 56
    )

    print(
        "PLSTATS V10 MATCH PREDICTOR"
    )

    print(
        "=" * 56
    )

    print()
    print(
        f"{home_team} vs {away_team}"
    )

    print()
    print(
        "EXPECTED GOALS"
    )

    print(
        f"{home_team}: "
        f"{result['expected_home_goals']:.2f}"
    )

    print(
        f"{away_team}: "
        f"{result['expected_away_goals']:.2f}"
    )

    print()
    print(
        "V10 WIN PROBABILITIES"
    )

    print(
        f"{home_team}: "
        f"{probabilities['H'] * 100:.1f}%"
    )

    print(
        f"Draw: "
        f"{probabilities['D'] * 100:.1f}%"
    )

    print(
        f"{away_team}: "
        f"{probabilities['A'] * 100:.1f}%"
    )

    print()
    print(
        "PREDICTED RESULT"
    )

    print(
        prediction_labels[
            result["prediction"]
        ]
    )

    print()
    print(
        "MOST LIKELY SCORE"
    )

    print(
        f"{home_team} "
        f"{home_score}-{away_score} "
        f"{away_team}"
    )

    print()
    print(
        "MODEL COMPONENTS"
    )

    print(
        f"Poisson weight: "
        f"{model['poisson_weight']:.0%}"
    )

    print(
        f"Random Forest weight: "
        f"{model['rf_weight']:.0%}"
    )

    print()
    print(
        "=" * 56
    )


if __name__ == "__main__":
    main()