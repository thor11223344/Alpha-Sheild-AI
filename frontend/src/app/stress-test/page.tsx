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
  <span className="group relative inline-flex items-center ml-1.5 cursor-help">
    <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-52 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-20 text-center font-normal leading-tight">
      {text}
      <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 block"></span>
    </span>
  </span>
);

export default function StressTestPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  
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
    <div className="p-8 max-w-6xl mx-auto space-y-10">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center justify-center p-3 bg-emerald-100 rounded-full mb-3">
          <TrendingDown className="w-7 h-7 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Portfolio Stress Engine</h1>
        <p className="text-base text-gray-600">
          Simulates 10,000 portfolio futures over 30 days to measure Value at Risk (VaR), Expected Shortfall, and crash drawdowns.
        </p>
      </div>

      {/* Main Parameters Box */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 bg-gray-50/60 border-b border-gray-200 space-y-6">
          
          {/* Simulation Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
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
                <HelpTooltip text="HMM detects Bull/Bear regimes. Merton captures price jumps. GBM assumes continuous returns." />
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
                <HelpTooltip text="Sobol QMC ensures uniform random space coverage for faster numerical convergence." />
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

          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-600 text-xs font-bold mr-2.5">1</span>
            Stock Allocation & Weights
          </h2>
          
          <div className="space-y-3 max-w-3xl">
            {portfolio.map((item, i) => (
              <div key={i} className="flex gap-3 items-center">
                <div className="flex-1">
                  <StockSelector
                    value={item.ticker}
                    onChange={(sym, name) => handleTickerChange(i, sym, name)}
                    placeholder="Search Stock Symbol or Name (e.g. RELIANCE)..."
                    inputClassName="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
                <div className="w-40">
                  <div className="relative">
                    <input
                      type="number"
                      value={item.weight}
                      onChange={(e) => handleWeightChange(i, e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-8 text-sm font-semibold"
                    />
                    <span className="absolute right-3.5 top-2.5 text-gray-400 text-xs font-bold">%</span>
                  </div>
                </div>
                <button 
                  onClick={() => removeRow(i)} 
                  className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                  title="Remove stock"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            
            <button 
              onClick={addRow} 
              className="py-2 px-3 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-bold flex items-center transition"
            >
              <Plus className="w-4 h-4 mr-1" /> Add Stock
            </button>
          </div>
        </div>

        <div className="p-6 flex flex-col md:flex-row justify-between items-center max-w-3xl gap-4">
          <div>
            <h2 className="text-base font-bold text-gray-800 flex items-center mb-0.5">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold mr-2">2</span>
              Allocation Check
            </h2>
            <p className="text-gray-500 ml-8 text-xs font-medium">Weights must total 100%</p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right">
              <span className="block text-xs text-gray-500 font-semibold">Total Weight</span>
              <span className={`text-xl font-black ${totalWeight === 100 ? 'text-green-600' : 'text-red-500'}`}>
                {totalWeight}%
              </span>
            </div>
            
            <button
              onClick={runSimulation}
              disabled={loading || totalWeight !== 100}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl flex items-center justify-center font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md shadow-blue-200"
            >
              {loading ? "Running 10,000 Paths..." : "Run Stress Test"}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start text-xs max-w-3xl">
              <AlertCircle className="w-4 h-4 mr-1.5 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Results Section */}
      {data && (
        <div id="results-section" className="space-y-8 animate-in fade-in duration-500">
          
          {/* Crisp Executive Risk Summary */}
          <div className={`p-6 rounded-2xl border ${getRiskColor(data.risk_metrics.risk_color)}`}>
            <div className="flex items-start gap-5">
              <div className="bg-white p-3.5 rounded-full shadow-sm">
                {getRiskIcon(data.risk_metrics.risk_label)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap justify-between">
                  <h3 className="text-2xl font-black">{data.risk_metrics.risk_label}</h3>
                  <span className="text-[11px] font-bold bg-white/90 border px-3 py-1 rounded-full uppercase tracking-wider text-gray-700">
                    {data.model_metadata?.model_used} • {data.model_metadata?.sampler_used}
                  </span>
                </div>

                <p className="text-sm font-semibold opacity-90 mb-4">
                  30-Day Risk Summary for <strong>{formatCurrency(data.simulation.initial_value)}</strong> Capital (Market State: <strong>{data.regime.name}</strong>):
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/80 p-4 rounded-xl border border-black/5">
                    <span className="text-xs text-gray-500 uppercase font-bold tracking-wider block mb-1">📉 Bad Month Loss (VaR 95%)</span>
                    <span className="text-xl font-extrabold text-gray-900">{formatCurrency(data.risk_metrics.var_95_value)}</span>
                    <p className="text-[11px] text-gray-600 mt-1 leading-tight">
                      Maximum expected loss in 95% of normal trading conditions over 30 days.
                    </p>
                  </div>

                  <div className="bg-white/80 p-4 rounded-xl border border-black/5">
                    <span className="text-xs text-gray-500 uppercase font-bold tracking-wider block mb-1">🚨 Extreme Crash Loss (CVaR 95%)</span>
                    <span className="text-xl font-extrabold text-red-700">{formatCurrency(data.risk_metrics.cvar_95_value)}</span>
                    <p className="text-[11px] text-gray-600 mt-1 leading-tight">
                      Average expected loss during the worst 5% tail-risk crash events.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Outcomes Chart & Probability Indicators */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <div>
                  <h3 className="text-base font-bold text-gray-800">Projected 30-Day Outcomes</h3>
                  <p className="text-xs text-gray-500">10,000 simulated path distribution trajectory</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <span className="flex items-center text-green-600"><span className="w-3 h-0.5 bg-green-500 inline-block mr-1.5"></span> Median Path</span>
                  <span className="flex items-center text-emerald-700"><span className="w-3 h-3 bg-emerald-100 inline-block mr-1.5 rounded-sm"></span> Likely Range (10th-90th)</span>
                </div>
              </div>
              
              <div className="h-[380px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} dy={10} />
                    <YAxis 
                      domain={['auto', 'auto']} 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#64748b', fontSize: 11}}
                      tickFormatter={(val) => `₹${(val/1000).toFixed(0)}k`} 
                      dx={-5}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: any, name?: any) => {
                        const nameStr = String(name || '');
                        if (nameStr.startsWith('path_')) return [null, null];
                        if (Array.isArray(value)) return [`₹${Math.round(value[0]).toLocaleString()} - ₹${Math.round(value[1]).toLocaleString()}`, "10th - 90th Percentile"];
                        if (nameStr === 'p50') return [`₹${Math.round(value).toLocaleString()}`, "Median Outcome"];
                        return [null, null];
                      }} 
                      labelFormatter={(label) => `Day ${label}`}
                    />
                    
                    {data.simulation.sample_paths?.map((_: any, i: number) => (
                      <Line key={`path_${i}`} type="monotone" dataKey={`path_${i}`} stroke="#9ca3af" strokeWidth={1} opacity={0.08} dot={false} isAnimationActive={false} tooltipType="none" />
                    ))}

                    <Area 
                      type="monotone" 
                      dataKey="p10_p90" 
                      stroke="none" 
                      fill="#d1fae5" 
                      opacity={0.6}
                    />
                    
                    <Line type="monotone" dataKey="p50" stroke="#10b981" strokeWidth={3} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-3">
                <h3 className="text-base font-bold text-gray-800">Probability of Profit</h3>
                <div className="h-10 w-full bg-red-100 rounded-xl overflow-hidden flex relative">
                  <div 
                    className="h-full bg-green-500 transition-all duration-1000 flex items-center px-3" 
                    style={{ width: `${100 - data.risk_metrics.prob_loss_0}%` }}
                  >
                    <span className="text-white text-xs font-extrabold">{Math.round(100 - data.risk_metrics.prob_loss_0)}% Profit</span>
                  </div>
                  <div className="absolute right-3 top-0 bottom-0 flex items-center text-red-700 text-xs font-extrabold">
                    {Math.round(data.risk_metrics.prob_loss_0)}% Loss
                  </div>
                </div>
                <p className="text-xs text-gray-500 leading-normal">
                  <strong>{Math.round(100 - data.risk_metrics.prob_loss_0)}%</strong> of 10,000 simulated futures finish above principal capital {formatCurrency(data.simulation.initial_value)}.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h3 className="text-base font-bold text-gray-800 mb-1 flex items-center">
                  Risk of Big Drop (20%+ Fall)
                  <HelpTooltip text="Probability of experiencing a severe portfolio crash of 20% or more over 30 days." />
                </h3>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-black text-red-600">{data.risk_metrics.prob_loss_20.toFixed(1)}%</span>
                  <span className="text-xs text-gray-500 font-semibold">chance of 20%+ crash</span>
                </div>

                <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                  {data.risk_metrics.prob_loss_20 < 1 ? (
                    <span><strong>Very Low Risk:</strong> Less than 1 in 100 chance of losing 20% or more of your capital over 30 days.</span>
                  ) : data.risk_metrics.prob_loss_20 < 5 ? (
                    <span><strong>Moderate Risk:</strong> About a {Math.round(100 / (data.risk_metrics.prob_loss_20 || 1))} in 100 chance of losing 20% or more over 30 days.</span>
                  ) : (
                    <span><strong>High Risk:</strong> Significant chance of experiencing a 20%+ drawdown over 30 days.</span>
                  )}
                </p>
                
                <div className="space-y-2 pt-2 border-t border-gray-100 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 flex items-center">
                      <span className="w-2 h-2 rounded-full bg-gray-400 mr-1.5"></span> Any Loss:
                      <HelpTooltip text="Probability of finishing the 30-day period below your initial capital." />
                    </span>
                    <span className="font-bold text-gray-800">{data.risk_metrics.prob_loss_0.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 flex items-center">
                      <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5"></span> 10%+ Moderate Drop:
                      <HelpTooltip text="Probability of suffering a portfolio value decline of 10% or more." />
                    </span>
                    <span className="font-bold text-amber-600">{data.risk_metrics.prob_loss_10.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 flex items-center">
                      <span className="w-2 h-2 rounded-full bg-red-600 mr-1.5"></span> 20%+ Big Crash:
                      <HelpTooltip text="Probability of suffering a severe portfolio value decline of 20% or more." />
                    </span>
                    <span className="font-bold text-red-600">{data.risk_metrics.prob_loss_20.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Technical Diagnostics Card (Always Visible) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center text-gray-800 text-sm font-bold mb-4 pb-3 border-b border-gray-100">
              <span className="mr-2">🔬</span> Technical Numerical Diagnostics
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs">
              <div>
                <span className="text-gray-500 uppercase font-semibold flex items-center mb-0.5">
                  Stochastic Process
                  <HelpTooltip text="The mathematical model simulating how stock prices move over time." />
                </span>
                <span className="font-bold text-gray-900">{data.model_metadata?.model_used}</span>
              </div>

              <div>
                <span className="text-gray-500 uppercase font-semibold flex items-center mb-0.5">
                  Sampler Method
                  <HelpTooltip text="The sampling technique used for path shocks (e.g. Sobol QMC)." />
                </span>
                <span className="font-bold text-blue-600">{data.model_metadata?.sampler_used}</span>
              </div>

              <div>
                <span className="text-gray-500 uppercase font-semibold flex items-center mb-0.5">
                  Standard Error (SE)
                  <HelpTooltip text="Measures simulation accuracy. A smaller SE means the estimated mean is more precise." />
                </span>
                <span className="font-bold text-gray-900">₹{data.model_metadata?.standard_error?.toFixed(2)}</span>
              </div>

              <div>
                <span className="text-gray-500 uppercase font-semibold flex items-center mb-0.5">
                  95% Mean Band
                  <HelpTooltip text="The range where the true portfolio average value is 95% guaranteed to fall." />
                </span>
                <span className="font-bold text-green-600">₹{Math.round(data.model_metadata?.ci_95_lower).toLocaleString()} – ₹{Math.round(data.model_metadata?.ci_95_upper).toLocaleString()}</span>
              </div>

              <div>
                <span className="text-gray-500 uppercase font-semibold flex items-center mb-0.5">
                  Skewness
                  <HelpTooltip text="Measures return asymmetry. Negative values mean higher risk of large unexpected drops." />
                </span>
                <span className="font-bold text-gray-900">{data.model_metadata?.skewness?.toFixed(3)}</span>
              </div>

              <div>
                <span className="text-gray-500 uppercase font-semibold flex items-center mb-0.5">
                  Excess Kurtosis
                  <HelpTooltip text="Measures tail-risk. Higher values mean market crashes happen more frequently than normal." />
                </span>
                <span className="font-bold text-gray-900">{data.model_metadata?.kurtosis?.toFixed(3)}</span>
              </div>

              <div>
                <span className="text-gray-500 uppercase font-semibold flex items-center mb-0.5">
                  Max Drawdown (95%)
                  <HelpTooltip text="The peak-to-trough loss experienced by 95% of simulated portfolio paths." />
                </span>
                <span className="font-bold text-red-600">-{data.risk_metrics.max_drawdown_percent_95.toFixed(2)}%</span>
              </div>

              <div>
                <span className="text-gray-500 uppercase font-semibold flex items-center mb-0.5">
                  VaR 99% (Extreme)
                  <HelpTooltip text="Extreme Value at Risk. 99% of the time, 30-day losses will be less than this." />
                </span>
                <span className="font-bold text-red-600">-{formatCurrency(data.risk_metrics.var_99_value)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
