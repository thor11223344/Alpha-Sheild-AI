"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { 
  Building, 
  Calculator, 
  AlertCircle, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  TrendingUp, 
  DollarSign, 
  FileText, 
  PieChart, 
  Award, 
  AlertTriangle,
  FileCheck,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from "recharts";

interface UpcomingIPO {
  name: string;
  issue_price: number;
  sector: string;
  subscription_retail: number;
  subscription_qib: number;
  subscription_nii: number;
  revenue_growth: number;
  profit_margin: number;
  fresh_issue_percent?: number;
  promoter_holding?: number;
  status: string;
  description: string;
}

export default function IPOPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [upcomingIPOs, setUpcomingIPOs] = useState<UpcomingIPO[]>([]);
  const [selectedIPO, setSelectedIPO] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("memo");
  const [showAdvancedDRHP, setShowAdvancedDRHP] = useState<boolean>(true);

  const [form, setForm] = useState({
    name: "NTPC Green Energy Ltd.",
    issue_price: 108,
    sector: "Green Energy",
    subscription_retail: 14.5,
    subscription_qib: 75.2,
    subscription_nii: 48.0,
    revenue_growth: 42,
    profit_margin: 24,
    fresh_issue_percent: 100,
    promoter_holding: 89,
    business_summary: "Pure-play solar & wind renewable IPP scaling 2.5GW operational capacity with long-term 25-year PPAs.",
    tam_cagr: 22.5,
    ebitda_margin: 88.0,
    roce: 12.5,
    pe_ratio: 32.0,
    debt_to_equity: 0.45,
    risk_summary: "High capital expenditure intensity and regulatory dependency on tariff structures."
  });

  useEffect(() => {
    const fetchUpcomingIPOs = async () => {
      try {
        const res = await axios.get("http://localhost:8000/api/ipo-evaluate/upcoming");
        setUpcomingIPOs(res.data);
        if (res.data.length > 0) {
          handleSelectIPO(res.data[0]);
        }
      } catch (err) {
        console.error("Failed to load upcoming IPOs:", err);
      }
    };
    fetchUpcomingIPOs();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const isText = name === 'name' || name === 'sector' || name === 'business_summary' || name === 'risk_summary';
    setForm({
      ...form,
      [name]: isText ? value : value === '' ? '' : Number(value)
    });
  };

  const runEvaluation = async (ipoFormData: typeof form) => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.post("http://localhost:8000/api/ipo-evaluate/", ipoFormData);
      setData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to evaluate IPO.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectIPO = (ipo: UpcomingIPO) => {
    const updatedForm = {
      ...form,
      name: ipo.name,
      issue_price: ipo.issue_price,
      sector: ipo.sector,
      subscription_retail: ipo.subscription_retail,
      subscription_qib: ipo.subscription_qib,
      subscription_nii: ipo.subscription_nii,
      revenue_growth: ipo.revenue_growth,
      profit_margin: ipo.profit_margin,
      fresh_issue_percent: ipo.fresh_issue_percent || 60,
      promoter_holding: ipo.promoter_holding || 65,
      business_summary: ipo.description || form.business_summary
    };
    setSelectedIPO(ipo.name);
    setForm(updatedForm);
    runEvaluation(updatedForm);
  };

  const evaluateIPO = (e: React.FormEvent) => {
    e.preventDefault();
    runEvaluation(form);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center mb-2 text-gray-900">
          <Building className="w-8 h-8 mr-3 text-orange-500" />
          Institutional IPO Evaluation Engine
        </h1>
        <p className="text-gray-600 max-w-3xl">
          Multi-factor equity research framework scoring IPOs across 9 institutional parameters according to the Official Investment Memo format.
        </p>
      </div>

      {/* Featured Upcoming IPO Selection */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <Sparkles className="w-5 h-5 text-orange-500 mr-2" />
            Active & Upcoming Indian IPOs
          </h2>
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {upcomingIPOs.length} Active Candidates
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {upcomingIPOs.map((ipo) => {
            const isSelected = selectedIPO === ipo.name;
            return (
              <div
                key={ipo.name}
                onClick={() => handleSelectIPO(ipo)}
                className={`p-5 rounded-2xl cursor-pointer transition-all duration-200 border relative ${
                  isSelected
                    ? "bg-orange-50/70 border-orange-500 shadow-md ring-2 ring-orange-400/20"
                    : "bg-white border-gray-200 hover:border-orange-300 hover:shadow-md"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    ipo.status === 'Subscription Open'
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : 'bg-blue-100 text-blue-700 border border-blue-200'
                  }`}>
                    {ipo.status}
                  </span>
                  <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {ipo.sector}
                  </span>
                </div>

                <h3 className="font-bold text-gray-900 text-base mb-1 flex items-center justify-between">
                  <span>{ipo.name}</span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-orange-500 flex-shrink-0 ml-1" />}
                </h3>

                <p className="text-xs text-gray-500 mb-4 line-clamp-2">{ipo.description}</p>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100 text-center">
                  <div>
                    <span className="block text-[10px] text-gray-400 uppercase font-semibold">Issue Price</span>
                    <span className="text-xs font-bold text-gray-800">₹{ipo.issue_price}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-400 uppercase font-semibold">QIB Demand</span>
                    <span className="text-xs font-bold text-orange-600">{ipo.subscription_qib}x</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-400 uppercase font-semibold">Rev Growth</span>
                    <span className="text-xs font-bold text-green-600">+{ipo.revenue_growth}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content: Form & Scorecard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Parameters Column */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-5">
          <div className="flex justify-between items-center pb-3 border-b border-gray-100">
            <div>
              <h3 className="text-xl font-bold text-gray-800">DRHP Prospectus Inputs</h3>
              <p className="text-xs text-gray-500">Official Equity Research Memo Parameters</p>
            </div>
            {selectedIPO && (
              <span className="text-xs text-orange-600 bg-orange-50 border border-orange-200 font-semibold px-2.5 py-0.5 rounded-full">
                {selectedIPO.split(" ")[0]}
              </span>
            )}
          </div>
          
          <form onSubmit={evaluateIPO} className="space-y-4">
            {/* Core General Inputs */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Company Name</label>
                  <input type="text" name="name" value={form.name} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-xs font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Sector</label>
                  <select name="sector" value={form.sector} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none bg-white text-xs font-medium">
                    <option value="Green Energy">Green Energy</option>
                    <option value="Technology">Technology</option>
                    <option value="Finance">Finance</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Consumer">Consumer</option>
                    <option value="Infrastructure">Infrastructure</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Issue Price (₹)</label>
                  <input type="number" name="issue_price" value={form.issue_price} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">3-Yr Revenue CAGR (%)</label>
                  <input type="number" name="revenue_growth" value={form.revenue_growth} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-xs font-semibold" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">PAT Profit Margin (%)</label>
                  <input type="number" name="profit_margin" value={form.profit_margin} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Fresh Issue (%)</label>
                  <input type="number" name="fresh_issue_percent" value={form.fresh_issue_percent} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-xs font-semibold" />
                </div>
              </div>
            </div>

            {/* Official DRHP Advanced Parameters Toggle */}
            <div className="pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowAdvancedDRHP(!showAdvancedDRHP)}
                className="w-full py-2 flex items-center justify-between text-xs font-bold text-orange-600 hover:text-orange-700 focus:outline-none"
              >
                <span className="flex items-center"><FileText className="w-4 h-4 mr-1.5" /> DRHP Official Research Parameters</span>
                {showAdvancedDRHP ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showAdvancedDRHP && (
                <div className="space-y-3 mt-3 pt-3 border-t border-gray-100 animate-in fade-in duration-300">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">DRHP Business Model & Moat Summary</label>
                    <textarea 
                      name="business_summary" 
                      rows={2} 
                      value={form.business_summary} 
                      onChange={handleChange} 
                      placeholder="One-sentence description of business model & moat..." 
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-xs leading-normal" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Industry TAM CAGR (%)</label>
                      <input type="number" name="tam_cagr" value={form.tam_cagr} onChange={handleChange} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">P/E Multiple vs Peers (x)</label>
                      <input type="number" name="pe_ratio" value={form.pe_ratio} onChange={handleChange} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">EBITDA Margin (%)</label>
                      <input type="number" name="ebitda_margin" value={form.ebitda_margin} onChange={handleChange} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">RoCE (%)</label>
                      <input type="number" name="roce" value={form.roce} onChange={handleChange} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Debt to Equity Ratio</label>
                      <input type="number" step="0.01" name="debt_to_equity" value={form.debt_to_equity} onChange={handleChange} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Post-IPO Promoter (%)</label>
                      <input type="number" name="promoter_holding" value={form.promoter_holding} onChange={handleChange} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Primary DRHP Risk Flag</label>
                    <input type="text" name="risk_summary" value={form.risk_summary} onChange={handleChange} placeholder="Main risk factor from prospectus..." className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs" />
                  </div>
                </div>
              )}
            </div>

            {/* Bidding Demand Multipliers */}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100">
              <div className="col-span-3"><h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Demand Multipliers (x)</h4></div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">QIB Multiplier</label>
                <input type="number" step="0.1" name="subscription_qib" value={form.subscription_qib} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">NII Multiplier</label>
                <input type="number" step="0.1" name="subscription_nii" value={form.subscription_nii} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">Retail Multiplier</label>
                <input type="number" step="0.1" name="subscription_retail" value={form.subscription_retail} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3.5 rounded-xl flex items-center justify-center font-bold text-base disabled:opacity-50 transition shadow-md shadow-orange-100"
            >
              {loading ? "Evaluating Custom DRHP..." : <><Calculator className="w-5 h-5 mr-2" /> Evaluate Custom DRHP Memo</>}
            </button>

            {error && (
              <div className="mt-4 text-sm text-red-600 flex items-start">
                <AlertCircle className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}
          </form>
        </div>

        {/* Scorecard & Investment Memo Column */}
        <div className="lg:col-span-7 space-y-6">
          {data ? (
            <>
              {/* Top Scorecard & Recommendation */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                  <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Institutional Rating</span>
                  <h2 className="text-2xl font-black text-gray-900 mb-2">{data.name}</h2>
                  
                  <div className={`px-4 py-1.5 rounded-xl text-sm font-black border uppercase tracking-wider ${data.memo.recommendation_guidance.badge_style}`}>
                    {data.recommendation}
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <span className="block text-xs text-gray-400 font-semibold uppercase">Overall Score</span>
                    <span className="text-4xl font-extrabold text-orange-500">{data.score_100}<span className="text-base text-gray-400 font-normal">/100</span></span>
                  </div>

                  <div className="w-32 h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={data.spider_chart_data}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis dataKey="factor" tick={{ fill: '#9ca3af', fontSize: 9 }} />
                        <Radar dataKey="score" stroke="#f97316" fill="#f97316" fillOpacity={0.5} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Memo Navigation Tabs */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="flex border-b border-gray-200 overflow-x-auto">
                  <button
                    onClick={() => setActiveTab("memo")}
                    className={`px-6 py-3.5 text-sm font-bold flex items-center whitespace-nowrap transition border-b-2 ${
                      activeTab === "memo"
                        ? "border-orange-500 text-orange-600 bg-orange-50/50"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <FileText className="w-4 h-4 mr-2" /> Institutional Investment Memo
                  </button>

                  <button
                    onClick={() => setActiveTab("scorecard")}
                    className={`px-6 py-3.5 text-sm font-bold flex items-center whitespace-nowrap transition border-b-2 ${
                      activeTab === "scorecard"
                        ? "border-orange-500 text-orange-600 bg-orange-50/50"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <PieChart className="w-4 h-4 mr-2" /> 9-Factor Score Breakdown
                  </button>
                </div>

                <div className="p-6">
                  {activeTab === "memo" && (
                    <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
                      {/* Section 1: Executive Summary */}
                      <div className="p-5 bg-gray-50 rounded-xl border border-gray-200">
                        <h4 className="font-bold text-gray-900 text-base mb-2 flex items-center">
                          <Award className="w-4 h-4 text-orange-500 mr-2" /> Executive Summary & Strategy
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-gray-400 font-semibold block">Target Position Size</span>
                            <span className="font-bold text-gray-900">{data.memo.recommendation_guidance.position_size}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 font-semibold block">Entry & Bidding Strategy</span>
                            <span className="font-bold text-gray-900">{data.memo.recommendation_guidance.entry_strategy}</span>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Business Model & Moat */}
                      <div>
                        <h4 className="font-bold text-gray-900 mb-1 flex items-center text-base">
                          <Building className="w-4 h-4 text-blue-500 mr-2" /> 1. Business Model & Moat
                        </h4>
                        <p className="text-gray-600">{data.memo.business_overview_moat.one_liner}</p>
                        <div className="mt-2 text-xs grid grid-cols-2 gap-2 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                          <div><span className="text-gray-500">Positioning:</span> <strong className="text-gray-800">{data.memo.business_overview_moat.industry_positioning}</strong></div>
                          <div><span className="text-gray-500">Moat Rating:</span> <strong className="text-blue-700">{data.memo.business_overview_moat.moat_strength}</strong></div>
                        </div>
                      </div>

                      {/* Section 3: Financial Performance */}
                      <div>
                        <h4 className="font-bold text-gray-900 mb-1 flex items-center text-base">
                          <TrendingUp className="w-4 h-4 text-green-500 mr-2" /> 2. Financial Performance & Quality
                        </h4>
                        <div className="grid grid-cols-3 gap-3 text-xs p-3 bg-green-50/50 rounded-lg border border-green-100">
                          <div><span className="text-gray-500 block">3-Yr Revenue CAGR</span><strong className="text-gray-900">{data.memo.financial_health_quality.revenue_cagr}</strong></div>
                          <div><span className="text-gray-500 block">Profitability</span><strong className="text-green-700">{data.memo.financial_health_quality.profitability_trend}</strong></div>
                          <div><span className="text-gray-500 block">Balance Sheet</span><strong className="text-gray-900">{data.memo.financial_health_quality.balance_sheet}</strong></div>
                        </div>
                      </div>

                      {/* Section 4: Valuation & Peers */}
                      <div>
                        <h4 className="font-bold text-gray-900 mb-1 flex items-center text-base">
                          <DollarSign className="w-4 h-4 text-emerald-600 mr-2" /> 3. Valuation & Peer Benchmarking
                        </h4>
                        <p className="text-xs text-gray-600 mb-2">{data.memo.valuation_analysis.peer_comparison}</p>
                        <div className="text-xs p-3 bg-emerald-50/50 rounded-lg border border-emerald-100 flex justify-between items-center">
                          <span>Issue Price: <strong>{data.memo.valuation_analysis.issue_price}</strong></span>
                          <span className="font-bold text-emerald-800 uppercase">Verdict: {data.memo.valuation_analysis.valuation_verdict}</span>
                        </div>
                      </div>

                      {/* Section 5: Objects of Proceeds */}
                      <div>
                        <h4 className="font-bold text-gray-900 mb-1 flex items-center text-base">
                          <PieChart className="w-4 h-4 text-purple-500 mr-2" /> 4. Objects of the Issue (Proceeds Use)
                        </h4>
                        <p className="text-xs text-gray-600">{data.memo.objects_of_issue.capital_use_purpose}</p>
                        <div className="mt-2 text-xs p-3 bg-purple-50/50 rounded-lg border border-purple-100 flex justify-between items-center">
                          <span>Structure: <strong>{data.memo.objects_of_issue.fresh_issue_share}</strong></span>
                          <span className="font-bold text-purple-800">{data.memo.objects_of_issue.capital_use_rating}</span>
                        </div>
                      </div>

                      {/* Section 6: Key Risks */}
                      <div>
                        <h4 className="font-bold text-gray-900 mb-2 flex items-center text-base">
                          <AlertTriangle className="w-4 h-4 text-red-500 mr-2" /> 5. Key Risks & Bear Case
                        </h4>
                        <ul className="space-y-1.5 text-xs">
                          {data.memo.key_risks.map((risk: string, idx: number) => (
                            <li key={idx} className="flex items-start text-red-700 bg-red-50/60 p-2.5 rounded-lg border border-red-100">
                              <AlertCircle className="w-3.5 h-3.5 mr-2 mt-0.5 flex-shrink-0" />
                              {risk}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {activeTab === "scorecard" && (
                    <div className="space-y-3">
                      <h4 className="font-bold text-gray-900 text-sm mb-3">9-Factor Weighted Scorecard Matrix</h4>
                      {data.scorecard.map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                          <div className="flex-1">
                            <span className="font-bold text-gray-800 block">{item.factor}</span>
                            <span className="text-[10px] text-gray-400">Weight: {(item.weight * 100).toFixed(0)}%</span>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-orange-500" style={{ width: `${(item.score / 5) * 100}%` }} />
                            </div>
                            <span className="font-bold text-gray-900 w-8 text-right">{item.score}/5</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center text-gray-400 space-y-4">
              <FileCheck className="w-12 h-12 mx-auto text-gray-300" />
              <p>Select an upcoming IPO or fill out custom DRHP inputs to generate the Official Investment Memo.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
