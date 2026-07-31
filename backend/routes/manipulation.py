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
        # 1. Get recent data (use 5y to analyze all historical pumps and dumps)
        df = get_nse_data(ticker, period="5y")
        df = calculate_z_scores(df)
        df_clean = df.dropna().copy()
        
        if len(df_clean) < 30:
            raise HTTPException(status_code=400, detail="Not enough data points.")

        # Advanced Candlestick Features
        df_clean['Price_Range'] = df_clean['High'] - df_clean['Low']
        df_clean['Upper_Wick'] = df_clean['High'] - df_clean[['Open', 'Close']].max(axis=1)
        df_clean['Wick_Ratio'] = df_clean['Upper_Wick'] / df_clean['Price_Range'].replace(0, 0.001)
        df_clean['Is_Green'] = df_clean['Close'] > df_clean['Open']
        df_clean['Consecutive_Green'] = df_clean['Is_Green'].groupby((~df_clean['Is_Green']).cumsum()).cumcount()
        
        # Anomaly Detection
        features = ['Vol_Z', 'Ret_Z', 'Volatility']
        model = IsolationForest(contamination=0.05, random_state=42)
        df_clean['Anomaly'] = model.fit_predict(df_clean[features])
        
        # Check recent data (last 5 days) for the scoring
        recent_data = df_clean.tail(5)
        
        recent_vol_z = recent_data['Vol_Z'].max()
        max_vol_idx = recent_data['Vol_Z'].idxmax()
        recent_ret_z = recent_data.loc[max_vol_idx, 'Ret_Z']
        recent_wick_ratio = recent_data.loc[max_vol_idx, 'Wick_Ratio']
        max_consecutive_green = recent_data['Consecutive_Green'].max()
        
        # 2. Get News Sentiment
        news_data = fetch_news_sentiment(ticker)
        
        # 3. Advanced Multi-Factor Scoring Engine
        score_volume = 0
        score_price = 0
        score_dump = 0
        score_news = 0
        indicators = []
        markers = [] # For the frontend chart
        
        # Volume Scoring (Max 30)
        if recent_vol_z > 4.0:
            score_volume = 30
            indicators.append(f"Extreme Volume Spike (Z: {recent_vol_z:.1f})")
        elif recent_vol_z > 2.5:
            score_volume = 15
            indicators.append(f"High Volume Anomaly (Z: {recent_vol_z:.1f})")
            
        # Price Spikes (Max 30)
        if recent_ret_z > 3.0:
            score_price += 15
            indicators.append(f"Massive Unexplained Price Jump (Z: {recent_ret_z:.1f})")
        elif recent_ret_z > 2.0:
            score_price += 10
            
        if max_consecutive_green >= 4:
            score_price += 15
            indicators.append(f"Unusual Momentum: {max_consecutive_green} consecutive green days")
        elif max_consecutive_green == 3:
            score_price += 10
            
        # Dump Evidence (Max 25)
        if recent_vol_z > 2.0 and recent_wick_ratio > 0.4:
            score_dump = 25
            indicators.append("Heavy distribution/dumping detected (Long upper wick on high volume)")
        elif recent_vol_z > 1.5 and recent_wick_ratio > 0.3:
            score_dump = 15
            
        # News Divergence (Max 15)
        total_suspicion = score_volume + score_price + score_dump
        if total_suspicion > 20 and news_data['news_volume'] < 3:
            score_news = 15
            indicators.append("High price/volume action with almost ZERO news coverage (Retail Trap)")
        elif total_suspicion > 20 and news_data['avg_sentiment'] > 0.6:
            score_news = 10
            indicators.append("Extremely hyped news sentiment correlating with suspicious volume")
            
        manipulation_score = min(score_volume + score_price + score_dump + score_news, 100)
        
        # Phase Detection
        phase = "Normal"
        if manipulation_score > 60 and score_dump >= 15:
            phase = "🚨 DUMPING"
        elif manipulation_score > 50 and score_price >= 15:
            phase = "📈 PUMPING"
        elif manipulation_score > 30 and score_volume >= 15 and score_price < 10:
            phase = "🔍 ACCUMULATION"
            
        risk_level = "Low"
        if manipulation_score > 70:
            risk_level = "High"
        elif manipulation_score > 40:
            risk_level = "Medium"
            
        # Prepare Chart Data Payload (All historical data for display)
        display_data = df_clean.copy()
        chart_data = []
        for index, row in display_data.iterrows():
            date_str = pd.to_datetime(row['Date']).strftime('%Y-%m-%d')
            chart_data.append({
                "time": date_str,
                "open": float(row['Open']),
                "high": float(row['High']),
                "low": float(row['Low']),
                "close": float(row['Close']),
                "value": float(row['Volume']),
                "anomaly": bool(row['Anomaly'] == -1),
                "wick_ratio": float(row['Wick_Ratio'])
            })
            
            # Generate markers
            if row['Anomaly'] == -1 and row['Vol_Z'] > 2.5:
                if row['Wick_Ratio'] > 0.4:
                     markers.append({"time": date_str, "position": "aboveBar", "color": "#e11d48", "shape": "arrowDown", "text": "Dump"})
                elif row['Ret_Z'] > 2.0:
                     markers.append({"time": date_str, "position": "belowBar", "color": "#10b981", "shape": "arrowUp", "text": "Pump"})
            
        clean_ticker = ticker.upper().replace(".NS", "")
        return {
            "ticker": clean_ticker,
            "risk_level": risk_level,
            "manipulation_score": manipulation_score,
            "phase": phase,
            "vectors": {
                "volume": score_volume,
                "price": score_price,
                "dump": score_dump,
                "news": score_news
            },
            "indicators": indicators,
            "news_analysis": {
                "avg_sentiment": news_data['avg_sentiment'],
                "news_volume": news_data['news_volume'],
                "recent_articles": news_data['articles'][:3]
            },
            "recent_metrics": {
                "max_vol_z": float(recent_vol_z),
                "ret_z_at_max_vol": float(recent_ret_z)
            },
            "chart_data": chart_data,
            "markers": markers
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
