"use client";

import { useState } from "react";
import axios from "axios";
import { Building, Calculator, AlertCircle } from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from "recharts";

export default function IPOPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  
  const [form, setForm] = useState({
    name: "TechNova IPO",
    issue_price: 350,
    sector: "Technology",
    subscription_retail: 15,
    subscription_qib: 60,
    subscription_nii: 45,
    revenue_growth: 45,
    profit_margin: 18
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: name === 'name' || name === 'sector' ? value : Number(value)
    });
  };

  const evaluateIPO = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await axios.post("http://localhost:8000/api/ipo-evaluate/", form);
      
      // Format data for Recharts Radar Chart
      const chartData = [
        { subject: 'Demand', A: response.data.breakdown.Demand, fullMark: 30 },
        { subject: 'Financials', A: response.data.breakdown.Financials, fullMark: 40 },
        { subject: 'Valuation/Sector', A: response.data.breakdown.Valuation_Sector, fullMark: 30 },
        { subject: 'Momentum', A: response.data.breakdown.Momentum, fullMark: 100 },
        { subject: 'Risk', A: response.data.breakdown.Risk, fullMark: 100 },
      ];
      
      setData({
        ...response.data,
        chartData
      });
      
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to evaluate IPO.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center mb-2">
          <Building className="w-8 h-8 mr-3 text-orange-500" />
          AI IPO Evaluator
        </h1>
        <p className="text-gray-600">Rule-based scoring engine for upcoming Initial Public Offerings.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Form */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold mb-6">IPO Details</h3>
          
          <form onSubmit={evaluateIPO} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input type="text" name="name" value={form.name} onChange={handleChange} required className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sector</label>
                <select name="sector" value={form.sector} onChange={handleChange} className="w-full px-3 py-2 border rounded-md">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Issue Price (₹)</label>
                <input type="number" name="issue_price" value={form.issue_price} onChange={handleChange} required className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Revenue Growth (%)</label>
                <input type="number" name="revenue_growth" value={form.revenue_growth} onChange={handleChange} required className="w-full px-3 py-2 border rounded-md" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="col-span-3"><h4 className="text-sm font-bold text-gray-700">Subscription Status (x times)</h4></div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">QIB</label>
                <input type="number" step="0.1" name="subscription_qib" value={form.subscription_qib} onChange={handleChange} required className="w-full px-3 py-2 border rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">NII</label>
                <input type="number" step="0.1" name="subscription_nii" value={form.subscription_nii} onChange={handleChange} required className="w-full px-3 py-2 border rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Retail</label>
                <input type="number" step="0.1" name="subscription_retail" value={form.subscription_retail} onChange={handleChange} required className="w-full px-3 py-2 border rounded-md text-sm" />
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Profit Margin (%)</label>
              <input type="number" name="profit_margin" value={form.profit_margin} onChange={handleChange} required className="w-full px-3 py-2 border rounded-md" />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg flex items-center justify-center font-medium disabled:opacity-50 transition"
            >
              {loading ? "Evaluating..." : <><Calculator className="w-5 h-5 mr-2" /> Evaluate IPO</>}
            </button>
            
            {error && (
              <div className="mt-4 text-sm text-red-600 flex items-start">
                <AlertCircle className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}
          </form>
        </div>

        {/* Right Column: Scorecard */}
        <div className="space-y-6">
          {data ? (
            <>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                <h2 className="text-xl font-bold mb-2">{data.name}</h2>
                
                <div className="relative w-32 h-32 rounded-full flex items-center justify-center border-8 border-gray-100 mb-4">
                  <div className={`absolute inset-0 rounded-full border-8 border-orange-500`} style={{ clipPath: `polygon(0 0, 100% 0, 100% ${data.total_score}%, 0 ${data.total_score}%)` }}></div>
                  <div className="relative z-10 flex flex-col items-center">
                    <span className="text-3xl font-extrabold">{data.total_score}</span>
                    <span className="text-xs text-gray-400">/ 100</span>
                  </div>
                </div>
                
                <div className={`px-4 py-1 rounded-full text-sm font-bold ${
                  data.verdict === 'Highly Attractive' ? 'bg-green-100 text-green-700' :
                  data.verdict === 'Attractive' ? 'bg-emerald-100 text-emerald-700' :
                  data.verdict === 'Avoid' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {data.verdict}
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold mb-4">Score Breakdown</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data.chartData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" tick={{fill: '#6b7280', fontSize: 12}} />
                      <Tooltip />
                      <Radar name="Score" dataKey="A" stroke="#f97316" fill="#f97316" fillOpacity={0.5} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-gray-50 border border-gray-200 border-dashed rounded-xl h-full flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Building className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Submit IPO details to see evaluation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
