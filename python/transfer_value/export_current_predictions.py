from pathlib import Path
import json

import joblib
import numpy as np
import pandas as pd


# --------------------------------------------------
# Paths
# --------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[2]

TRANSFER_DIR = PROJECT_ROOT / "python" / "transfer_value"

DATA_FILE = (
    TRANSFER_DIR
    / "data"
    / "processed"
    / "training_dataset.csv"
)

MODEL_FILE = (
    TRANSFER_DIR
    / "models"
    / "transfer_value_v5_tuned_random_forest.joblib"
)

OUTPUT_FILE = (
    PROJECT_ROOT
    / "server"
    / "data"
    / "transfer-value-predictions.json"
)


# --------------------------------------------------
# Model features
# Must match train_model_v5.py exactly
# --------------------------------------------------

NUMERICAL_FEATURES = [
    "age",
    "appearances",
    "minutes",
    "goals",
    "assists",
    "shots",
    "key_passes",
    "xg",
    "xa",
    "npg",
    "npxg",
    "xg_chain",
    "xg_buildup",
    "goals_per_90",
    "assists_per_90",
    "xg_per_90",
    "xa_per_90",
    "shots_per_90",
    "key_passes_per_90",
    "previous_market_value_eur",
    "market_value_1y_ago_eur",
    "days_since_previous_valuation",
]

CATEGORICAL_FEATURES = [
    "transfermarkt_position",
]

FEATURES = (
    NUMERICAL_FEATURES
    + CATEGORICAL_FEATURES
)


# --------------------------------------------------
# Helpers
# --------------------------------------------------

def clean_number(value):
    if pd.isna(value):
        return None

    if isinstance(value, (np.integer,)):
        return int(value)

    if isinstance(value, (np.floating,)):
        return float(value)

    return value


def player_to_json(row):
    predicted_value = max(
        float(row["predicted_market_value_eur"]),
        0,
    )

    predicted_change = float(
        row["predicted_market_value_change_eur"]
    )

    previous_value = float(
        row["previous_market_value_eur"]
    )

    if previous_value > 0:
        change_percent = (
            predicted_change
            / previous_value
            * 100
        )
    else:
        change_percent = None

    return {
        "understatId": clean_number(
            row.get("understat_id")
        ),

        "player": row["player"],

        "team": row["team"],

        "season": int(row["season"]),

        "position": clean_number(
            row.get("position")
        ),

        "transfermarktPosition": clean_number(
            row.get("transfermarkt_position")
        ),

        "age": clean_number(
            row.get("age")
        ),

        "predictedMarketValueEur":
            round(predicted_value),

        "previousMarketValueEur":
            round(previous_value),

        "predictedChangeEur":
            round(predicted_change),

        "predictedChangePercent":
            (
                round(change_percent, 2)
                if change_percent is not None
                else None
            ),

        "marketValueOneYearAgoEur":
            clean_number(
                row.get(
                    "market_value_1y_ago_eur"
                )
            ),

        "previousValuationDate":
            clean_number(
                row.get(
                    "previous_valuation_date"
                )
            ),

        "appearances": clean_number(
            row.get("appearances")
        ),

        "minutes": clean_number(
            row.get("minutes")
        ),

        "goals": clean_number(
            row.get("goals")
        ),

        "assists": clean_number(
            row.get("assists")
        ),

        "shots": clean_number(
            row.get("shots")
        ),

        "keyPasses": clean_number(
            row.get("key_passes")
        ),

        "xg": clean_number(
            row.get("xg")
        ),

        "xa": clean_number(
            row.get("xa")
        ),

        "npg": clean_number(
            row.get("npg")
        ),

        "npxg": clean_number(
            row.get("npxg")
        ),

        "xgChain": clean_number(
            row.get("xg_chain")
        ),

        "xgBuildup": clean_number(
            row.get("xg_buildup")
        ),

        "goalsPer90": clean_number(
            row.get("goals_per_90")
        ),

        "assistsPer90": clean_number(
            row.get("assists_per_90")
        ),

        "xgPer90": clean_number(
            row.get("xg_per_90")
        ),

        "xaPer90": clean_number(
            row.get("xa_per_90")
        ),

        "shotsPer90": clean_number(
            row.get("shots_per_90")
        ),

        "keyPassesPer90": clean_number(
            row.get("key_passes_per_90")
        ),
    }


# --------------------------------------------------
# Main
# --------------------------------------------------

def main():
    print(
        "Loading PLStats V5 transfer-value model..."
    )

    if not MODEL_FILE.exists():
        raise FileNotFoundError(
            f"Model not found: {MODEL_FILE}"
        )

    model = joblib.load(MODEL_FILE)

    print(f"Model: {MODEL_FILE}")

    print()
    print("Loading player dataset...")

    if not DATA_FILE.exists():
        raise FileNotFoundError(
            f"Dataset not found: {DATA_FILE}"
        )

    data = pd.read_csv(DATA_FILE)

    print(
        f"Rows loaded: {len(data):,}"
    )

    # --------------------------------------------------
    # Use newest season available
    # --------------------------------------------------

    latest_season = int(
        data["season"].max()
    )

    current = data[
        data["season"] == latest_season
    ].copy()

    print(
        f"Latest season: {latest_season}"
    )

    print(
        f"Rows in latest season: "
        f"{len(current):,}"
    )

    # --------------------------------------------------
    # Only players we can genuinely predict
    # --------------------------------------------------

    current = current[
        current[
            "previous_market_value_eur"
        ].notna()
    ].copy()

    print(
        "Rows with previous market value: "
        f"{len(current):,}"
    )

    # --------------------------------------------------
    # Validate required features
    # --------------------------------------------------

    missing_features = [
        feature
        for feature in FEATURES
        if feature not in current.columns
    ]

    if missing_features:
        raise ValueError(
            "Missing model features: "
            + ", ".join(missing_features)
        )

    # --------------------------------------------------
    # Predict CHANGE in value
    # --------------------------------------------------

    print()
    print(
        "Generating V5 predictions..."
    )

    predicted_change = model.predict(
        current[FEATURES]
    )

    current[
        "predicted_market_value_change_eur"
    ] = predicted_change

    # --------------------------------------------------
    # Convert predicted change to final value
    # --------------------------------------------------

    current[
        "predicted_market_value_eur"
    ] = np.maximum(
        current[
            "previous_market_value_eur"
        ].to_numpy()
        + predicted_change,
        0,
    )

    # --------------------------------------------------
    # Sort highest predicted values first
    # --------------------------------------------------

    current = current.sort_values(
        "predicted_market_value_eur",
        ascending=False,
    )

    # --------------------------------------------------
    # Convert to JSON
    # --------------------------------------------------

    players = [
        player_to_json(row)
        for _, row in current.iterrows()
    ]

    output = {
        "model": (
            "PLStats Transfer Value V5 "
            "Tuned Random Forest"
        ),

        "season": latest_season,

        "playerCount": len(players),

        "validation": {
            "unseen2025MAE": 2180000,
            "unseen2025RMSE": 3650000,
            "unseen2025R2": 0.975,
        },

        "players": players,
    }

    # --------------------------------------------------
    # Save
    # --------------------------------------------------

    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            output,
            file,
            ensure_ascii=False,
            indent=2,
        )

    print()
    print("=" * 70)

    print(
        "TRANSFER VALUE EXPORT COMPLETE"
    )

    print("=" * 70)

    print(
        f"Season: {latest_season}"
    )

    print(
        f"Players exported: "
        f"{len(players):,}"
    )

    print()
    print(
        f"Saved to: {OUTPUT_FILE}"
    )

    print()

    print(
        "Top 10 predicted values:"
    )

    print("-" * 70)

    preview_columns = [
        "player",
        "team",
        "previous_market_value_eur",
        "predicted_market_value_eur",
        "predicted_market_value_change_eur",
    ]

    print(
        current[
            preview_columns
        ]
        .head(10)
        .to_string(index=False)
    )


if __name__ == "__main__":
    main()