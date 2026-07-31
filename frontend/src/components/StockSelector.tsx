import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Search } from "lucide-react";

interface Stock {
  symbol: string;
  name: string;
}

interface StockSelectorProps {
  value: string;
  onChange: (symbol: string, name?: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

export function StockSelector({ 
  value, 
  onChange, 
  placeholder = "Search NSE Ticker or Company Name...", 
  className = "",
  inputClassName = "w-full px-4 py-2 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
}: StockSelectorProps) {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        setLoading(true);
        const res = await axios.get("http://127.0.0.1:8000/api/stocks/");
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
            const val = e.target.value.toUpperCase().replace(/\.NS$/i, "");
            setQuery(val);
            setIsOpen(true);
            const match = stocks.find(s => s.symbol.toUpperCase() === val);
            onChange(val, match?.name);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={loading ? "Loading stock directory..." : placeholder}
          className={inputClassName}
          disabled={loading}
        />
        <Search className="w-4 h-4 absolute left-3 top-3.5 text-gray-400 pointer-events-none" />
      </div>

      {isOpen && stocks.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto left-0">
          {filteredStocks.length === 0 ? (
            <div className="p-3 text-sm text-gray-500 text-center">No stocks found matching "{query}"</div>
          ) : (
            filteredStocks.map((stock) => {
              const cleanSymbol = stock.symbol.toUpperCase().replace(/\.NS$/i, "");
              return (
                <div
                  key={stock.symbol}
                  onClick={() => {
                    onChange(cleanSymbol, stock.name);
                    setQuery(cleanSymbol);
                    setIsOpen(false);
                  }}
                  className="px-4 py-2.5 hover:bg-sky-50 cursor-pointer flex justify-between items-center border-b border-gray-100 last:border-b-0 transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-gray-900">{cleanSymbol}</span>
                    <span className="text-xs text-gray-500 truncate max-w-xs">{stock.name}</span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-600 rounded">NSE</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
