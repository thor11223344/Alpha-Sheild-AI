"use client";

import { useState } from "react";
import axios from "axios";
import { TrendingDown, Play, AlertCircle, Trash2, Plus } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Area
} from "recharts";

export default function StressTestPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  
  const [portfolio, setPortfolio] = useState([
    { ticker: "RELIANCE", weight: 40 },
    { ticker: "TCS", weight: 40 },
    { ticker: "HDFCBANK", weight: 20 }
  ]);

  const handleWeightChange = (index: number, val: string) => {
    const newPort = [...portfolio];
    newPort[index].weight = Number(val);
    setPortfolio(newPort);
  };

  const handleTickerChange = (index: number, val: string) => {
    const newPort = [...portfolio];
    newPort[index].ticker = val.toUpperCase();
    setPortfolio(newPort);
  };

  const removeRow = (index: number) => {
    setPortfolio(portfolio.filter((_, i) => i !== index));
  };

  const addRow = () => {
    setPortfolio([...portfolio, { ticker: "", weight: 0 }]);
  };

  const runSimulation = async () => {
    const totalWeight = portfolio.reduce((sum, item) => sum + item.weight, 0);
    if (Math.abs(totalWeight - 100) > 1) {
      setError("Total weights must equal exactly 100%");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const payload = {
        tickers: portfolio.map(p => p.ticker),
        weights: portfolio.map(p => p.weight / 100) // convert to decimals
      };
      
      const response = await axios.post("http://localhost:8000/api/portfolio-stress/", payload);
      setData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to run simulation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center mb-2">
          <TrendingDown className="w-8 h-8 mr-3 text-emerald-500" />
          Regime-Aware Portfolio Stress Tester
        </h1>
        <p className="text-gray-600">Simulate portfolio performance under current market regimes (Bull/Bear) using Monte Carlo.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Input Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold mb-4">Portfolio Allocation</h3>
            
            {portfolio.map((item, i) => (
              <div key={i} className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={item.ticker}
                  onChange={(e) => handleTickerChange(i, e.target.value)}
                  placeholder="Ticker"
                  className="flex-1 px-3 py-2 border rounded-md text-sm"
                />
                <div className="relative w-24">
                  <input
                    type="number"
                    value={item.weight}
                    onChange={(e) => handleWeightChange(i, e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm pr-6"
                  />
                  <span className="absolute right-3 top-2.5 text-gray-400 text-sm">%</span>
                </div>
                <button onClick={() => removeRow(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-md">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            
            <button onClick={addRow} className="w-full py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-500 hover:border-gray-400 hover:text-gray-700 flex items-center justify-center text-sm font-medium mb-4">
              <Plus className="w-4 h-4 mr-2" /> Add Asset
            </button>
            
            <div className="flex justify-between items-center text-sm mb-6 pb-4 border-b">
              <span className="font-medium text-gray-600">Total Weight:</span>
              <span className={`font-bold ${portfolio.reduce((sum, item) => sum + item.weight, 0) === 100 ? 'text-green-600' : 'text-red-500'}`}>
                {portfolio.reduce((sum, item) => sum + item.weight, 0)}%
              </span>
            </div>
            
            <button
              onClick={runSimulation}
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg flex items-center justify-center font-medium disabled:opacity-50 transition"
            >
              {loading ? "Simulating..." : <><Play className="w-4 h-4 mr-2" /> Run Monte Carlo</>}
            </button>
            
            {error && (
              <div className="mt-4 text-sm text-red-600 flex items-start">
                <AlertCircle className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-2 space-y-6">
          {data ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Detected Regime</h4>
                  <p className="text-xl font-bold text-emerald-600">{data.regime.name}</p>
                  <p className="text-xs text-gray-500 mt-2">Based on Nifty 50 HMM</p>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Est. Max Drawdown</h4>
                  <p className="text-2xl font-bold text-red-500">{data.risk_metrics.max_drawdown_percent.toFixed(2)}%</p>
                  <p className="text-xs text-gray-500 mt-2">Over 30 days</p>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">VaR (95%)</h4>
                  <p className="text-2xl font-bold text-orange-500">₹{Math.round(data.simulation.initial_value - data.risk_metrics.var_95_value).toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-2">Potential Loss Value</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold mb-1">30-Day Simulation Fan Chart</h3>
                <p className="text-sm text-gray-500 mb-6">Showing 10th, 50th, and 90th percentiles of 500 simulated paths.</p>
                
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data.simulation.percentiles}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="day" label={{ value: 'Days', position: 'insideBottom', offset: -5 }} />
                      <YAxis domain={['auto', 'auto']} tickFormatter={(val) => `₹${(val/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => `₹${Math.round(value).toLocaleString()}`} />
                      
                      {/* P90 to P10 Band */}
                      <Area 
                        type="monotone" 
                        dataKey="p90" 
                        stroke="none" 
                        fill="#d1fae5" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="p10" 
                        stroke="none" 
                        fill="#fff" // Hack to create a band by drawing white over the bottom part
                      />
                      
                      {/* Median Line */}
                      <Line type="monotone" dataKey="p50" stroke="#10b981" strokeWidth={3} dot={false} />
                      <Line type="monotone" dataKey="p10" stroke="#ef4444" strokeWidth={1} strokeDasharray="5 5" dot={false} />
                      <Line type="monotone" dataKey="p90" stroke="#3b82f6" strokeWidth={1} strokeDasharray="5 5" dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-gray-50 border border-gray-200 border-dashed rounded-xl h-full min-h-[400px] flex items-center justify-center">
              <div className="text-center">
                <TrendingDown className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Configure portfolio and run simulation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
