from pathlib import Path

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from sklearn.base import clone
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import ParameterGrid
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


# --------------------------------------------------
# Paths
# --------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[2]
TRANSFER_DIR = PROJECT_ROOT / "python" / "transfer_value"
DATA_FILE = TRANSFER_DIR / "data" / "processed" / "training_dataset.csv"
MODEL_DIR = TRANSFER_DIR / "models"
OUTPUT_DIR = TRANSFER_DIR / "data" / "processed" / "model_comparison_v5"

SUMMARY_FILE = OUTPUT_DIR / "v5_model_comparison.csv"
PREDICTIONS_FILE = OUTPUT_DIR / "v5_test_predictions.csv"
TUNING_FILE = OUTPUT_DIR / "v5_tuning_results.csv"
IMPORTANCE_FILE = OUTPUT_DIR / "v5_feature_importance.csv"
IMPORTANCE_GRAPH = OUTPUT_DIR / "v5_feature_importance.png"
ACTUAL_GRAPH = OUTPUT_DIR / "v5_actual_vs_predicted.png"


# --------------------------------------------------
# Same V4 feature set
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

CATEGORICAL_FEATURES = ["transfermarkt_position"]
FEATURES = NUMERICAL_FEATURES + CATEGORICAL_FEATURES
TARGET = "market_value_change_from_previous_eur"

TRAIN_SEASONS = [2017, 2018, 2019, 2020, 2021, 2022, 2023]
TEST_SEASON = 2024

# Expanding-window validation. Each season is predicted only using earlier seasons.
VALIDATION_SEASONS = [2021, 2022, 2023]


def format_euros(value):
    if pd.isna(value):
        return "N/A"
    if abs(value) >= 1_000_000:
        return f"€{value / 1_000_000:,.2f}m"
    if abs(value) >= 1_000:
        return f"€{value / 1_000:,.0f}k"
    return f"€{value:,.0f}"


def load_dataset():
    print("Loading training dataset...")
    data = pd.read_csv(DATA_FILE)
    print(f"Rows loaded: {len(data):,}")

    data = data[data["previous_market_value_eur"].notna()].copy()
    data[TARGET] = (
        data["market_value_eur"] - data["previous_market_value_eur"]
    )

    required = FEATURES + [
        TARGET,
        "market_value_eur",
        "season",
        "player",
        "team",
    ]
    missing = [c for c in required if c not in data.columns]
    if missing:
        raise ValueError("Missing required columns: " + ", ".join(missing))

    data = data.dropna(subset=[TARGET]).copy()
    print(f"Rows with previous market value: {len(data):,}")
    return data


def build_model(regressor, scale_numerical=False):
    numerical_steps = [
        ("imputer", SimpleImputer(strategy="median"))
    ]
    if scale_numerical:
        numerical_steps.append(("scaler", StandardScaler()))

    numerical_pipeline = Pipeline(steps=numerical_steps)

    categorical_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("encoder", OneHotEncoder(handle_unknown="ignore")),
        ]
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("numerical", numerical_pipeline, NUMERICAL_FEATURES),
            ("categorical", categorical_pipeline, CATEGORICAL_FEATURES),
        ]
    )

    return Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("regressor", regressor),
        ]
    )


def evaluate_predictions(data, predicted_change):
    actual_change = data[TARGET].to_numpy()
    actual_value = data["market_value_eur"].to_numpy()
    previous_value = data["previous_market_value_eur"].to_numpy()

    predicted_value = np.maximum(previous_value + predicted_change, 0)

    return {
        "final_mae": mean_absolute_error(actual_value, predicted_value),
        "final_rmse": np.sqrt(mean_squared_error(actual_value, predicted_value)),
        "final_r2": r2_score(actual_value, predicted_value),
        "change_mae": mean_absolute_error(actual_change, predicted_change),
        "change_rmse": np.sqrt(mean_squared_error(actual_change, predicted_change)),
        "change_r2": r2_score(actual_change, predicted_change),
        "predicted_value": predicted_value,
    }


