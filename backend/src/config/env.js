import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  pythonPredictionUrl: process.env.PYTHON_PREDICTION_URL || 'http://localhost:8000',
  hfToken: process.env.HF_TOKEN || '',
  hfModel: process.env.HF_MODEL || 'mistralai/Mixtral-8x7B-Instruct-v0.1',
  dataPath: path.resolve(__dirname, '../../../data')
};
