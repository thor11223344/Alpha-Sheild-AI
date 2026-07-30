import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta

def get_nse_data(ticker: str, period: str = "1y") -> pd.DataFrame:
    """
    Fetch historical data for an NSE stock.
    Appends '.NS' to the ticker to query Yahoo Finance for Indian stocks.
    """
    nse_ticker = f"{ticker.upper()}.NS"
    stock = yf.Ticker(nse_ticker)
    
    # Fetch historical data
    hist = stock.history(period=period)
    
    if hist.empty:
        raise ValueError(f"No data found for ticker {ticker}. Please ensure it is a valid NSE symbol.")
        
    # Reset index to make Date a column instead of an index for easier JSON serialization
    hist = hist.reset_index()
    
    # Optional: Basic data cleaning
    hist = hist.dropna(subset=['Close', 'Volume'])
    
    return hist

def calculate_z_scores(df: pd.DataFrame, window: int = 30) -> pd.DataFrame:
    """
    Calculate rolling Z-scores for Volume and Daily Returns.
    """
    df = df.copy()
    
    # Calculate daily returns
    df['Return'] = df['Close'].pct_change()
    
    # Calculate rolling statistics
    df['Vol_Mean'] = df['Volume'].rolling(window=window).mean()
    df['Vol_Std'] = df['Volume'].rolling(window=window).std()
    
    df['Ret_Mean'] = df['Return'].rolling(window=window).mean()
    df['Ret_Std'] = df['Return'].rolling(window=window).std()
    
    # Calculate Z-scores
    df['Vol_Z'] = (df['Volume'] - df['Vol_Mean']) / df['Vol_Std']
    df['Ret_Z'] = (df['Return'] - df['Ret_Mean']) / df['Ret_Std']
    
    # Volatility (standard deviation of returns)
    df['Volatility'] = df['Ret_Std']
    
    return df
