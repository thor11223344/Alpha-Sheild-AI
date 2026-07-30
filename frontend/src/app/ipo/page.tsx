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
  FileCheck
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
    promoter_holding: 89
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: name === 'name' || name === 'sector' ? value : Number(value)
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
      name: ipo.name,
      issue_price: ipo.issue_price,
      sector: ipo.sector,
      subscription_retail: ipo.subscription_retail,
      subscription_qib: ipo.subscription_qib,
      subscription_nii: ipo.subscription_nii,
      revenue_growth: ipo.revenue_growth,
      profit_margin: ipo.profit_margin,
      fresh_issue_percent: ipo.fresh_issue_percent || 60,
      promoter_holding: ipo.promoter_holding || 65
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
          Multi-factor equity research evaluation framework scoring IPOs across 9 institutional parameters to produce a professional investment memo.
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
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-800">DRHP & Evaluation Inputs</h3>
            {selectedIPO && (
              <span className="text-xs text-orange-600 bg-orange-50 border border-orange-200 font-semibold px-2.5 py-0.5 rounded-full">
                Active: {selectedIPO.split(" ")[0]}
              </span>
            )}
          </div>
          
          <form onSubmit={evaluateIPO} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Company Name</label>
                <input type="text" name="name" value={form.name} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-sm font-medium" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Sector</label>
                <select name="sector" value={form.sector} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none bg-white text-sm font-medium">
                  <option value="Green Energy">Green Energy</option>
                  <option value="Technology">Technology</option>
                  <option value="Finance">Finance</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Consumer">Consumer</option>
                  <option value="Infrastructure">Infrastructure</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Issue Price (₹)</label>
                <input type="number" name="issue_price" value={form.issue_price} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm font-medium" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Revenue Growth (%)</label>
                <input type="number" name="revenue_growth" value={form.revenue_growth} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm font-medium" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Profit Margin (%)</label>
                <input type="number" name="profit_margin" value={form.profit_margin} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm font-medium" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Fresh Issue (% Share)</label>
                <input type="number" name="fresh_issue_percent" value={form.fresh_issue_percent} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm font-medium" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
              <div className="col-span-3"><h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Bidding Demand Multiplier (x)</h4></div>
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
              {loading ? "Generating Investment Memo..." : <><Calculator className="w-5 h-5 mr-2" /> Generate Investment Memo</>}
            </button>

            {error && (
              <div className="mt-4 text-sm text-red-600 flex items-start">
                <AlertCircle className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}
          </form>
        </div>

        {/* Scorecard Column */}
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

                  <p className="text-xs text-gray-500 mt-2 font-medium">
                    {data.category}
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center bg-gray-50 p-4 rounded-2xl border border-gray-100 min-w-[160px]">
                  <span className="text-[11px] font-bold text-gray-400 uppercase mb-1">Weighted Score</span>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-black text-gray-900">{data.total_score}</span>
                    <span className="text-xs text-gray-400 font-bold ml-1">/ 100</span>
                  </div>
                  <span className="text-[11px] text-gray-500 font-semibold mt-1">
                    ({data.weighted_score_5} / 5.0 Scale)
                  </span>
                </div>
              </div>

              {/* 9-Factor Radar Chart */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center">
                  <PieChart className="w-4 h-4 text-orange-500 mr-2" />
                  9-Factor Quantitative Score Breakdown
                </h3>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data.chartData}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis dataKey="subject" tick={{fill: '#4b5563', fontSize: 11, fontWeight: 600}} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Radar name="Factor Score (1-5)" dataKey="A" stroke="#f97316" fill="#f97316" fillOpacity={0.35} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-gray-50 border border-gray-200 border-dashed rounded-2xl h-full flex items-center justify-center min-h-[400px]">
              <div className="text-center p-6">
                <Building className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-bold mb-1">No IPO Evaluated</p>
                <p className="text-gray-400 text-xs">Select an upcoming IPO above or click Generate to view institutional evaluation</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Institutional Investment Memo (Full 12-Section Structure) */}
      {data && data.memo && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-8 animate-in fade-in duration-500">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <span className="text-xs font-bold text-orange-600 uppercase tracking-widest">Official Equity Research Document</span>
              <h2 className="text-2xl font-black text-gray-900 flex items-center mt-1">
                <FileText className="w-6 h-6 text-orange-500 mr-2" />
                Institutional Investment Memo: {data.name}
              </h2>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-gray-100 text-gray-700 rounded-lg">
              CONFIDENTIAL RESEARCH
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 1. Business Overview & Moat */}
            <div className="p-5 bg-gray-50/70 rounded-xl border border-gray-100 space-y-2">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center">
                <Building className="w-4 h-4 text-orange-500 mr-2" /> 1. Business Overview & Moat
              </h3>
              <ul className="text-xs space-y-1.5 text-gray-700 list-disc pl-4">
                <li><strong>Revenue Model:</strong> {data.memo.business_overview_moat.one_liner}</li>
                <li><strong>Positioning:</strong> {data.memo.business_overview_moat.industry_positioning}</li>
                <li><strong>Moat Sources:</strong> {data.memo.business_overview_moat.moat_sources}</li>
                <li><strong>Moat Rating:</strong> <span className="font-bold text-orange-600">{data.memo.business_overview_moat.moat_strength}</span></li>
              </ul>
            </div>

            {/* 2. Industry & Growth Tailwinds */}
            <div className="p-5 bg-gray-50/70 rounded-xl border border-gray-100 space-y-2">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center">
                <TrendingUp className="w-4 h-4 text-green-600 mr-2" /> 2. Industry & Growth Tailwinds
              </h3>
              <ul className="text-xs space-y-1.5 text-gray-700 list-disc pl-4">
                <li><strong>Industry Trend:</strong> {data.memo.industry_growth_tailwinds.industry_trend}</li>
                <li><strong>Competitive Intensity:</strong> {data.memo.industry_growth_tailwinds.competitive_intensity}</li>
                <li><strong>Sector Tailwinds:</strong> <span className="font-bold text-green-600">{data.memo.industry_growth_tailwinds.sector_tailwind}</span></li>
              </ul>
            </div>

            {/* 3. Financial Health & Cash Flow Quality */}
            <div className="p-5 bg-gray-50/70 rounded-xl border border-gray-100 space-y-2">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center">
                <DollarSign className="w-4 h-4 text-emerald-600 mr-2" /> 3. Financial Health & Growth Quality
              </h3>
              <ul className="text-xs space-y-1.5 text-gray-700 list-disc pl-4">
                <li><strong>Revenue Trajectory:</strong> {data.memo.financial_health_quality.revenue_cagr}</li>
                <li><strong>Profitability Trend:</strong> {data.memo.financial_health_quality.profitability_trend}</li>
                <li><strong>Cash Flow Quality:</strong> {data.memo.financial_health_quality.cash_flow_quality}</li>
                <li><strong>Balance Sheet:</strong> {data.memo.financial_health_quality.balance_sheet}</li>
                <li><strong>Financial Quality Rating:</strong> <span className="font-bold text-emerald-600">{data.memo.financial_health_quality.financial_quality}</span></li>
              </ul>
            </div>

            {/* 4. Valuation Analysis vs Peers */}
            <div className="p-5 bg-gray-50/70 rounded-xl border border-gray-100 space-y-2">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center">
                <Award className="w-4 h-4 text-blue-600 mr-2" /> 4. Valuation vs Peers
              </h3>
              <ul className="text-xs space-y-1.5 text-gray-700 list-disc pl-4">
                <li><strong>Issue Price:</strong> {data.memo.valuation_analysis.issue_price}</li>
                <li><strong>Peer Comparison:</strong> {data.memo.valuation_analysis.peer_comparison}</li>
                <li><strong>Valuation Verdict:</strong> <span className="font-bold text-blue-600">{data.memo.valuation_analysis.valuation_verdict}</span></li>
              </ul>
            </div>

            {/* 5. Objects of the Issue */}
            <div className="p-5 bg-gray-50/70 rounded-xl border border-gray-100 space-y-2">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center">
                <FileCheck className="w-4 h-4 text-purple-600 mr-2" /> 5. Objects of the Issue
              </h3>
              <ul className="text-xs space-y-1.5 text-gray-700 list-disc pl-4">
                <li><strong>Issue Breakdown:</strong> {data.memo.objects_of_issue.fresh_issue_share}</li>
                <li><strong>Use of Proceeds:</strong> {data.memo.objects_of_issue.capital_use_purpose}</li>
                <li><strong>Capital Use Rating:</strong> <span className="font-bold text-purple-600">{data.memo.objects_of_issue.capital_use_rating}</span></li>
              </ul>
            </div>

            {/* 6. Promoter Quality & Governance */}
            <div className="p-5 bg-gray-50/70 rounded-xl border border-gray-100 space-y-2">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center">
                <ShieldCheck className="w-4 h-4 text-indigo-600 mr-2" /> 6. Promoter Quality & Governance
              </h3>
              <ul className="text-xs space-y-1.5 text-gray-700 list-disc pl-4">
                <li><strong>Post-IPO Holding:</strong> {data.memo.promoter_governance.promoter_holding}</li>
                <li><strong>Governance Signals:</strong> {data.memo.promoter_governance.governance_signals}</li>
                <li><strong>Governance Rating:</strong> <span className="font-bold text-indigo-600">{data.memo.promoter_governance.governance_quality}</span></li>
              </ul>
            </div>

            {/* 7. Capital Structure & Dilution */}
            <div className="p-5 bg-gray-50/70 rounded-xl border border-gray-100 space-y-2">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center">
                <PieChart className="w-4 h-4 text-amber-600 mr-2" /> 7. Capital Structure & Dilution
              </h3>
              <ul className="text-xs space-y-1.5 text-gray-700 list-disc pl-4">
                <li><strong>Dilution Risk:</strong> <span className="font-bold text-amber-600">{data.memo.capital_structure_dilution.dilution_risk}</span></li>
                <li><strong>Lock-up Structure:</strong> {data.memo.capital_structure_dilution.lockup_commentary}</li>
              </ul>
            </div>

            {/* 8. Institutional Demand */}
            <div className="p-5 bg-gray-50/70 rounded-xl border border-gray-100 space-y-2">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center">
                <Award className="w-4 h-4 text-teal-600 mr-2" /> 8. Institutional Demand (Anchors & QIB)
              </h3>
              <ul className="text-xs space-y-1.5 text-gray-700 list-disc pl-4">
                <li><strong>QIB Bidding Demand:</strong> <span className="font-bold text-teal-600">{data.memo.institutional_demand.qib_subscription}</span></li>
                <li><strong>NII Demand:</strong> {data.memo.institutional_demand.nii_subscription}</li>
                <li><strong>Retail Demand:</strong> {data.memo.institutional_demand.retail_subscription}</li>
                <li><strong>Institutional Confidence:</strong> <span className="font-bold text-teal-600">{data.memo.institutional_demand.institutional_confidence}</span></li>
              </ul>
            </div>
          </div>

          {/* 9. Key Risks & Red Flags */}
          <div className="p-5 bg-red-50/50 rounded-xl border border-red-200 space-y-3">
            <h3 className="text-sm font-bold text-red-900 uppercase tracking-wider flex items-center">
              <AlertTriangle className="w-4 h-4 text-red-600 mr-2" /> 9. Key Risks & Red Flags (Risk Level: {data.memo.risk_level})
            </h3>
            <ul className="text-xs space-y-1.5 text-red-800 list-disc pl-4">
              {data.memo.key_risks.map((risk: string, idx: number) => (
                <li key={idx}>{risk}</li>
              ))}
            </ul>
          </div>

          {/* 10, 11, 12. Scoring, Interpretation & Final Guidance */}
          <div className="p-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200 flex flex-col md:flex-row justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <span className="text-xs font-bold text-orange-700 uppercase tracking-wider">10 & 11. Scoring Interpretation</span>
              <h4 className="text-lg font-black text-gray-900">
                Score: {data.total_score}/100 — Category: {data.memo.scoring_interpretation.category}
              </h4>
              <p className="text-xs text-gray-600">
                Weighted Score: <strong>{data.weighted_score_5} / 5.0</strong> computed across 9 weighted equity research factors.
              </p>
            </div>

            <div className="space-y-2 border-t md:border-t-0 md:border-l border-orange-200 pt-4 md:pt-0 md:pl-6">
              <span className="text-xs font-bold text-orange-700 uppercase tracking-wider">12. Position & Entry Guidance</span>
              <div className="text-xs space-y-1 text-gray-800">
                <p><strong>Recommendation:</strong> <span className={`px-2 py-0.5 rounded font-black text-xs ${data.memo.recommendation_guidance.badge_style}`}>{data.recommendation}</span></p>
                <p><strong>Position Size:</strong> {data.memo.recommendation_guidance.position_size}</p>
                <p><strong>Entry Strategy:</strong> {data.memo.recommendation_guidance.entry_strategy}</p>
                <p><strong>Monitoring Triggers:</strong> {data.memo.recommendation_guidance.monitoring_triggers}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
