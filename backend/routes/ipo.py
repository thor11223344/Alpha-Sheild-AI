from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

class IPOInput(BaseModel):
    name: str
    issue_price: float
    sector: str
    subscription_retail: float
    subscription_qib: float
    subscription_nii: float
    revenue_growth: float  # Percentage
    profit_margin: float   # Percentage

@router.post("/")
def evaluate_ipo(ipo: IPOInput):
    try:
        # Rule-based scoring (Max 100)
        # 1. Demand Score (Max 30)
        demand_score = 0
        if ipo.subscription_qib > 50:
            demand_score += 15
        elif ipo.subscription_qib > 10:
            demand_score += 10
            
        if ipo.subscription_nii > 50:
            demand_score += 10
        elif ipo.subscription_nii > 10:
            demand_score += 5
            
        if ipo.subscription_retail > 10:
            demand_score += 5
        elif ipo.subscription_retail > 2:
            demand_score += 2
            
        # 2. Financial Health (Max 40)
        financial_score = 0
        if ipo.revenue_growth > 30:
            financial_score += 20
        elif ipo.revenue_growth > 15:
            financial_score += 10
        elif ipo.revenue_growth > 0:
            financial_score += 5
            
        if ipo.profit_margin > 20:
            financial_score += 20
        elif ipo.profit_margin > 10:
            financial_score += 15
        elif ipo.profit_margin > 0:
            financial_score += 5
            
        # 3. Valuation / Sector (Max 30) - Simulating with a basic heuristic based on issue price
        # In reality, this would use P/E against sector peers. We'll use a simplified heuristic.
        valuation_score = 15 # baseline
        if ipo.issue_price < 500 and ipo.profit_margin > 10:
            valuation_score += 10
        
        # Sector bonus
        hot_sectors = ["Technology", "AI", "Green Energy", "Defense", "Healthcare"]
        if any(hot in ipo.sector for hot in hot_sectors):
            valuation_score += 5
            
        total_score = demand_score + financial_score + valuation_score
        
        verdict = "Neutral"
        if total_score > 75:
            verdict = "Highly Attractive"
        elif total_score > 60:
            verdict = "Attractive"
        elif total_score < 40:
            verdict = "Avoid"
            
        return {
            "name": ipo.name,
            "total_score": total_score,
            "verdict": verdict,
            "breakdown": {
                "Demand": demand_score,
                "Financials": financial_score,
                "Valuation_Sector": valuation_score,
                # Add dummy values for the radar chart to look balanced
                "Risk": 100 - total_score, 
                "Momentum": min(100, demand_score * 3.3)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
