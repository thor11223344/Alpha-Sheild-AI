from fastapi import APIRouter, HTTPException
from models.ml_pipeline import get_nse_data, calculate_z_scores
from sklearn.ensemble import IsolationForest
import pandas as pd
import numpy as np

router = APIRouter()

@router.get("/")
def get_anomaly_screener(ticker: str, period: str = "1y"):
    try:
        # Fetch and prepare data
        df = get_nse_data(ticker, period=period)
        df = calculate_z_scores(df)
        
        # Drop NaNs created by rolling windows
        df_clean = df.dropna().copy()
        
        if len(df_clean) < 50:
            raise HTTPException(status_code=400, detail="Not enough data points after calculating rolling features. Try a longer period.")

        # Features for Isolation Forest
        features = ['Vol_Z', 'Ret_Z', 'Volatility']
        X = df_clean[features]
        
        # Train Isolation Forest
        # contamination = 0.05 means we expect ~5% of days to be anomalous
        model = IsolationForest(contamination=0.05, random_state=42)
        df_clean['Anomaly'] = model.fit_predict(X)
        
        # IsolationForest outputs 1 for normal, -1 for anomaly
        anomalies = df_clean[df_clean['Anomaly'] == -1]
        
        # Format output
        results = []
        for _, row in df.iterrows():
            # Convert timestamp to string
            date_str = row['Date'].strftime('%Y-%m-%d')
            
            is_anomaly = False
            explanation = ""
            
            # Check if this date is in our anomalies
            if date_str in anomalies['Date'].dt.strftime('%Y-%m-%d').values:
                is_anomaly = True
                vol_z = row['Vol_Z']
                ret_z = row['Ret_Z']
                
                # Generate explanation
                reasons = []
                if vol_z > 2:
                    reasons.append(f"Volume {vol_z:.1f} standard deviations above average")
                if abs(ret_z) > 2:
                    direction = "up" if ret_z > 0 else "down"
                    reasons.append(f"Price moved sharply {direction} (z-score: {ret_z:.1f})")
                
                if not reasons:
                    reasons.append("Unusual combination of volume and price movement")
                    
                explanation = " and ".join(reasons)

            results.append({
                "date": date_str,
                "close": row['Close'],
                "volume": row['Volume'],
                "is_anomaly": is_anomaly,
                "explanation": explanation
            })
            
        return {
            "ticker": ticker.upper(),
            "data": results,
            "anomaly_count": len(anomalies)
        }
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
