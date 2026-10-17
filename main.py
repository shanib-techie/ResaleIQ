from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import joblib

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Model
model = joblib.load("model.pkl")
model_columns = joblib.load("model_columns.pkl")


# Request Body
class Detail(BaseModel):
    brand: str
    condition: str
    original_price: int
    age_months: int
    battery_health: int
    screen_cracked: int
    body_damage: int
    repair_history: int
    water_damage: int
    warranty_remaining_months: int
    box_available: int
    charger_available: int
    market_demand_score: int


@app.post("/prediction")
def resale_price(data: Detail):

    df_new = pd.DataFrame([{
        "brand": data.brand,
        "condition": data.condition,
        "original_price": data.original_price,
        "age_months": data.age_months,
        "battery_health": data.battery_health,
        "screen_cracked": data.screen_cracked,
        "body_damage": data.body_damage,
        "repair_history": data.repair_history,
        "water_damage": data.water_damage,
        "warranty_remaining_months": data.warranty_remaining_months,
        "box_available": data.box_available,
        "charger_available": data.charger_available,
        "market_demand_score": data.market_demand_score
    }])

    # One Hot Encoding
    df_new = pd.get_dummies(
        df_new,
        columns=[
            "brand",
            "condition"
        ]
    )

    # Missing columns add
    df_new = df_new.reindex(columns=model_columns, fill_value=0)

    # Prediction
    result = model.predict(df_new)

    return {
        "predicted_resale_price": round(float(result[0]), 2)
    }


# Static Files
app.mount("/", StaticFiles(directory="resaleiq-website", html=True), name="static")
