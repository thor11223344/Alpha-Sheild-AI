from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models.database import get_db
from models.stock import Stock

router = APIRouter()

@router.get("/")
def get_all_stocks(db: Session = Depends(get_db)):
    stocks = db.query(Stock).order_by(Stock.symbol).all()
    return [{"symbol": s.symbol, "name": s.name} for s in stocks]
