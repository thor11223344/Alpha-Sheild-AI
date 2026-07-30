from fastapi import APIRouter, HTTPException
from models.ml_pipeline import get_nse_data, calculate_z_scores
from sklearn.ensemble import IsolationForest
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import feedparser
import urllib.parse
from datetime import datetime, timedelta
import pandas as pd

router = APIRouter()
analyzer = SentimentIntensityAnalyzer()

def fetch_news_sentiment(ticker: str) -> dict:
    """
    Fetch recent news for a ticker using Google News RSS and calculate sentiment.
    """
    clean_ticker = ticker.upper().replace(".NS", "")
    query = urllib.parse.quote(f"{clean_ticker} NSE stock")
    url = f"https://news.google.com/rss/search?q={query}&hl=en-IN&gl=IN&ceid=IN:en"
    
    feed = feedparser.parse(url)
    
    if not feed.entries:
        return {"avg_sentiment": 0, "articles": [], "news_volume": 0}
        
    sentiments = []
    articles = []
    
    # Analyze top 10 articles
    for entry in feed.entries[:10]:
        title = entry.title
        # Analyze sentiment
        score = analyzer.polarity_scores(title)
        compound = score['compound']
        sentiments.append(compound)
        
        articles.append({
            "title": title,
            "link": entry.link,
            "sentiment": compound,
            "published": getattr(entry, 'published', 'Unknown date')
        })
        
    avg_sentiment = sum(sentiments) / len(sentiments) if sentiments else 0
    
    return {
        "avg_sentiment": avg_sentiment,
        "news_volume": len(feed.entries),
        "articles": articles
    }

@router.get("/")
def get_manipulation_detector(ticker: str):
    try:
        # 1. Get recent data and check for anomalies
        df = get_nse_data(ticker, period="3mo")
        df = calculate_z_scores(df)
        df_clean = df.dropna().copy()
        
        if len(df_clean) < 30:
            raise HTTPException(status_code=400, detail="Not enough data points.")

        features = ['Vol_Z', 'Ret_Z', 'Volatility']
        model = IsolationForest(contamination=0.05, random_state=42)
        df_clean['Anomaly'] = model.fit_predict(df_clean[features])
        
        # Check if the most recent day or two has an anomaly
        recent_data = df_clean.tail(3)
        has_recent_anomaly = (recent_data['Anomaly'] == -1).any()
        
        recent_vol_z = recent_data['Vol_Z'].max()
        recent_ret_z = recent_data.loc[recent_data['Vol_Z'].idxmax(), 'Ret_Z'] if recent_vol_z > 0 else 0
        
        # 2. Get News Sentiment
        news_data = fetch_news_sentiment(ticker)
        
        # 3. Pump and Dump Logic
        manipulation_score = 0
        indicators = []
        
        if has_recent_anomaly:
            if recent_vol_z > 2.5:
                manipulation_score += 40
                indicators.append(f"Extremely high recent volume (Z-score: {recent_vol_z:.1f})")
            
            if recent_ret_z > 2:
                manipulation_score += 30
                indicators.append(f"Sharp unexplained price jump (Z-score: {recent_ret_z:.1f})")
                
        # If there is a huge price/vol jump but NO news, it's highly suspicious
        if manipulation_score > 0 and news_data['news_volume'] < 3:
            manipulation_score += 30
            indicators.append("Price/Volume anomaly with little to no supporting news coverage")
        # If there's a lot of highly positive news suddenly appearing alongside a jump
        elif manipulation_score > 0 and news_data['avg_sentiment'] > 0.5:
            manipulation_score += 15
            indicators.append("Highly positive news sentiment accompanying the price jump")
            
        risk_level = "Low"
        if manipulation_score > 70:
            risk_level = "High"
        elif manipulation_score > 40:
            risk_level = "Medium"
            
        clean_ticker = ticker.upper().replace(".NS", "")
        return {
            "ticker": clean_ticker,
            "risk_level": risk_level,
            "manipulation_score": min(manipulation_score, 100),
            "indicators": indicators,
            "news_analysis": {
                "avg_sentiment": news_data['avg_sentiment'],
                "news_volume": news_data['news_volume'],
                "recent_articles": news_data['articles'][:3]
            },
            "recent_metrics": {
                "max_vol_z": float(recent_vol_z),
                "ret_z_at_max_vol": float(recent_ret_z),
                "has_anomaly": bool(has_recent_anomaly)
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