def expanding_validation(model_factory, params, data):
    fold_rows = []

    for validation_season in VALIDATION_SEASONS:
        train = data[
            (data["season"].isin(TRAIN_SEASONS))
            & (data["season"] < validation_season)
        ].copy()

        valid = data[data["season"] == validation_season].copy()

        if train.empty or valid.empty:
            continue

        model = model_factory(params)
        model.fit(train[FEATURES], train[TARGET])
        predicted_change = model.predict(valid[FEATURES])
        metrics = evaluate_predictions(valid, predicted_change)

        fold_rows.append(
            {
                "validation_season": validation_season,
                "rows": len(valid),
                **{k: v for k, v in metrics.items() if k != "predicted_value"},
            }
        )

    if not fold_rows:
        raise ValueError("No validation folds could be created.")

    folds = pd.DataFrame(fold_rows)

    # Primary tuning objective: final market-value MAE.
    return {
        "cv_final_mae": folds["final_mae"].mean(),
        "cv_final_rmse": folds["final_rmse"].mean(),
        "cv_final_r2": folds["final_r2"].mean(),
        "cv_change_mae": folds["change_mae"].mean(),
        "cv_change_rmse": folds["change_rmse"].mean(),
        "cv_change_r2": folds["change_r2"].mean(),
    }


def rf_factory(params):
    return build_model(
        RandomForestRegressor(
            random_state=42,
            n_jobs=-1,
            **params,
        )
    )


def gb_factory(params):
    return build_model(
        GradientBoostingRegressor(
            random_state=42,
            loss="squared_error",
            **params,
        )
    )


def tune_model(name, factory, grid, data):
    combinations = list(ParameterGrid(grid))
    print()
    print("=" * 72)
    print(f"TUNING {name.upper()}")
    print("=" * 72)
    print(f"Parameter combinations: {len(combinations)}")
    print(f"Validation seasons: {', '.join(map(str, VALIDATION_SEASONS))}")

    rows = []

    for i, params in enumerate(combinations, start=1):
        metrics = expanding_validation(factory, params, data)
        row = {"model": name, **params, **metrics}
        rows.append(row)

        print(
            f"[{i:>2}/{len(combinations)}] "
            f"CV MAE {format_euros(metrics['cv_final_mae'])} | "
            f"Change R² {metrics['cv_change_r2']:.3f} | "
            f"{params}"
        )

    results = pd.DataFrame(rows).sort_values(
        ["cv_final_mae", "cv_final_rmse"],
        ascending=[True, True],
    ).reset_index(drop=True)

    best = results.iloc[0]
    param_names = list(grid.keys())
    best_params = {p: best[p] for p in param_names}

    # Restore sklearn parameter types after pandas/NumPy conversion.
    # This also handles grids such as max_depth=[None, 10, 18].
    for p in param_names:
        original_values = grid[p]
        non_none_values = [x for x in original_values if x is not None]

        if all(
            isinstance(x, int) and not isinstance(x, bool)
            for x in non_none_values
        ):
            if pd.isna(best_params[p]):
                best_params[p] = None
            else:
                best_params[p] = int(best_params[p])

        elif all(
            isinstance(x, (int, float)) and not isinstance(x, bool)
            for x in non_none_values
        ):
            best_params[p] = float(best_params[p])

    print()
    print(f"Best {name} parameters:")
    print(best_params)
    print(f"Best CV final MAE: {format_euros(best['cv_final_mae'])}")
    print(f"Best CV change R²: {best['cv_change_r2']:.3f}")

    return best_params, results


