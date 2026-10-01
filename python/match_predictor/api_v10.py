from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .predict_fixture_v10 import (
    load_data,
    find_team,
    build_base_features,
    calculate_venue_features,
    calculate_difference_features,
    calculate_matchup_features,
    calculate_v3_features,
    calculate_table_features,
    calculate_v6_features,
    predict,
)


# ============================================================
# APP
# ============================================================

app = FastAPI(
    title="PLStats Match Predictor API",
    version="10.0",
    description="Premier League match predictions using the PLStats V10 model.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://plstatsfootball.com",
        "https://www.plstatsfootball.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# LOAD MODEL + DATA ONCE
# ============================================================

model, features, matches = load_data()


# ============================================================
# REQUEST MODEL
# ============================================================

class MatchPredictionRequest(BaseModel):
    home_team: str
    away_team: str


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():
    return {
        "status": "ok",
        "model": model.get("version", "v10"),
        "message": "PLStats V10 Match Predictor API is running.",
    }


# ============================================================
# CURRENT PREMIER LEAGUE TEAMS
# ============================================================

CURRENT_PREMIER_LEAGUE_TEAMS = [
    "Arsenal",
    "Aston Villa",
    "Bournemouth",
    "Brentford",
    "Brighton",
    "Burnley",
    "Chelsea",
    "Crystal Palace",
    "Everton",
    "Fulham",
    "Leeds",
    "Liverpool",
    "Man City",
    "Man United",
    "Newcastle",
    "Nott'm Forest",
    "Sunderland",
    "Tottenham",
    "West Ham",
    "Wolves",
]


@app.get("/api/teams")
def get_teams():

    available_historical_teams = (
        set(matches["home_team"])
        | set(matches["away_team"])
    )

    teams = [
        team
        for team in CURRENT_PREMIER_LEAGUE_TEAMS
        if team in available_historical_teams
    ]

    return {
        "count": len(teams),
        "teams": teams,
    }

# ============================================================
# MATCH PREDICTION
# ============================================================

@app.post("/api/match-predict")
def predict_match(
    request: MatchPredictionRequest,
):

    try:

        if request.home_team not in CURRENT_PREMIER_LEAGUE_TEAMS:
            raise ValueError(
                f"{request.home_team} is not a current Premier League team."
            )

        if request.away_team not in CURRENT_PREMIER_LEAGUE_TEAMS:
            raise ValueError(
                f"{request.away_team} is not a current Premier League team."
            )

        # ----------------------------------------------------
        # RESOLVE TEAM NAMES
        # ----------------------------------------------------

        home_team = find_team(
            request.home_team,
            matches,
        )

        away_team = find_team(
            request.away_team,
            matches,
        )

        if home_team == away_team:
            raise ValueError(
                "Home and away teams cannot be the same."
            )

        # ----------------------------------------------------
        # BUILD BASE FEATURES
        # ----------------------------------------------------

        fixture = build_base_features(
            home_team,
            away_team,
            features,
            model,
        )

        # ----------------------------------------------------
        # VENUE FEATURES
        # ----------------------------------------------------

        fixture = calculate_venue_features(
            fixture,
            home_team,
            away_team,
            matches,
        )

        # ----------------------------------------------------
        # DIFFERENCE FEATURES
        # ----------------------------------------------------

        fixture = calculate_difference_features(
            fixture
        )

        # ----------------------------------------------------
        # MATCHUP FEATURES
        # ----------------------------------------------------

        fixture = calculate_matchup_features(
            fixture
        )

        # ----------------------------------------------------
        # V3 FEATURES
        # ----------------------------------------------------

        fixture = calculate_v3_features(
            fixture
        )

        # ----------------------------------------------------
        # TABLE FEATURES
        # ----------------------------------------------------

        fixture = calculate_table_features(
            fixture,
            home_team,
            away_team,
            matches,
        )

        # ----------------------------------------------------
        # V6 FEATURES
        # ----------------------------------------------------

        fixture = calculate_v6_features(
            fixture
        )

        # ----------------------------------------------------
        # FEATURE VALIDATION
        # ----------------------------------------------------

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
                "Missing model features: "
                + ", ".join(missing)
            )

        values = fixture[
            required
        ]

        if values.isna().any():

            bad = values[
                values.isna()
            ]

            raise ValueError(
                "NaN values found: "
                + ", ".join(
                    bad.index.tolist()
                )
            )

        # ----------------------------------------------------
        # RUN V10 MODEL
        # ----------------------------------------------------

        result = predict(
            fixture,
            model,
        )

        probabilities = result[
            "probabilities"
        ]

        prediction = result[
            "prediction"
        ]

        # ----------------------------------------------------
        # RESULT LABEL
        # ----------------------------------------------------

        if prediction == "H":
            prediction_label = (
                f"{home_team} WIN"
            )

        elif prediction == "A":
            prediction_label = (
                f"{away_team} WIN"
            )

        else:
            prediction_label = "DRAW"

        # ----------------------------------------------------
        # RESPONSE
        # ----------------------------------------------------

        return {
            "home_team": home_team,
            "away_team": away_team,

            "expected_goals": {
                "home": round(
                    float(
                        result[
                            "expected_home_goals"
                        ]
                    ),
                    2,
                ),
                "away": round(
                    float(
                        result[
                            "expected_away_goals"
                        ]
                    ),
                    2,
                ),
            },

            "probabilities": {
                "home": round(
                    float(
                        probabilities["H"]
                    ),
                    4,
                ),
                "draw": round(
                    float(
                        probabilities["D"]
                    ),
                    4,
                ),
                "away": round(
                    float(
                        probabilities["A"]
                    ),
                    4,
                ),
            },

            "probability_percent": {
                "home": round(
                    float(
                        probabilities["H"]
                    ) * 100,
                    1,
                ),
                "draw": round(
                    float(
                        probabilities["D"]
                    ) * 100,
                    1,
                ),
                "away": round(
                    float(
                        probabilities["A"]
                    ) * 100,
                    1,
                ),
            },

            "prediction": prediction,

            "prediction_label":
                prediction_label,

            "most_likely_score": {
                "home": int(result["score"][0]),
                "away": int(result["score"][1]),
            },

            "model": {
                "version":
                    model.get(
                        "version",
                        "v10_production",
                    ),

                "poisson_weight":
                    model[
                        "poisson_weight"
                    ],

                "random_forest_weight":
                    model[
                        "rf_weight"
                    ],
            },
        }

    except ValueError as error:

        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception as error:

        print(
            "Prediction error:",
            repr(error),
        )

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )