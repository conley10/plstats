from pathlib import Path

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


PROJECT_ROOT = Path(__file__).resolve().parents[2]
TRANSFER_DIR = PROJECT_ROOT / "python" / "transfer_value"
DATA_FILE = TRANSFER_DIR / "data" / "processed" / "training_dataset.csv"
MODEL_FILE = TRANSFER_DIR / "models" / "transfer_value_v5_tuned_random_forest.joblib"
OUTPUT_DIR = TRANSFER_DIR / "data" / "processed" / "model_comparison_v5"

PREDICTIONS_FILE = OUTPUT_DIR / "v5_2025_predictions.csv"
GRAPH_FILE = OUTPUT_DIR / "v5_2025_actual_vs_predicted.png"

TEST_SEASON = 2025

NUMERICAL_FEATURES = [
    "age", "appearances", "minutes", "goals", "assists", "shots",
    "key_passes", "xg", "xa", "npg", "npxg", "xg_chain", "xg_buildup",
    "goals_per_90", "assists_per_90", "xg_per_90", "xa_per_90",
    "shots_per_90", "key_passes_per_90", "previous_market_value_eur",
    "market_value_1y_ago_eur", "days_since_previous_valuation",
]
CATEGORICAL_FEATURES = ["transfermarkt_position"]
FEATURES = NUMERICAL_FEATURES + CATEGORICAL_FEATURES
TARGET = "market_value_change_from_previous_eur"


def fmt(value):
    sign = "-" if value < 0 else ""
    value = abs(value)
    if value >= 1_000_000:
        return f"{sign}€{value / 1_000_000:.2f}m"
    if value >= 1_000:
        return f"{sign}€{value / 1_000:.0f}k"
    return f"{sign}€{value:.0f}"


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print("Loading saved V5 Tuned Random Forest...")
    if not MODEL_FILE.exists():
        raise FileNotFoundError(
            f"Saved model not found:\n{MODEL_FILE}\n\n"
            "Run train_model_v5.py successfully first."
        )
    model = joblib.load(MODEL_FILE)
    print(f"Model: {MODEL_FILE}")

    print("\nLoading dataset...")
    data = pd.read_csv(DATA_FILE)
    print(f"Rows loaded: {len(data):,}")

    required = FEATURES + [
        "market_value_eur", "previous_market_value_eur",
        "season", "player", "team"
    ]
    missing = [c for c in required if c not in data.columns]
    if missing:
        raise ValueError("Missing required columns: " + ", ".join(missing))

    test = data[
        (data["season"] == TEST_SEASON)
        & data["previous_market_value_eur"].notna()
        & data["market_value_eur"].notna()
    ].copy()

    if test.empty:
        raise ValueError(
            "No evaluable 2025 rows were found in training_dataset.csv."
        )

    test[TARGET] = (
        test["market_value_eur"] - test["previous_market_value_eur"]
    )

    print(f"2025 evaluable rows: {len(test):,}")

    predicted_change = model.predict(test[FEATURES])
    predicted_value = np.maximum(
        test["previous_market_value_eur"].to_numpy() + predicted_change, 0
    )

    actual_value = test["market_value_eur"].to_numpy()
    actual_change = test[TARGET].to_numpy()

    mae = mean_absolute_error(actual_value, predicted_value)
    rmse = np.sqrt(mean_squared_error(actual_value, predicted_value))
    r2 = r2_score(actual_value, predicted_value)

    change_mae = mean_absolute_error(actual_change, predicted_change)
    change_rmse = np.sqrt(mean_squared_error(actual_change, predicted_change))
    change_r2 = r2_score(actual_change, predicted_change)

    print("\n" + "=" * 72)
    print("PLSTATS V5 — UNSEEN 2025 EVALUATION")
    print("=" * 72)
    print(f"Final value MAE:  {fmt(mae)}")
    print(f"Final value RMSE: {fmt(rmse)}")
    print(f"Final value R²:   {r2:.3f}")
    print(f"Change MAE:       {fmt(change_mae)}")
    print(f"Change RMSE:      {fmt(change_rmse)}")
    print(f"Change R²:        {change_r2:.3f}")

    results = test[
        ["player", "team", "season", "previous_market_value_eur",
         "market_value_eur", TARGET]
    ].copy()
    results["predicted_market_value_change_eur"] = predicted_change
    results["predicted_market_value_eur"] = predicted_value
    results["error_eur"] = predicted_value - actual_value
    results["absolute_error_eur"] = np.abs(results["error_eur"])

    print("\nBEST PREDICTIONS")
    print("-" * 86)
    best = results.nsmallest(15, "absolute_error_eur").copy()
    best_display = pd.DataFrame({
        "player": best["player"],
        "team": best["team"],
        "Actual": best["market_value_eur"].map(fmt),
        "Predicted": best["predicted_market_value_eur"].map(fmt),
        "Absolute Error": best["absolute_error_eur"].map(fmt),
    })
    print(best_display.to_string(index=False))

    print("\nBIGGEST MISSES")
    print("-" * 86)
    worst = results.nlargest(15, "absolute_error_eur").copy()
    worst_display = pd.DataFrame({
        "player": worst["player"],
        "team": worst["team"],
        "Actual": worst["market_value_eur"].map(fmt),
        "Predicted": worst["predicted_market_value_eur"].map(fmt),
        "Absolute Error": worst["absolute_error_eur"].map(fmt),
    })
    print(worst_display.to_string(index=False))

    results.to_csv(PREDICTIONS_FILE, index=False)

    actual_m = actual_value / 1_000_000
    predicted_m = predicted_value / 1_000_000
    maximum = max(actual_m.max(), predicted_m.max())

    plt.figure(figsize=(9, 7))
    plt.scatter(actual_m, predicted_m, alpha=0.6)
    plt.plot([0, maximum], [0, maximum], linestyle="--")
    plt.xlabel("Actual Market Value (€m)")
    plt.ylabel("Predicted Market Value (€m)")
    plt.title("PLStats V5 Tuned Random Forest — 2025 Evaluation")
    plt.grid(alpha=0.2)
    plt.tight_layout()
    plt.savefig(GRAPH_FILE, dpi=200, bbox_inches="tight")
    plt.close()

    print("\n" + "=" * 72)
    print("FILES SAVED")
    print("=" * 72)
    print(f"Predictions: {PREDICTIONS_FILE}")
    print(f"Graph:       {GRAPH_FILE}")


if __name__ == "__main__":
    main()
