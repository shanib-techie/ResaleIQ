# 📱 ResaleIQ — Used Phone Resale Price Predictor

ResaleIQ predicts what a second-hand phone is actually worth, trained on **1,000,000** real-world resale listings. It pairs a **LightGBM** regression model with a static, dark-mode-first frontend and a **FastAPI** backend that serves live predictions.

> Live estimate, not a lookup table: enter a phone's condition, age, and market signals, and get an instant resale price straight from a trained gradient-boosted tree model.

---

## ✨ Features

- **The Model** — a documentation page walking through why Random Forest and XGBoost were dropped in favor of LightGBM, with a side-by-side accuracy comparison.
- **The Dataset** — a breakdown of the 1M-row dataset: brand distribution, schema, and feature groups.
- **Predict a Price** — a live form that calls a real trained model via a FastAPI endpoint and returns an instant resale estimate.
- **About Me** — a profile page that pulls live GitHub stats and repositories via the public GitHub API.
- **Dark / light mode**, fully responsive, no build step — plain HTML/CSS/JS.

---

## 🧠 The Model

Three algorithms were benchmarked before landing on the final model:

| Model | Training data | R² Score | MAE | RMSE | Verdict |
|---|---|---|---|---|---|
| Random Forest (30 trees) | 160,000 rows (20% sample) | 0.9497 | — | — | Under-scaled |
| XGBoost (depth 3) | 160,000 rows (unseeded sample) | 0.9396 | — | — | Under-fit |
| **LightGBM (300 trees)** | **800,000 rows (full 80/20 split)** | **0.9836** | **₹1,698.63** | **₹2,141.41** | **In production** |

**Why LightGBM won:**
- Random Forest only saw a 200k-row subsample with just 30 trees — too shallow and too little data.
- XGBoost was capped at `max_depth=3` and sampled without a fixed `random_state`, making it both under-fit and non-reproducible.
- LightGBM grows trees leaf-wise and bins features into histograms, so it trained fast on the **full 800k-row training set** with `n_estimators=300`, `learning_rate=0.05`, `max_depth=8` — capturing deeper feature interactions the other two missed.

### Feature importance (LightGBM, split count)

| Feature | Importance |
|---|---|
| `original_price` | 1940 |
| `age_months` | 1449 |
| `market_demand_score` | 1306 |
| `battery_health` | 991 |
| `water_damage` | 388 |
| `screen_cracked` | 331 |
| `condition_Poor` | 309 |
| `condition_Excellent` | 290 |
| `brand_Apple` | 288 |
| `warranty_remaining_months` | 231 |
| `brand_Realme` | 212 |
| `condition_Good` | 186 |
| `body_damage` | 158 |
| `repair_history` | 147 |
| `brand_Vivo` | 143 |
| `brand_Samsung` | 141 |
| `condition_Fair` | 103 |
| `brand_Google` | 98 |
| `brand_Xiaomi` | 80 |
| `charger_available` | 71 |
| `box_available` | 64 |
| `brand_OnePlus` | 58 |
| `os_type_Android` | 16 |

`camera_score`, `processor_score`, `battery_capacity`, `screen_size_inches`, `storage_gb`, `ram_gb`, `release_year`, `usage_hours_per_day`, `purchase_year`, `has_5g`, `os_type_iOS`, `city_tier`, and `seller_type` all scored **zero importance** — the model never split on them. Because of this, the production model was retrained on a **trimmed feature set** (see below) that drops every zero-importance column along with `model` (dropped from the start to avoid a 500+ column explosion from one-hot encoding hundreds of unique phone models).

### Final production features

```
brand, condition, original_price, age_months, battery_health,
screen_cracked, body_damage, repair_history, water_damage,
warranty_remaining_months, box_available, charger_available,
market_demand_score
```

---

## 🗂️ Dataset

- **1,000,000** listings, 7 brands (Apple, Samsung, Google, OnePlus, Xiaomi, Vivo, Realme), near-perfectly balanced (~142–143k rows each).
- Zero missing values.
- Categorical columns (`brand`, `condition`) are one-hot encoded before training.
- Target column: `resale_price` (₹).

---

## 🏗️ Architecture

```
Browser (predict.html)
      │  fetch POST /prediction
      ▼
FastAPI (main.py)
      │  loads model.pkl + model_columns.pkl
      │  one-hot encodes brand/condition
      │  reindexes to match training columns
      ▼
LightGBM model → predicted_resale_price
```

