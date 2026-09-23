from pathlib import Path

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression
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

MODEL_FILE = (
    MODEL_DIR
    / "transfer_value_linear_v2.joblib"
)

RESULTS_FILE = (
    TRANSFER_DIR
    / "data"
    / "processed"
    / "linear_v2_predictions.csv"
)

GRAPH_FILE = (
    TRANSFER_DIR
    / "data"
    / "processed"
    / "linear_v2_actual_vs_predicted.png"
)


# --------------------------------------------------
# V2 FEATURES
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
]

CATEGORICAL_FEATURES = [
    "transfermarkt_position",
]

FEATURES = (
    NUMERICAL_FEATURES
    + CATEGORICAL_FEATURES
)

TARGET = "market_value_eur"

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
    required_columns = (
        FEATURES
        + [
            TARGET,
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

    data = data[
        data[TARGET] > 0
    ].copy()

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
# Build V2 model
# --------------------------------------------------

def build_model():
    numerical_pipeline = Pipeline(
        steps=[
            (
                "imputer",
                SimpleImputer(
                    strategy="median"
                ),
            ),
            (
                "scaler",
                StandardScaler(),
            ),
        ]
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

    model = Pipeline(
        steps=[
            (
                "preprocessor",
                preprocessor,
            ),
            (
                "regressor",
                LinearRegression(),
            ),
        ]
    )

    return model


# --------------------------------------------------
# Evaluate model
# --------------------------------------------------

def evaluate_model(
    model,
    test_data,
    X_test,
    y_test,
):
    predictions = model.predict(
        X_test
    )

    # Keep raw predictions for metrics.
    # Clip only displayed predictions.
    display_predictions = np.maximum(
        predictions,
        0,
    )

    mae = mean_absolute_error(
        y_test,
        predictions,
    )

    rmse = np.sqrt(
        mean_squared_error(
            y_test,
            predictions,
        )
    )

    r2 = r2_score(
        y_test,
        predictions,
    )

    print()
    print(
        "=" * 60
    )

    print(
        "PLSTATS TRANSFER VALUE V2"
    )

    print(
        "Model: Linear Regression "
        "+ Advanced Understat Features"
    )

    print(
        "=" * 60
    )

    print()
    print(
        "TEST RESULTS"
    )

    print(
        f"MAE:  {format_euros(mae)}"
    )

    print(
        f"RMSE: {format_euros(rmse)}"
    )

    print(
        f"R²:   {r2:.3f}"
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
            TARGET,
        ]
    ].copy()

    results[
        "predicted_market_value_eur"
    ] = display_predictions

    results[
        "raw_prediction_eur"
    ] = predictions

    results[
        "error_eur"
    ] = (
        results[
            "predicted_market_value_eur"
        ]
        - results[
            TARGET
        ]
    )

    results[
        "absolute_error_eur"
    ] = (
        results[
            "error_eur"
        ].abs()
    )

    results[
        "percentage_error"
    ] = np.where(
        results[TARGET] > 0,
        (
            results[
                "absolute_error_eur"
            ]
            / results[TARGET]
        )
        * 100,
        np.nan,
    )

    return (
        results,
        predictions,
        mae,
        rmse,
        r2,
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
# V1 vs V2 comparison
# --------------------------------------------------

def print_v1_comparison(
    mae,
    rmse,
    r2,
):
    # Results from our completed V1.
    v1_mae = 11_010_000
    v1_rmse = 16_660_000
    v1_r2 = 0.399

    mae_change = (
        (v1_mae - mae)
        / v1_mae
        * 100
    )

    rmse_change = (
        (v1_rmse - rmse)
        / v1_rmse
        * 100
    )

    r2_change = (
        r2 - v1_r2
    )

    print()
    print(
        "=" * 60
    )

    print(
        "V1 vs V2"
    )

    print(
        "=" * 60
    )

    print(
        f"V1 MAE:  "
        f"{format_euros(v1_mae)}"
    )

    print(
        f"V2 MAE:  "
        f"{format_euros(mae)}"
    )

    print(
        f"MAE improvement: "
        f"{mae_change:.1f}%"
    )

    print()

    print(
        f"V1 RMSE: "
        f"{format_euros(v1_rmse)}"
    )

    print(
        f"V2 RMSE: "
        f"{format_euros(rmse)}"
    )

    print(
        f"RMSE improvement: "
        f"{rmse_change:.1f}%"
    )

    print()

    print(
        f"V1 R²:   "
        f"{v1_r2:.3f}"
    )

    print(
        f"V2 R²:   "
        f"{r2:.3f}"
    )

    print(
        f"R² change: "
        f"{r2_change:+.3f}"
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
        "PLStats Transfer Value V2\n"
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

    print()
    print(
        "Building V2 Linear Regression "
        "pipeline..."
    )

    model = build_model()

    print(
        "Training V2 model..."
    )

    model.fit(
        X_train,
        y_train,
    )

    print(
        "Training complete!"
    )

    (
        results,
        predictions,
        mae,
        rmse,
        r2,
    ) = evaluate_model(
        model,
        test_data,
        X_test,
        y_test,
    )

    print_predictions(
        results
    )

    print_v1_comparison(
        mae,
        rmse,
        r2,
    )

    # Save prediction CSV.
    results.to_csv(
        RESULTS_FILE,
        index=False,
    )

    # Create graph.
    create_graph(
        y_test,
        predictions,
    )

    # Save model.
    MODEL_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    joblib.dump(
        model,
        MODEL_FILE,
    )

    print()
    print(
        "=" * 60
    )

    print(
        "FILES SAVED"
    )

    print(
        "=" * 60
    )

    print(
        "Model:",
        MODEL_FILE,
    )

    print(
        "Predictions:",
        RESULTS_FILE,
    )

    print(
        "Graph:",
        GRAPH_FILE,
    )


if __name__ == "__main__":
    main()