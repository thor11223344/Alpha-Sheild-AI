import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Search } from "lucide-react";

interface Stock {
  symbol: string;
  name: string;
}

interface StockSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function StockSelector({ value, onChange, placeholder = "Search NSE Ticker...", className = "" }: StockSelectorProps) {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        setLoading(true);
        const res = await axios.get("http://localhost:8000/api/stocks/");
        setStocks(res.data);
      } catch (err) {
        console.error("Failed to load stocks:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStocks();
  }, []);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredStocks = query === "" 
    ? stocks.slice(0, 50) 
    : stocks.filter(stock => 
        stock.symbol.toLowerCase().includes(query.toLowerCase()) || 
        stock.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 50);

  return (
    <div ref={wrapperRef} className={`relative flex-1 ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            onChange(e.target.value); // Optimistically set it in parent as well
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={loading ? "Loading stocks..." : placeholder}
          className="w-full px-4 py-2 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
          disabled={loading}
        />
        <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
      </div>

      {isOpen && stocks.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredStocks.length === 0 ? (
            <div className="p-3 text-sm text-gray-500 text-center">No stocks found.</div>
          ) : (
            filteredStocks.map((stock) => (
              <div
                key={stock.symbol}
                onClick={() => {
                  onChange(stock.symbol);
                  setQuery(stock.symbol);
                  setIsOpen(false);
                }}
                className="px-4 py-2 hover:bg-gray-50 cursor-pointer flex justify-between items-center border-b last:border-b-0"
              >
                <span className="font-bold text-sm text-gray-800">{stock.symbol}</span>
                <span className="text-xs text-gray-500 truncate max-w-[60%] text-right">{stock.name}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
