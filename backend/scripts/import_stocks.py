import csv
import sys
import os

# Add parent directory to path so we can import from models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.database import SessionLocal, engine, Base
from models.stock import Stock

def import_nse_stocks():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    
    file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "nse_all.csv")
    print(f"Reading from local CSV file: {file_path}")
    
    db = SessionLocal()
    try:
        print("Clearing existing stocks...")
        db.query(Stock).delete()
        
        print("Importing stocks...")
        count = 0
        
        with open(file_path, 'r', encoding='utf-16le') as f:
            reader = csv.reader(f)
            header = next(reader)
            
            for row in reader:
                if not row or len(row) < 2:
                    continue
                symbol = row[0].strip()
                name = row[1].strip()
                # Remove BOM from symbol if present
                if symbol.startswith('\ufeff'):
                    symbol = symbol.replace('\ufeff', '')
                
                stock = Stock(symbol=symbol, name=name)
                db.add(stock)
                count += 1
                
        db.commit()
        print(f"Successfully imported {count} stocks!")
    except Exception as e:
        db.rollback()
        print(f"Error importing stocks: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    import_nse_stocks()
