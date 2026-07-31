from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import yfinance as yf
import asyncio
import random
import time
from datetime import datetime
import feedparser
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

router = APIRouter()

@router.get("/news/sentiment/")
def get_news_sentiment(ticker: str):
    analyzer = SentimentIntensityAnalyzer()
    
    # Try fetching Indian ticker first if no suffix provided
    symbol = ticker if "." in ticker else f"{ticker}.NS"
    
    # Yahoo Finance RSS
    rss_url = f"https://feeds.finance.yahoo.com/rss/2.0/headline?s={symbol}"
    feed = feedparser.parse(rss_url)
    
    articles = []
    total_compound = 0
    
    for entry in feed.entries[:10]: # Get top 10 latest news
        title = entry.title
        link = entry.link
        published = entry.get("published", "")
        
        # Analyze sentiment
        score = analyzer.polarity_scores(title)
        compound = score["compound"]
        total_compound += compound
        
        sentiment_label = "Neutral"
        if compound >= 0.05:
            sentiment_label = "Positive"
        elif compound <= -0.05:
            sentiment_label = "Negative"
            
        articles.append({
            "title": title,
            "link": link,
            "published": published,
            "sentiment_score": round(compound, 2),
            "sentiment_label": sentiment_label
        })
        
    avg_sentiment = total_compound / max(len(articles), 1)
    
    verdict = "Normal"
    if avg_sentiment > 0.3:
        verdict = "Extremely Positive (Potential Hype)"
    elif avg_sentiment < -0.3:
        verdict = "Extremely Negative (Panic)"
        
    return {
        "ticker": ticker,
        "average_sentiment": round(avg_sentiment, 2),
        "verdict": verdict,
        "articles": articles
    }

@router.websocket("/ws/live/{ticker}")
async def live_ticker_stream(websocket: WebSocket, ticker: str):
    await websocket.accept()
    
    symbol = ticker if "." in ticker else f"{ticker}.NS"
    stock = yf.Ticker(symbol)
    
    # Get last known price to baseline our simulation
    try:
        df = stock.history(period="5d")
        last_price = float(df['Close'].iloc[-1])
        avg_volume = float(df['Volume'].mean() / 390) # roughly per minute volume
    except:
        last_price = 100.0
        avg_volume = 1000.0

    current_price = last_price
    
    try:
        while True:
            # Simulate a 1-minute candle every 1 second
            
            # Random walk
            volatility = current_price * 0.002 # 0.2% volatility per tick
            open_price = current_price
            close_price = current_price + random.uniform(-volatility, volatility)
            
            # Simulate a manipulation spike (1% chance every second)
            is_anomaly = False
            anomaly_type = None
            
            spike_chance = random.random()
            if spike_chance > 0.99:
                # Pump
                close_price = open_price * 1.05
                is_anomaly = True
                anomaly_type = "pump"
            elif spike_chance < 0.01:
                # Dump
                close_price = open_price * 0.95
                is_anomaly = True
                anomaly_type = "dump"
                
            high_price = max(open_price, close_price) + random.uniform(0, volatility)
            low_price = min(open_price, close_price) - random.uniform(0, volatility)
            
            # Volume
            tick_volume = avg_volume * random.uniform(0.5, 1.5)
            if is_anomaly:
                tick_volume *= random.uniform(5, 10) # 5x-10x volume spike
                
            current_price = close_price
            
            # Use current time directly for the chart update
            timestamp = int(time.time()) 
            
            payload = {
                "time": timestamp,
                "open": round(open_price, 2),
                "high": round(high_price, 2),
                "low": round(low_price, 2),
                "close": round(close_price, 2),
                "value": round(tick_volume, 0),
                "is_anomaly": is_anomaly,
                "anomaly_type": anomaly_type
            }
            
            await websocket.send_json(payload)
            await asyncio.sleep(1) # Stream every 1 second
            
    except WebSocketDisconnect:
        print(f"Client disconnected from {ticker} stream")
