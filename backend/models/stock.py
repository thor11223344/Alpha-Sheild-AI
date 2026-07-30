from sqlalchemy import Column, String
from models.database import Base

class Stock(Base):
    __tablename__ = "stocks"

    symbol = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
