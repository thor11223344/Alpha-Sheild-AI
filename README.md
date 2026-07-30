# MarketGuard AI 🛡️📈

**Integrated Market Intelligence & Risk Analysis Platform for the Indian Stock Market (NSE)**

MarketGuard AI is a comprehensive, full-stack web application designed for analyzing NSE stocks using advanced Machine Learning techniques. This project focuses on actionable market intelligence, shifting away from standard CRUD operations towards real-world quantitative analysis and risk assessment.

---

## 🚀 Modules

1. **Anomaly & Information-Leakage Screener**
   - **Methodology**: Computes rolling Z-scores for volume and daily returns over a 30-day window. Uses Scikit-Learn's `IsolationForest` to detect statistically abnormal trading days.
   - **Purpose**: Flags potential information leakage or institutional accumulation before major news breaks.

2. **Pump-and-Dump / Manipulation Detector**
   - **Methodology**: Combines the Isolation Forest anomaly detection with real-time news sentiment analysis using VADER (`vaderSentiment`) via Google News RSS feeds.
   - **Purpose**: Identifies highly suspicious price movements that occur without supporting news, or alongside suspiciously euphoric retail sentiment.

3. **Regime-Aware Portfolio Stress Tester**
   - **Methodology**: Trains a Gaussian Hidden Markov Model (`hmmlearn`) on the Nifty 50 index to classify the current market regime (e.g., Bull vs. Bear/Volatile). Runs Monte Carlo simulations (Geometric Brownian Motion) on a user's portfolio conditioned on the detected regime's parameters.
   - **Purpose**: Estimates realistic Value at Risk (VaR) and Maximum Drawdowns tailored to the *current* market environment, not just historical averages.

4. **AI IPO Evaluator**
   - **Methodology**: A rule-based weighted scoring engine analyzing retail/QIB demand, financial health (revenue growth, profit margin), and valuation heuristics.
   - **Purpose**: Outputs an "Attractiveness Score" out of 100, visually represented with a breakdown radar chart.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, Recharts, Lucide-React.
- **Backend**: Python 3, FastAPI, Uvicorn.
- **ML & Data**: `scikit-learn`, `hmmlearn`, `pandas`, `numpy`, `yfinance`, `vaderSentiment`, `feedparser`.
- **Zero Cost**: Built entirely using free, open-source libraries and public data APIs (no paid subscriptions required).

---

## ⚙️ Local Setup Instructions

### 1. Backend Setup

Open a terminal and navigate to the `backend` folder:

```bash
cd backend
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the FastAPI server
uvicorn main:app --reload
```
The backend API will be available at `http://localhost:8000`. You can view the interactive API docs at `http://localhost:8000/docs`.

### 2. Frontend Setup

Open a new terminal window and navigate to the `frontend` folder:

```bash
cd frontend

# Install dependencies
npm install

# Run the Next.js development server
npm run dev
```
The frontend application will be available at `http://localhost:3000`.

---

## 📁 Architecture Overview

- **`backend/models/ml_pipeline.py`**: Centralized logic for fetching `.NS` (NSE) tickers via `yfinance` and computing standard ML features (like rolling Z-scores).
- **`backend/routes/`**: Contains modular FastAPI routers for each of the 4 ML features.
- **`frontend/src/app/`**: Next.js App Router structure with dedicated pages for `/anomaly`, `/manipulation`, `/stress-test`, and `/ipo`.
- **`frontend/src/components/Sidebar.tsx`**: Shared navigation layout ensuring a seamless Single Page Application experience.

---
*Developed as a Machine Learning Web Application Mini-Project.*
