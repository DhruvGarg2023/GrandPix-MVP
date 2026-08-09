import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib

def train_and_export_model():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_path = os.path.abspath(os.path.join(current_dir, '..', 'data', 'historical_simulation_training.csv'))
    model_output_path = os.path.join(current_dir, 'model.joblib')

    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Training dataset not found at {dataset_path}")

    print(f"[Train Pipeline] Loading dataset from: {dataset_path}")
    df = pd.read_csv(dataset_path)

    feature_cols = [
        'zone', 'event', 'weather', 'attendance',
        'current_density_ratio', 'flow_rate_ratio', 'queue_length', 'blocked_route'
    ]
    target_col = 'future_density_10min_ratio'

    X = df[feature_cols]
    y = df[target_col]

    categorical_features = ['zone', 'event', 'weather']
    numerical_features = ['attendance', 'current_density_ratio', 'flow_rate_ratio', 'queue_length', 'blocked_route']

    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), categorical_features),
            ('num', 'passthrough', numerical_features)
        ]
    )

    model_pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42))
    ])

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print("[Train Pipeline] Training RandomForestRegressor model...")
    model_pipeline.fit(X_train, y_train)

    y_pred = model_pipeline.predict(X_test)

    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)

    print("  MODEL EVALUATION RESULTS: ")
    print(f"  MAE  (Mean Absolute Error) : {mae:.4f}")
    print(f"  RMSE (Root Mean Sq Error)  : {rmse:.4f}")
    print(f"  R²   (R-Squared Score)     : {r2:.4f}")

    joblib.dump(model_pipeline, model_output_path)
    print(f"[Train Pipeline] Model serialized successfully to: {model_output_path}")

    return {
        'mae': mae,
        'rmse': rmse,
        'r2': r2,
        'model_path': model_output_path
    }

if __name__ == '__main__':
    train_and_export_model()
