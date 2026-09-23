from pathlib import Path

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import (
    OneHotEncoder,
    StandardScaler,
)


# --------------------------------------------------
# Paths
# --------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[2]

TRANSFER_DIR = (
    PROJECT_ROOT
    / "python"
    / "transfer_value"
)

DATA_FILE = (
    TRANSFER_DIR
    / "data"
    / "processed"
    / "training_dataset.csv"
)

MODEL_DIR = (
    TRANSFER_DIR
    / "models"
)

COMPARISON_DIR = (
    TRANSFER_DIR
    / "data"
    / "processed"
    / "model_comparison"
)

RESULTS_FILE = (
    TRANSFER_DIR
    / "data"
    / "processed"
    / "v4_value_change_predictions.csv"
)

GRAPH_FILE = (
    TRANSFER_DIR
    / "data"
    / "processed"
    / "v4_actual_vs_predicted_value.png"
)


# --------------------------------------------------
# V3 FEATURES
# --------------------------------------------------

NUMERICAL_FEATURES = [
    # Basic player information
    "age",
    "appearances",
    "minutes",

    # Basic attacking output
    "goals",
    "assists",

    # Advanced attacking statistics
    "shots",
    "key_passes",
    "xg",
    "xa",
    "npg",
    "npxg",
    "xg_chain",
    "xg_buildup",

    # Rate statistics
    "goals_per_90",
    "assists_per_90",
    "xg_per_90",
    "xa_per_90",
    "shots_per_90",
    "key_passes_per_90",

    # Historical market-value information
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

TARGET = "market_value_change_from_previous_eur"

TRAIN_SEASONS = [
    2017,
    2018,
    2019,
    2020,
    2021,
    2022,
    2023,
]

TEST_SEASON = 2024


# --------------------------------------------------
# Formatting
# --------------------------------------------------

def format_euros(value):
    if pd.isna(value):
        return "N/A"

    if abs(value) >= 1_000_000:
        return (
            f"€{value / 1_000_000:,.2f}m"
        )

    if abs(value) >= 1_000:
        return (
            f"€{value / 1_000:,.0f}k"
        )

    return f"€{value:,.0f}"


# --------------------------------------------------
# Load dataset
# --------------------------------------------------

def load_dataset():
    print(
        "Loading training dataset..."
    )

    data = pd.read_csv(
        DATA_FILE
    )

    print(
        f"Rows loaded: {len(data):,}"
    )

    return data


# --------------------------------------------------
# Prepare data
# --------------------------------------------------

def prepare_data(data):
    # V4 predicts the change from the immediately previous
    # Transfermarkt valuation to the current target valuation.
    data = data[
        data["previous_market_value_eur"].notna()
    ].copy()

    data[TARGET] = (
        data["market_value_eur"]
        - data["previous_market_value_eur"]
    )

    print(
        f"Rows with previous market value: "
        f"{len(data):,}"
    )

    required_columns = (
        FEATURES
        + [
            TARGET,
            "market_value_eur",
            "season",
            "player",
            "team",
        ]
    )

    missing_columns = [
        column
        for column in required_columns
        if column not in data.columns
    ]

    if missing_columns:
        raise ValueError(
            "Missing required columns: "
            + ", ".join(
                missing_columns
            )
        )

    data = data.dropna(
        subset=[TARGET]
    ).copy()

    train_data = data[
        data["season"].isin(
            TRAIN_SEASONS
        )
    ].copy()

    test_data = data[
        data["season"]
        == TEST_SEASON
    ].copy()

    if train_data.empty:
        raise ValueError(
            "Training data is empty."
        )

    if test_data.empty:
        raise ValueError(
            "Test data is empty."
        )

    print()
    print(
        "Time-based split:"
    )

    print(
        "Training seasons:",
        ", ".join(
            str(season)
            for season in TRAIN_SEASONS
        ),
    )

    print(
        f"Training rows: "
        f"{len(train_data):,}"
    )

    print(
        f"Test season: "
        f"{TEST_SEASON}"
    )

    print(
        f"Test rows: "
        f"{len(test_data):,}"
    )

    print()
    print(
        f"Numerical features: "
        f"{len(NUMERICAL_FEATURES)}"
    )

    print(
        f"Categorical features: "
        f"{len(CATEGORICAL_FEATURES)}"
    )

    X_train = train_data[
        FEATURES
    ]

    y_train = train_data[
        TARGET
    ]

    X_test = test_data[
        FEATURES
    ]

    y_test = test_data[
        TARGET
    ]

    return (
        train_data,
        test_data,
        X_train,
        X_test,
        y_train,
        y_test,
    )


# --------------------------------------------------
# Build V3 model
# --------------------------------------------------

def build_model(regressor, scale_numerical=False):
    numerical_steps = [
        (
            "imputer",
            SimpleImputer(
                strategy="median"
            ),
        ),
    ]

    if scale_numerical:
        numerical_steps.append(
            (
                "scaler",
                StandardScaler(),
            )
        )

    numerical_pipeline = Pipeline(
        steps=numerical_steps
    )

    categorical_pipeline = Pipeline(
        steps=[
            (
                "imputer",
                SimpleImputer(
                    strategy="most_frequent"
                ),
            ),
            (
                "encoder",
                OneHotEncoder(
                    handle_unknown="ignore"
                ),
            ),
        ]
    )

    preprocessor = ColumnTransformer(
        transformers=[
            (
                "numerical",
                numerical_pipeline,
                NUMERICAL_FEATURES,
            ),
            (
                "categorical",
                categorical_pipeline,
                CATEGORICAL_FEATURES,
            ),
        ]
    )

    return Pipeline(
        steps=[
            (
                "preprocessor",
                preprocessor,
            ),
            (
                "regressor",
                regressor,
            ),
        ]
    )


def get_models():
    return {
        "Linear Regression": build_model(
            LinearRegression(),
            scale_numerical=True,
        ),
        "Random Forest": build_model(
            RandomForestRegressor(
                n_estimators=500,
                random_state=42,
                n_jobs=-1,
                min_samples_leaf=2,
            )
        ),
        "Gradient Boosting": build_model(
            GradientBoostingRegressor(
                n_estimators=300,
                learning_rate=0.03,
                max_depth=3,
                random_state=42,
                loss="squared_error",
            )
        ),
    }


# --------------------------------------------------
# Evaluate model
# --------------------------------------------------

def evaluate_model(
    model,
    test_data,
    X_test,
    y_test,
):
    predicted_change = model.predict(
        X_test
    )

    results = test_data[
        [
            "player",
            "team",
            "season",
            "age",
            "transfermarkt_position",
            "minutes",
            "goals",
            "assists",
            "xg",
            "xa",
            "previous_market_value_eur",
            "market_value_1y_ago_eur",
            "days_since_previous_valuation",
            "market_value_eur",
            TARGET,
        ]
    ].copy()

    results[
        "predicted_market_value_change_eur"
    ] = predicted_change

    # Reconstruct the predicted current market value.
    raw_predicted_value = (
        results["previous_market_value_eur"]
        + predicted_change
    )

    results[
        "raw_predicted_market_value_eur"
    ] = raw_predicted_value

    results[
        "predicted_market_value_eur"
    ] = np.maximum(
        raw_predicted_value,
        0,
    )

    actual_value = results[
        "market_value_eur"
    ]

    predicted_value = results[
        "predicted_market_value_eur"
    ]

    mae = mean_absolute_error(
        actual_value,
        predicted_value,
    )

    rmse = np.sqrt(
        mean_squared_error(
            actual_value,
            predicted_value,
        )
    )

    r2 = r2_score(
        actual_value,
        predicted_value,
    )

    # Also measure how well the model predicts the change itself.
    change_mae = mean_absolute_error(
        y_test,
        predicted_change,
    )

    change_rmse = np.sqrt(
        mean_squared_error(
            y_test,
            predicted_change,
        )
    )

    change_r2 = r2_score(
        y_test,
        predicted_change,
    )

    print()
    print("=" * 60)
    print("PLSTATS TRANSFER VALUE V4")
    print(
        "Model: Linear Regression predicting "
        "market-value change"
    )
    print("=" * 60)

    print()
    print("FINAL VALUE TEST RESULTS")
    print(
        f"MAE:  {format_euros(mae)}"
    )
    print(
        f"RMSE: {format_euros(rmse)}"
    )
    print(
        f"R²:   {r2:.3f}"
    )

    print()
    print("VALUE-CHANGE TEST RESULTS")
    print(
        f"Change MAE:  "
        f"{format_euros(change_mae)}"
    )
    print(
        f"Change RMSE: "
        f"{format_euros(change_rmse)}"
    )
    print(
        f"Change R²:   "
        f"{change_r2:.3f}"
    )

    results[
        "error_eur"
    ] = (
        predicted_value
        - actual_value
    )

    results[
        "absolute_error_eur"
    ] = (
        results["error_eur"].abs()
    )

    results[
        "percentage_error"
    ] = np.where(
        actual_value > 0,
        (
            results["absolute_error_eur"]
            / actual_value
        )
        * 100,
        np.nan,
    )

    return (
        results,
        predicted_value.to_numpy(),
        mae,
        rmse,
        r2,
        change_mae,
        change_rmse,
        change_r2,
    )


# --------------------------------------------------
# Print prediction examples
# --------------------------------------------------

def print_predictions(results):
    display = results.copy()

    display["Actual"] = (
        display[
            "market_value_eur"
        ].apply(format_euros)
    )

    display["Predicted"] = (
        display[
            "predicted_market_value_eur"
        ].apply(format_euros)
    )

    display["Error"] = (
        display[
            "error_eur"
        ].apply(format_euros)
    )

    print()
    print(
        "SAMPLE PREDICTIONS"
    )

    print(
        "-" * 85
    )

    print(
        display[
            [
                "player",
                "team",
                "Actual",
                "Predicted",
                "Error",
            ]
        ]
        .head(20)
        .to_string(
            index=False
        )
    )

    # Best predictions
    best = (
        results
        .sort_values(
            "absolute_error_eur"
        )
        .head(10)
        .copy()
    )

    best["Actual"] = (
        best[
            "market_value_eur"
        ].apply(format_euros)
    )

    best["Predicted"] = (
        best[
            "predicted_market_value_eur"
        ].apply(format_euros)
    )

    best["Absolute Error"] = (
        best[
            "absolute_error_eur"
        ].apply(format_euros)
    )

    print()
    print(
        "BEST PREDICTIONS"
    )

    print(
        "-" * 85
    )

    print(
        best[
            [
                "player",
                "Actual",
                "Predicted",
                "Absolute Error",
            ]
        ]
        .to_string(
            index=False
        )
    )

    # Biggest misses
    worst = (
        results
        .sort_values(
            "absolute_error_eur",
            ascending=False,
        )
        .head(10)
        .copy()
    )

    worst["Actual"] = (
        worst[
            "market_value_eur"
        ].apply(format_euros)
    )

    worst["Predicted"] = (
        worst[
            "predicted_market_value_eur"
        ].apply(format_euros)
    )

    worst["Absolute Error"] = (
        worst[
            "absolute_error_eur"
        ].apply(format_euros)
    )

    print()
    print(
        "BIGGEST MISSES"
    )

    print(
        "-" * 85
    )

    print(
        worst[
            [
                "player",
                "Actual",
                "Predicted",
                "Absolute Error",
            ]
        ]
        .to_string(
            index=False
        )
    )


# --------------------------------------------------
# V1 vs V2 vs V3 comparison
# --------------------------------------------------

def print_model_comparison(
    mae,
    rmse,
    r2,
):
    v2_mae = 10_320_000
    v2_rmse = 15_940_000
    v2_r2 = 0.469

    v3_mae = 2_340_000
    v3_rmse = 3_810_000
    v3_r2 = 0.970

    historical_mae = 2_210_000
    historical_rmse = 3_800_000
    historical_r2 = 0.970

    print()
    print("=" * 60)
    print("MODEL COMPARISON")
    print("=" * 60)

    print(
        f"V2 performance-only MAE: "
        f"{format_euros(v2_mae)}"
    )
    print(
        f"V3 combined MAE:         "
        f"{format_euros(v3_mae)}"
    )
    print(
        f"Historical-only MAE:     "
        f"{format_euros(historical_mae)}"
    )
    print(
        f"V4 change-model MAE:     "
        f"{format_euros(mae)}"
    )

    print()

    print(
        f"V2 performance-only RMSE: "
        f"{format_euros(v2_rmse)}"
    )
    print(
        f"V3 combined RMSE:         "
        f"{format_euros(v3_rmse)}"
    )
    print(
        f"Historical-only RMSE:     "
        f"{format_euros(historical_rmse)}"
    )
    print(
        f"V4 change-model RMSE:     "
        f"{format_euros(rmse)}"
    )

    print()

    print(
        f"V2 performance-only R²: "
        f"{v2_r2:.3f}"
    )
    print(
        f"V3 combined R²:         "
        f"{v3_r2:.3f}"
    )
    print(
        f"Historical-only R²:     "
        f"{historical_r2:.3f}"
    )
    print(
        f"V4 change-model R²:     "
        f"{r2:.3f}"
    )


# --------------------------------------------------
# Graph
# --------------------------------------------------

def create_graph(
    y_test,
    predictions,
):
    plt.figure(
        figsize=(9, 7)
    )

    plt.scatter(
        y_test / 1_000_000,
        predictions / 1_000_000,
        alpha=0.6,
    )

    maximum = max(
        y_test.max(),
        predictions.max(),
    ) / 1_000_000

    minimum = min(
        0,
        predictions.min()
        / 1_000_000,
    )

    plt.plot(
        [minimum, maximum],
        [minimum, maximum],
        linestyle="--",
    )

    plt.xlabel(
        "Actual Market Value (€m)"
    )

    plt.ylabel(
        "Predicted Market Value (€m)"
    )

    plt.title(
        "PLStats Transfer Value V4\n"
        "Actual vs Predicted Market Value"
    )

    plt.grid(
        alpha=0.2
    )

    plt.tight_layout()

    plt.savefig(
        GRAPH_FILE,
        dpi=200,
        bbox_inches="tight",
    )

    plt.close()


# --------------------------------------------------
# Main
# --------------------------------------------------

def main():
    data = load_dataset()

    (
        train_data,
        test_data,
        X_train,
        X_test,
        y_train,
        y_test,
    ) = prepare_data(
        data
    )

    COMPARISON_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    MODEL_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    models = get_models()
    summary_rows = []
    all_predictions = []

    for model_name, model in models.items():
        print()
        print("=" * 70)
        print(model_name.upper())
        print("=" * 70)
        print("Training...")

        model.fit(
            X_train,
            y_train,
        )

        predicted_change = model.predict(
            X_test
        )

        predicted_value = np.maximum(
            test_data[
                "previous_market_value_eur"
            ].to_numpy()
            + predicted_change,
            0,
        )

        actual_value = test_data[
            "market_value_eur"
        ].to_numpy()

        final_mae = mean_absolute_error(
            actual_value,
            predicted_value,
        )

        final_rmse = np.sqrt(
            mean_squared_error(
                actual_value,
                predicted_value,
            )
        )

        final_r2 = r2_score(
            actual_value,
            predicted_value,
        )

        change_mae = mean_absolute_error(
            y_test,
            predicted_change,
        )

        change_rmse = np.sqrt(
            mean_squared_error(
                y_test,
                predicted_change,
            )
        )

        change_r2 = r2_score(
            y_test,
            predicted_change,
        )

        print(
            f"Final value MAE:  "
            f"{format_euros(final_mae)}"
        )
        print(
            f"Final value RMSE: "
            f"{format_euros(final_rmse)}"
        )
        print(
            f"Final value R²:   "
            f"{final_r2:.3f}"
        )
        print(
            f"Change MAE:       "
            f"{format_euros(change_mae)}"
        )
        print(
            f"Change RMSE:      "
            f"{format_euros(change_rmse)}"
        )
        print(
            f"Change R²:        "
            f"{change_r2:.3f}"
        )

        summary_rows.append(
            {
                "model": model_name,
                "final_value_mae_eur": final_mae,
                "final_value_rmse_eur": final_rmse,
                "final_value_r2": final_r2,
                "change_mae_eur": change_mae,
                "change_rmse_eur": change_rmse,
                "change_r2": change_r2,
            }
        )

        prediction_frame = test_data[
            [
                "player",
                "team",
                "season",
                "previous_market_value_eur",
                "market_value_eur",
                TARGET,
            ]
        ].copy()

        prediction_frame[
            "model"
        ] = model_name

        prediction_frame[
            "predicted_market_value_change_eur"
        ] = predicted_change

        prediction_frame[
            "predicted_market_value_eur"
        ] = predicted_value

        prediction_frame[
            "absolute_error_eur"
        ] = np.abs(
            predicted_value
            - actual_value
        )

        all_predictions.append(
            prediction_frame
        )

        safe_name = (
            model_name
            .lower()
            .replace(" ", "_")
        )

        joblib.dump(
            model,
            MODEL_DIR
            / f"transfer_value_v4_{safe_name}.joblib",
        )

    summary = pd.DataFrame(
        summary_rows
    ).sort_values(
        "final_value_mae_eur"
    )

    predictions = pd.concat(
        all_predictions,
        ignore_index=True,
    )

    summary.to_csv(
        GRAPH_FILE,
        index=False,
    )

    predictions.to_csv(
        RESULTS_FILE,
        index=False,
    )

    print()
    print("=" * 90)
    print("SIDE-BY-SIDE RESULTS")
    print("=" * 90)

    display = summary.copy()
    display["Final MAE"] = display[
        "final_value_mae_eur"
    ].apply(format_euros)
    display["Final RMSE"] = display[
        "final_value_rmse_eur"
    ].apply(format_euros)
    display["Final R²"] = display[
        "final_value_r2"
    ].map(lambda x: f"{x:.3f}")
    display["Change MAE"] = display[
        "change_mae_eur"
    ].apply(format_euros)
    display["Change RMSE"] = display[
        "change_rmse_eur"
    ].apply(format_euros)
    display["Change R²"] = display[
        "change_r2"
    ].map(lambda x: f"{x:.3f}")

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
        ].to_string(
            index=False
        )
    )

    print()
    print("Saved comparison metrics:")
    print(GRAPH_FILE)
    print()
    print("Saved all test predictions:")
    print(RESULTS_FILE)
    print()
    print("Saved all three trained models in:")
    print(MODEL_DIR)


if __name__ == "__main__":
    main()