from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import joblib
import logging
from pathlib import Path

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths (Render pe working directory alag ho sakti hai, isliye BASE_DIR use karo)
BASE_DIR = Path(__file__).resolve().parent

# Load Model
model = joblib.load(BASE_DIR / "model.pkl")
model_columns = joblib.load(BASE_DIR / "model_columns.pkl")


class Detail(BaseModel):
    brand: str
    condition: str
    original_price: float
    age_months: float
    battery_health: float
    screen_cracked: int
    body_damage: int
    repair_history: int
    water_damage: int
    warranty_remaining_months: float
    box_available: int
    charger_available: int
    market_demand_score: float


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/prediction")
def resale_price(data: Detail):
    try:
        df_new = pd.DataFrame([data.model_dump()])

        df_new = pd.get_dummies(df_new, columns=["brand", "condition"])
        df_new = df_new.reindex(columns=model_columns, fill_value=0)

        result = model.predict(df_new)

        return {"predicted_resale_price": round(float(result[0]), 2)}

    except Exception as e:
        logging.exception("Prediction failed")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


# Static Files (sabse last mein, taaki API routes pehle match hon)
app.mount(
    "/",
    StaticFiles(directory=str(BASE_DIR / "resaleiq-website"), html=True),
    name="static",
)
