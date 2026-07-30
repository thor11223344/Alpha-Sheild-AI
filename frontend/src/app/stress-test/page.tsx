"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { TrendingDown, Play, AlertCircle, Trash2, Plus, Info, ChevronDown, ChevronUp, ShieldAlert, ShieldCheck, Shield, Cpu, Zap } from "lucide-react";
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

import { StockSelector } from "@/components/StockSelector";

const HelpTooltip = ({ text }: { text: string }) => (
  <div className="group relative inline-flex items-center ml-1 cursor-help">
    <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10 text-center">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-800"></div>
    </div>
  </div>
);

export default function StressTestPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [showTechDetails, setShowTechDetails] = useState(false);
  
  const [initialValue, setInitialValue] = useState<number>(100000);
  const [modelType, setModelType] = useState<string>("regime_switching");
  const [samplerType, setSamplerType] = useState<string>("sobol");

  const [portfolio, setPortfolio] = useState([
    { ticker: "RELIANCE", name: "Reliance Industries", weight: 40 },
    { ticker: "TCS", name: "Tata Consultancy Services", weight: 40 },
    { ticker: "HDFCBANK", name: "HDFC Bank", weight: 20 }
  ]);

  const handleWeightChange = (index: number, val: string) => {
    const newPort = [...portfolio];
    newPort[index].weight = Number(val);
    setPortfolio(newPort);
    setData(null);
  };

  const handleTickerChange = (index: number, val: string, companyName?: string) => {
    const cleanVal = val.toUpperCase().replace(/\.NS$/i, "");
    const newPort = [...portfolio];
    newPort[index].ticker = cleanVal;
    newPort[index].name = companyName || cleanVal;
    setPortfolio(newPort);
    setData(null);
  };

  const removeRow = (index: number) => {
    setPortfolio(portfolio.filter((_, i) => i !== index));
    setData(null);
  };

  const addRow = () => {
    setPortfolio([...portfolio, { ticker: "", name: "", weight: 0 }]);
    setData(null);
  };

  const totalWeight = portfolio.reduce((sum, item) => sum + item.weight, 0);

  const runSimulation = async () => {
    if (Math.abs(totalWeight - 100) > 1) {
      setError("Total weights must equal exactly 100%");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const payload = {
        tickers: portfolio.map(p => p.ticker.toUpperCase().replace(/\.NS$/i, "")),
        weights: portfolio.map(p => p.weight / 100),
        initial_value: initialValue,
        model_type: modelType,
        sampler_type: samplerType
      };
      
      const response = await axios.post("http://localhost:8000/api/portfolio-stress/", payload);
      setData(response.data);
      setTimeout(() => {
        document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to run simulation.");
    } finally {
      setLoading(false);
    }
  };

  const chartData = data?.simulation?.percentiles.map((p: any, i: number) => {
    const dataPoint = { ...p, p10_p90: [p.p10, p.p90] };
    data?.simulation?.sample_paths?.forEach((path: number[], pathIndex: number) => {
      dataPoint[`path_${pathIndex}`] = path[i];
    });
    return dataPoint;
  });

  const formatCurrency = (val: number) => `₹${Math.round(val).toLocaleString('en-IN')}`;

  const getRiskIcon = (label: string) => {
    if (label.includes("Low")) return <ShieldCheck className="w-8 h-8 text-green-500" />;
    if (label.includes("Moderate")) return <Shield className="w-8 h-8 text-yellow-500" />;
    if (label.includes("Very High")) return <ShieldAlert className="w-8 h-8 text-red-600" />;
    return <ShieldAlert className="w-8 h-8 text-orange-500" />;
  };

  const getRiskColor = (colorStr: string) => {
    switch (colorStr) {
      case 'green': return 'bg-green-100 text-green-800 border-green-200';
      case 'yellow': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'orange': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'red': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-10 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center justify-center p-3 bg-emerald-100 rounded-full mb-4">
          <TrendingDown className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Production Monte Carlo Stress Engine</h1>
        <p className="text-lg text-gray-600">
          Run institutional 10,000-path simulations using Sobol Quasi-Monte Carlo sampling, Merton Jump-Diffusion, and Regime-Switching HMM models.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-12">
        <div className="p-8 bg-gray-50/50 border-b border-gray-100 space-y-6">
          
          {/* Top Controls: Initial Capital, Model Engine & Sampler Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Investment Capital (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500 font-bold">₹</span>
                <input
                  type="text"
                  value={initialValue ? initialValue.toLocaleString('en-IN') : ''}
                  onChange={(e) => {
                    const rawVal = e.target.value.replace(/,/g, '').replace(/\D/g, '');
                    const num = Number(rawVal);
                    setInitialValue(num);
                    setData(null);
                  }}
                  placeholder="1,00,000"
                  className="w-full pl-7 pr-3 py-1.5 border border-gray-200 rounded-lg font-bold text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center">
                <Cpu className="w-3.5 h-3.5 text-blue-500 mr-1" /> Stochastic Model
              </label>
              <select
                value={modelType}
                onChange={(e) => { setModelType(e.target.value); setData(null); }}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg font-semibold text-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="regime_switching">HMM Regime-Switching</option>
                <option value="merton_jump">Merton Jump-Diffusion</option>
                <option value="gbm">Multivariate GBM</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center">
                <Zap className="w-3.5 h-3.5 text-orange-500 mr-1" /> Sampler Engine
              </label>
              <select
                value={samplerType}
                onChange={(e) => { setSamplerType(e.target.value); setData(null); }}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg font-semibold text-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="sobol">Sobol Quasi-Monte Carlo (QMC)</option>
                <option value="antithetic">Antithetic Variates</option>
                <option value="standard">Standard Normal (RNG)</option>
              </select>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm mr-3">1</span>
            Portfolio Allocation & Stock Selection
          </h2>
          
          <div className="space-y-4 max-w-3xl">
            {portfolio.map((item, i) => (
              <div key={i} className="flex gap-4 items-center">
                <div className="flex-1">
                  <StockSelector
                    value={item.ticker}
                    onChange={(sym, name) => handleTickerChange(i, sym, name)}
                    placeholder="Search Stock Symbol or Company Name (e.g., RELIANCE)..."
                    inputClassName="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  />
                </div>
                <div className="w-48">
                  <div className="relative">
                    <input
                      type="number"
                      value={item.weight}
                      onChange={(e) => handleWeightChange(i, e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition pr-8"
                    />
                    <span className="absolute right-4 top-3.5 text-gray-400 font-medium">%</span>
                  </div>
                </div>
                <button 
                  onClick={() => removeRow(i)} 
                  className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                  title="Remove stock"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
            
            <button 
              onClick={addRow} 
              className="py-3 px-4 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium flex items-center transition"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add another stock
            </button>
          </div>
        </div>

        <div className="p-8">
          <div className="flex flex-col md:flex-row justify-between items-center max-w-3xl">
            <div className="mb-4 md:mb-0">
              <h2 className="text-xl font-bold text-gray-800 flex items-center mb-1">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm mr-3">2</span>
                Check your allocation
              </h2>
              <p className="text-gray-500 ml-11 text-sm">Total must equal 100%</p>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="block text-sm text-gray-500">Total Weight</span>
                <span className={`text-2xl font-bold ${totalWeight === 100 ? 'text-green-500' : 'text-red-500'}`}>
                  {totalWeight}%
                </span>
              </div>
              
              <button
                onClick={runSimulation}
                disabled={loading || totalWeight !== 100}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl flex items-center justify-center font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-blue-200"
              >
                {loading ? "Simulating 10,000 futures..." : "Run Stress Test"}
              </button>
            </div>
          </div>
          
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start max-w-3xl">
              <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Results Section */}
      {data && (
        <div id="results-section" className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          
          {/* Executive Summary */}
          <div className={`p-8 rounded-2xl border ${getRiskColor(data.risk_metrics.risk_color)}`}>
            <div className="flex items-start gap-6">
              <div className="bg-white p-4 rounded-full shadow-sm">
                {getRiskIcon(data.risk_metrics.risk_label)}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h3 className="text-3xl font-bold">{data.risk_metrics.risk_label}</h3>
                  <span className="text-xs font-black bg-white/80 border px-3 py-1 rounded-full uppercase tracking-wider">
                    Model: {data.model_metadata?.model_used} | Sampler: {data.model_metadata?.sampler_used}
                  </span>
                </div>
                <p className="text-lg opacity-90 max-w-3xl">
                  Based on current market conditions ({data.regime.name.toLowerCase()}), if you invested <strong>{formatCurrency(data.simulation.initial_value)}</strong> today for 30 days:
                </p>
                
                <ul className="mt-6 space-y-4">
                  <li className="flex items-start">
                    <span className="text-xl mr-3">📉</span>
                    <p className="text-lg">
                      <strong>In a bad month</strong>, you could realistically lose around <strong>{formatCurrency(data.risk_metrics.var_95_value)}</strong>.
                      <HelpTooltip text="This is the Value at Risk (VaR). 95% of the time, your losses will be less than this." />
                    </p>
                  </li>
                  <li className="flex items-start">
                    <span className="text-xl mr-3">🚨</span>
                    <p className="text-lg">
                      <strong>In an extreme crash</strong>, your average loss in the worst 5% of cases would be about <strong>{formatCurrency(data.risk_metrics.cvar_95_value)}</strong>.
                      <HelpTooltip text="This is the Expected Shortfall (CVaR). It measures how bad things get when the VaR threshold is broken." />
                    </p>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Simple Visuals */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Possible Future Outcomes</h3>
                  <p className="text-gray-500 text-sm">Showing the range of possibilities over the next 30 days.</p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span> Expected</span>
                  <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-emerald-100 mr-2"></span> Likely Range</span>
                </div>
              </div>
              
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} dy={10} />
                    <YAxis 
                      domain={['auto', 'auto']} 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#9ca3af'}}
                      tickFormatter={(val) => `₹${(val/1000).toFixed(0)}k`} 
                      dx={-10}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px 16px' }}
                      formatter={(value: any, name?: any) => {
                        const nameStr = String(name || '');
                        if (nameStr.startsWith('path_')) return [null, null];
                        if (Array.isArray(value)) return [`₹${Math.round(value[0]).toLocaleString()} - ₹${Math.round(value[1]).toLocaleString()}`, "Likely Range (10th-90th Percentile)"];
                        if (nameStr === 'p50') return [`₹${Math.round(value).toLocaleString()}`, "Expected Value (Median)"];
                        return [null, null];
                      }} 
                      labelFormatter={(label) => `Day ${label}`}
                    />
                    
                    {/* Background Sample Paths */}
                    {data.simulation.sample_paths?.map((_: any, i: number) => (
                      <Line key={`path_${i}`} type="monotone" dataKey={`path_${i}`} stroke="#9ca3af" strokeWidth={1} opacity={0.1} dot={false} isAnimationActive={false} tooltipType="none" />
                    ))}

                    {/* Confidence Band (P10 to P90) */}
                    <Area 
                      type="monotone" 
                      dataKey="p10_p90" 
                      stroke="none" 
                      fill="#d1fae5" 
                      opacity={0.6}
                    />
                    
                    {/* Median Line */}
                    <Line type="monotone" dataKey="p50" stroke="#10b981" strokeWidth={4} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Chance of Making Money</h3>
                <div className="h-12 w-full bg-red-100 rounded-xl overflow-hidden flex relative">
                  <div 
                    className="h-full bg-green-500 transition-all duration-1000 ease-out flex items-center px-4" 
                    style={{ width: `${100 - data.risk_metrics.prob_loss_0}%` }}
                  >
                    <span className="text-white font-bold">{Math.round(100 - data.risk_metrics.prob_loss_0)}% Profit</span>
                  </div>
                  <div className="absolute right-4 top-0 bottom-0 flex items-center text-red-700 font-bold">
                    {Math.round(data.risk_metrics.prob_loss_0)}% Loss
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-4 text-center">
                  Based on 10,000 simulated futures, you have a <strong>{Math.round(100 - data.risk_metrics.prob_loss_0)}% chance</strong> of ending the 30 days with more than your initial {formatCurrency(data.simulation.initial_value)}.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-2">Severe Loss Risk</h3>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-4xl font-extrabold text-red-500">{data.risk_metrics.prob_loss_20.toFixed(1)}%</span>
                  <span className="text-gray-500 mb-1">chance</span>
                </div>
                <p className="text-sm text-gray-500">
                  Probability of losing more than 20% of your portfolio value in the next 30 days.
                </p>
              </div>
            </div>
          </div>

          {/* Institutional Technical Diagnostics Accordion */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button 
              onClick={() => setShowTechDetails(!showTechDetails)}
              className="w-full px-6 py-4 flex items-center justify-between text-left focus:outline-none hover:bg-gray-50 transition"
            >
              <div className="flex items-center text-gray-800 font-bold">
                <span className="mr-2">🔬</span> Institutional Numerical & Statistical Diagnostics
              </div>
              {showTechDetails ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            
            {showTechDetails && (
              <div className="px-6 pb-6 pt-2 border-t border-gray-100">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-semibold">Stochastic Process</div>
                    <div className="font-bold text-gray-900">{data.model_metadata?.model_used}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-semibold">Sampler Method</div>
                    <div className="font-bold text-blue-600">{data.model_metadata?.sampler_used}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-semibold">Standard Error (SE)</div>
                    <div className="font-bold text-gray-900">₹{data.model_metadata?.standard_error?.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-semibold">95% Mean Confidence Band</div>
                    <div className="font-bold text-green-600">₹{Math.round(data.model_metadata?.ci_95_lower).toLocaleString()} – ₹{Math.round(data.model_metadata?.ci_95_upper).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-semibold">Skewness</div>
                    <div className="font-bold text-gray-900">{data.model_metadata?.skewness?.toFixed(3)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-semibold">Excess Kurtosis</div>
                    <div className="font-bold text-gray-900">{data.model_metadata?.kurtosis?.toFixed(3)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-semibold">Max Drawdown (95%)</div>
                    <div className="font-bold text-red-600">-{data.risk_metrics.max_drawdown_percent_95.toFixed(2)}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-semibold">VaR 99% (Extreme)</div>
                    <div className="font-bold text-red-600">-{formatCurrency(data.risk_metrics.var_99_value)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
        </div>
      )}
    </div>
  );
}