The frontend is fully static and is mounted by FastAPI itself, so a single `uvicorn` process serves both the website and the prediction API.

---

## 📁 Project structure

```
resaleIQ/
├── main.py                    # FastAPI app: /prediction endpoint + static file server
├── model.pkl                  # Trained LightGBM model (joblib)
├── model_columns.pkl          # Column order expected by the model (joblib)
├── analysis.ipynb             # Full training notebook (RF → XGBoost → LightGBM)
├── requirements.txt           # Python dependencies
├── .gitignore                 # Excludes venv/, __pycache__/, etc.
└── resaleiq-website/
    ├── index.html              # The Model — accuracy comparison & feature importance
    ├── dataset.html            # The Dataset — schema & brand distribution
    ├── predict.html            # Predict a Price — live prediction form
    ├── about.html               # About Me — live GitHub profile
    ├── css/
    │   └── style.css
    └── js/
        ├── theme.js             # Dark/light toggle, mobile nav
        ├── predict.js           # Calls /prediction with the form payload
        └── about.js              # Fetches GitHub profile + repos
```

---

## 🚀 Getting started

### 1. Clone & install

```bash
git clone https://github.com/shanib-techie/resaleIQ.git
cd resaleIQ
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Run the server

```bash
uvicorn main:app --reload
```

### 3. Open the site

Visit **http://127.0.0.1:8000/** — the FastAPI app serves the static site directly, so no separate frontend server is needed.

---

## 🔌 API reference

### `POST /prediction`

**Request body**

```json
{
  "brand": "Google",
  "condition": "Good",
  "original_price": 45554,
  "age_months": 33,
  "battery_health": 86,
  "screen_cracked": 0,
  "body_damage": 0,
  "repair_history": 0,
  "water_damage": 0,
  "warranty_remaining_months": 0,
  "box_available": 1,
  "charger_available": 1,
  "market_demand_score": 82
}
```

| Field | Type | Notes |
|---|---|---|
| `brand` | string | `Apple` / `Samsung` / `Google` / `OnePlus` / `Xiaomi` / `Vivo` / `Realme` |
| `condition` | string | `Excellent` / `Good` / `Fair` / `Poor` |
| `original_price` | int | MSRP when new (₹) |
| `age_months` | int | Months since purchase |
| `battery_health` | int | 0–100 (%) |
| `screen_cracked` | int | 0 or 1 |
| `body_damage` | int | 0 or 1 |
| `repair_history` | int | Number of past repairs |
| `water_damage` | int | 0 or 1 |
| `warranty_remaining_months` | int | Months of warranty left |
| `box_available` | int | 0 or 1 |
| `charger_available` | int | 0 or 1 |
| `market_demand_score` | int | 0–100 |

**Response**

```json
{
  "predicted_resale_price": 19361.48
}
```

---

## 🛠️ Retraining the model

The full training pipeline (data load → cleaning → Random Forest → XGBoost → LightGBM → feature importance → export) lives in [`analysis.ipynb`](./analysis.ipynb). To retrain:

```python
import joblib
joblib.dump(model, "model.pkl")
joblib.dump(X.columns, "model_columns.pkl")
```

Then drop the new `model.pkl` and `model_columns.pkl` into the project root — `main.py` picks them up automatically on the next restart.

---

## 🧩 Tech stack

- **Modeling:** Python, pandas, scikit-learn, XGBoost, LightGBM, joblib
- **Backend:** FastAPI, Pydantic, Uvicorn
- **Frontend:** HTML5, CSS3 (custom design system, no framework), vanilla JavaScript
- **Data source:** synthetic-but-realistic 1M-row used-phone resale dataset

---

## 👤 Author

**Shanib Khan**
B.Sc. (Hons.) Computer Science · Data & ML

- GitHub: [@shanib-techie](https://github.com/shanib-techie)
- Portfolio: [shanibkhan.netlify.app](https://shanibkhan.netlify.app/)
- LinkedIn: [shanib-khan](https://www.linkedin.com/in/shanib-khan-515a8a316/)

---

## 📄 License

This project is open source and available for personal and educational use. Add a license file (e.g. MIT) if you plan to distribute it publicly.