def test_model(name, model, train_data, test_data):
    print()
    print("=" * 72)
    print(f"FINAL 2024 TEST — {name.upper()}")
    print("=" * 72)

    model.fit(train_data[FEATURES], train_data[TARGET])
    predicted_change = model.predict(test_data[FEATURES])
    metrics = evaluate_predictions(test_data, predicted_change)

    print(f"Final value MAE:  {format_euros(metrics['final_mae'])}")
    print(f"Final value RMSE: {format_euros(metrics['final_rmse'])}")
    print(f"Final value R²:   {metrics['final_r2']:.3f}")
    print(f"Change MAE:       {format_euros(metrics['change_mae'])}")
    print(f"Change RMSE:      {format_euros(metrics['change_rmse'])}")
    print(f"Change R²:        {metrics['change_r2']:.3f}")

    frame = test_data[
        [
            "player",
            "team",
            "season",
            "previous_market_value_eur",
            "market_value_eur",
            TARGET,
        ]
    ].copy()

    frame["model"] = name
    frame["predicted_market_value_change_eur"] = predicted_change
    frame["predicted_market_value_eur"] = metrics["predicted_value"]
    frame["absolute_error_eur"] = np.abs(
        metrics["predicted_value"] - frame["market_value_eur"].to_numpy()
    )

    summary = {
        "model": name,
        "final_value_mae_eur": metrics["final_mae"],
        "final_value_rmse_eur": metrics["final_rmse"],
        "final_value_r2": metrics["final_r2"],
        "change_mae_eur": metrics["change_mae"],
        "change_rmse_eur": metrics["change_rmse"],
        "change_r2": metrics["change_r2"],
    }

    return summary, frame


def feature_importance(model):
    preprocessor = model.named_steps["preprocessor"]
    regressor = model.named_steps["regressor"]

    if not hasattr(regressor, "feature_importances_"):
        raise ValueError("Selected model does not expose feature_importances_.")

    feature_names = preprocessor.get_feature_names_out()
    cleaned = []
    for name in feature_names:
        name = name.replace("numerical__", "")
        name = name.replace("categorical__", "")
        cleaned.append(name)

    importance = pd.DataFrame(
        {
            "feature": cleaned,
            "importance": regressor.feature_importances_,
        }
    ).sort_values("importance", ascending=False)

    importance["importance_percent"] = importance["importance"] * 100
    return importance


def save_importance_graph(importance):
    top = importance.head(20).sort_values("importance", ascending=True)

    plt.figure(figsize=(10, 8))
    plt.barh(top["feature"], top["importance_percent"])
    plt.xlabel("Feature importance (%)")
    plt.ylabel("Feature")
    plt.title("PLStats Transfer Value V5 — Top Feature Importances")
    plt.tight_layout()
    plt.savefig(IMPORTANCE_GRAPH, dpi=200, bbox_inches="tight")
    plt.close()


