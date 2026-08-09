import os
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import pandas as pd
import joblib

app = FastAPI(
    title="F1 Crowd Intelligence - Python Prediction Service",
    description="ML Regression Service for 10-Minute Future Crowd Density Forecasting",
    version="1.0.0"
)

MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "model.joblib")
model_pipeline = None

def get_model():
    global model_pipeline
    if model_pipeline is None:
        if os.path.exists(MODEL_PATH):
            try:
                model_pipeline = joblib.load(MODEL_PATH)
                print(f"[FastAPI] Model loaded successfully from {MODEL_PATH}")
            except Exception as e:
                print(f"[FastAPI] Error loading model: {e}")
                model_pipeline = None
        else:
            print(f"[FastAPI] Warning: Model file not found at {MODEL_PATH}")
    return model_pipeline

@app.on_event("startup")
def startup_event():
    get_model()

class NodeFeatureInput(BaseModel):
    zone: str = Field(..., example="GS_A")
    event: str = Field(..., example="RACE")
    weather: str = Field(..., example="rain")
    attendance: float = Field(default=120000.0, example=120000.0)
    current_density_ratio: float = Field(..., example=0.82)
    flow_rate_ratio: float = Field(default=0.5, example=0.65)
    queue_length: float = Field(default=0.0, example=150.0)
    blocked_route: int = Field(default=0, example=0)

class BatchPredictionRequest(BaseModel):
    items: List[NodeFeatureInput]

class PredictionItemResponse(BaseModel):
    zone: str
    current_density_ratio: float
    predicted_density_10min_ratio: float
    delta: float

class BatchPredictionResponse(BaseModel):
    status: str = "ok"
    count: int
    predictions: List[PredictionItemResponse]

@app.get("/health")
def health_check():
    model = get_model()
    return {
        "status": "ok",
        "service": "F1 Crowd Prediction Service",
        "model_loaded": model is not None,
        "model_path": MODEL_PATH
    }

@app.post("/predict", response_model=PredictionItemResponse)
def predict_single(input_data: NodeFeatureInput):
    model = get_model()
    if model is None:
        raise HTTPException(status_code=503, detail="Prediction model is uninitialized or unavailable.")

    df = pd.DataFrame([input_data.dict()])
    try:
        prediction = float(model.predict(df)[0])
        prediction = max(0.0, min(1.5, prediction))  # Clip to realistic range
        delta = prediction - input_data.current_density_ratio
        return PredictionItemResponse(
            zone=input_data.zone,
            current_density_ratio=input_data.current_density_ratio,
            predicted_density_10min_ratio=round(prediction, 4),
            delta=round(delta, 4)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

@app.post("/predict/batch", response_model=BatchPredictionResponse)
def predict_batch(request: BatchPredictionRequest):
    model = get_model()
    if model is None:
        raise HTTPException(status_code=503, detail="Prediction model is uninitialized or unavailable.")

    if not request.items:
        return BatchPredictionResponse(status="ok", count=0, predictions=[])

    df = pd.DataFrame([item.dict() for item in request.items])
    try:
        predictions = model.predict(df)
        results = []
        for item, pred in zip(request.items, predictions):
            pred_clipped = round(max(0.0, min(1.5, float(pred))), 4)
            delta = round(pred_clipped - item.current_density_ratio, 4)
            results.append(PredictionItemResponse(
                zone=item.zone,
                current_density_ratio=item.current_density_ratio,
                predicted_density_10min_ratio=pred_clipped,
                delta=delta
            ))

        return BatchPredictionResponse(
            status="ok",
            count=len(results),
            predictions=results
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch inference error: {str(e)}")
