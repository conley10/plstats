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
    / "transfer_value_linear_v1.joblib"
)

RESULTS_FILE = (
    TRANSFER_DIR
    / "data"
    / "processed"
    / "linear_v1_predictions.csv"
)

GRAPH_FILE = (
    TRANSFER_DIR
    / "data"
    / "processed"
    / "linear_v1_actual_vs_predicted.png"
)


# --------------------------------------------------
# Model configuration
# --------------------------------------------------

NUMERICAL_FEATURES = [
    "age",
    "appearances",
    "minutes",
    "goals",
    "assists",
    "goals_per_90",
    "assists_per_90",
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
# Load data
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

    # Target must exist.
    data = data.dropna(
        subset=[TARGET]
    ).copy()

    # Keep sensible positive values.
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
# Build model
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
                    strategy=(
                        "most_frequent"
                    )
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
# Evaluate
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

    # Market value should never be
    # negative in the displayed results.
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
        "=" * 55
    )

    print(
        "PLSTATS TRANSFER VALUE V1"
    )

    print(
        "Model: Linear Regression"
    )

    print(
        "=" * 55
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
# Display examples
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

    display = display[
        [
            "player",
            "team",
            "Actual",
            "Predicted",
            "Error",
        ]
    ]

    print()
    print(
        "SAMPLE PREDICTIONS"
    )

    print(
        "-" * 80
    )

    print(
        display
        .head(20)
        .to_string(
            index=False
        )
    )

    print()
    print(
        "BEST PREDICTIONS"
    )

    print(
        "-" * 80
    )

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

    print()
    print(
        "BIGGEST MISSES"
    )

    print(
        "-" * 80
    )

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
        "PLStats Transfer Value V1\n"
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
    ) = prepare_data(data)

    print()
    print(
        "Building Linear Regression "
        "pipeline..."
    )

    model = build_model()

    print(
        "Training model..."
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

    # Save predictions.
    results.to_csv(
        RESULTS_FILE,
        index=False,
    )

    # Create graph.
    create_graph(
        y_test,
        predictions,
    )

    # Save trained pipeline.
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
        "=" * 55
    )

    print(
        "FILES SAVED"
    )

    print(
        "=" * 55
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