def save_actual_graph(best_name, best_predictions):
    actual = best_predictions["market_value_eur"].to_numpy() / 1_000_000
    predicted = (
        best_predictions["predicted_market_value_eur"].to_numpy() / 1_000_000
    )

    maximum = max(actual.max(), predicted.max())

    plt.figure(figsize=(9, 7))
    plt.scatter(actual, predicted, alpha=0.6)
    plt.plot([0, maximum], [0, maximum], linestyle="--")
    plt.xlabel("Actual Market Value (€m)")
    plt.ylabel("Predicted Market Value (€m)")
    plt.title(f"PLStats Transfer Value V5 — {best_name}\nActual vs Predicted")
    plt.grid(alpha=0.2)
    plt.tight_layout()
    plt.savefig(ACTUAL_GRAPH, dpi=200, bbox_inches="tight")
    plt.close()


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    data = load_dataset()

    train_data = data[data["season"].isin(TRAIN_SEASONS)].copy()
    test_data = data[data["season"] == TEST_SEASON].copy()

    print()
    print("Final time-based split:")
    print("Training seasons:", ", ".join(map(str, TRAIN_SEASONS)))
    print(f"Training rows: {len(train_data):,}")
    print(f"Untouched test season: {TEST_SEASON}")
    print(f"Test rows: {len(test_data):,}")
    print(f"Numerical features: {len(NUMERICAL_FEATURES)}")
    print(f"Categorical features: {len(CATEGORICAL_FEATURES)}")

    # Deliberately moderate grids: enough to tune meaningfully without making
    # this an enormous desktop run.
    rf_grid = {
        "n_estimators": [300, 600],
        "max_depth": [None, 10, 18],
        "min_samples_leaf": [1, 2, 4],
        "max_features": [0.7, 1.0],
    }

    gb_grid = {
        "n_estimators": [150, 300],
        "learning_rate": [0.03, 0.06],
        "max_depth": [2, 3],
        "min_samples_leaf": [2, 5],
        "subsample": [0.8, 1.0],
    }

    best_rf_params, rf_tuning = tune_model(
        "Random Forest", rf_factory, rf_grid, data
    )
    best_gb_params, gb_tuning = tune_model(
        "Gradient Boosting", gb_factory, gb_grid, data
    )

    tuning = pd.concat([rf_tuning, gb_tuning], ignore_index=True)
    tuning.to_csv(TUNING_FILE, index=False)

    final_models = {
        "Linear Regression": build_model(
            LinearRegression(),
            scale_numerical=True,
        ),
        "Tuned Random Forest": rf_factory(best_rf_params),
        "Tuned Gradient Boosting": gb_factory(best_gb_params),
    }

    summaries = []
    predictions = []
    fitted_models = {}

    for name, model in final_models.items():
        summary, frame = test_model(name, model, train_data, test_data)
        summaries.append(summary)
        predictions.append(frame)
        fitted_models[name] = model

        safe_name = name.lower().replace(" ", "_")
        joblib.dump(
            model,
            MODEL_DIR / f"transfer_value_v5_{safe_name}.joblib",
        )

    summary_df = pd.DataFrame(summaries).sort_values(
        ["final_value_mae_eur", "final_value_rmse_eur"],
        ascending=[True, True],
    ).reset_index(drop=True)

    prediction_df = pd.concat(predictions, ignore_index=True)

    summary_df.to_csv(SUMMARY_FILE, index=False)
    prediction_df.to_csv(PREDICTIONS_FILE, index=False)

    print()
    print("=" * 95)
    print("V5 FINAL SIDE-BY-SIDE RESULTS — 2024 HELD-OUT TEST")
    print("=" * 95)

    display = summary_df.copy()
    display["Final MAE"] = display["final_value_mae_eur"].apply(format_euros)
    display["Final RMSE"] = display["final_value_rmse_eur"].apply(format_euros)
    display["Final R²"] = display["final_value_r2"].map(lambda x: f"{x:.3f}")
    display["Change MAE"] = display["change_mae_eur"].apply(format_euros)
    display["Change RMSE"] = display["change_rmse_eur"].apply(format_euros)
    display["Change R²"] = display["change_r2"].map(lambda x: f"{x:.3f}")

    print(
        display[
            [
                "model",
                "Final MAE",
                "Final RMSE",
                "Final R²",
                "Change MAE",
                "Change RMSE",
                "Change R²",
            ]
        ].to_string(index=False)
    )

    # Choose the best tree model by held-out MAE for interpretation.
    tree_names = ["Tuned Random Forest", "Tuned Gradient Boosting"]
    tree_summary = summary_df[summary_df["model"].isin(tree_names)]
    best_tree_name = tree_summary.iloc[0]["model"]
    best_tree_model = fitted_models[best_tree_name]

    importance = feature_importance(best_tree_model)
    importance.to_csv(IMPORTANCE_FILE, index=False)
    save_importance_graph(importance)

    best_overall_name = summary_df.iloc[0]["model"]
    best_overall_predictions = prediction_df[
        prediction_df["model"] == best_overall_name
    ].copy()
    save_actual_graph(best_overall_name, best_overall_predictions)

    print()
    print("=" * 72)
    print(f"FEATURE IMPORTANCE — {best_tree_name.upper()}")
    print("=" * 72)
    print(
        importance[
            ["feature", "importance_percent"]
        ].head(20).to_string(
            index=False,
            formatters={
                "importance_percent": lambda x: f"{x:.2f}%"
            },
        )
    )

    print()
    print("=" * 72)
    print("FILES SAVED")
    print("=" * 72)
    print(f"Model comparison: {SUMMARY_FILE}")
    print(f"Tuning results:   {TUNING_FILE}")
    print(f"Test predictions: {PREDICTIONS_FILE}")
    print(f"Feature rankings: {IMPORTANCE_FILE}")
    print(f"Importance graph: {IMPORTANCE_GRAPH}")
    print(f"Prediction graph: {ACTUAL_GRAPH}")
    print(f"Models:           {MODEL_DIR}")
    print()
    print(f"Lowest held-out 2024 MAE: {best_overall_name}")
    print(
        f"MAE: {format_euros(summary_df.iloc[0]['final_value_mae_eur'])}"
    )


if __name__ == "__main__":
    main()