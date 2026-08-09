import os
import unittest
from fastapi.testclient import TestClient
from train import train_and_export_model
from main import app

class TestPredictionService(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        print("\n[Test] Running Model Training & Verification...")
        cls.metrics = train_and_export_model()
        cls.client = TestClient(app)

    def test_01_model_evaluation_metrics(self):
        self.assertLess(self.metrics['mae'], 0.08, "MAE must be less than 0.08")
        self.assertGreater(self.metrics['r2'], 0.80, "R² score must be greater than 0.80")
        self.assertTrue(os.path.exists(self.metrics['model_path']), "Model joblib file must exist")

    def test_02_health_endpoint(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertTrue(data["model_loaded"])

    def test_03_batch_predict_endpoint(self):
        payload = {
            "items": [
                {
                    "zone": "GS_B",
                    "event": "RACE",
                    "weather": "heavy_rain",
                    "attendance": 120000.0,
                    "current_density_ratio": 0.8826,
                    "flow_rate_ratio": 0.9821,
                    "queue_length": 1093.59,
                    "blocked_route": 0
                },
                {
                    "zone": "FAN_ZONE",
                    "event": "LUNCH",
                    "weather": "cloudy",
                    "attendance": 120000.0,
                    "current_density_ratio": 0.6942,
                    "flow_rate_ratio": 0.7983,
                    "queue_length": 1152.92,
                    "blocked_route": 0
                }
            ]
        }
        response = self.client.post("/predict/batch", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["count"], 2)
        
        preds = data["predictions"]
        self.assertEqual(preds[0]["zone"], "GS_B")
        self.assertGreater(preds[0]["predicted_density_10min_ratio"], 0.80)

if __name__ == '__main__':
    unittest.main()
