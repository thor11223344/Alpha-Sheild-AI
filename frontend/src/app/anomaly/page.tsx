"use client";

import { useState } from "react";
import axios from "axios";
import { Activity, Search, AlertCircle } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Scatter,
  ComposedChart,
  Bar
} from "recharts";

import { StockSelector } from "@/components/StockSelector";

export default function AnomalyPage() {
  const [ticker, setTicker] = useState("RELIANCE");
  const [period, setPeriod] = useState("3y");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  const fetchData = async () => {
    const cleanTicker = ticker.toUpperCase().replace(/\.NS$/i, "");
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(`http://localhost:8000/api/anomaly/?ticker=${cleanTicker}&period=${period}`);
      setData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center mb-2">
          <Activity className="w-8 h-8 mr-3 text-sky-500" />
          Anomaly & Information-Leakage Screener
        </h1>
        <p className="text-gray-600">Detect statistically abnormal trading days using Isolation Forests over multi-year periods.</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <StockSelector
            value={ticker}
            onChange={(sym) => setTicker(sym)}
            placeholder="Search stock ticker or company name (e.g. RELIANCE, Tata)..."
            inputClassName="w-full px-4 py-2 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <div className="flex gap-2 items-center w-full sm:w-auto">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="1y">1 Year</option>
              <option value="3y">3 Years (Default)</option>
              <option value="5y">5 Years</option>
            </select>
            <button
              onClick={fetchData}
              disabled={loading}
              className="bg-sky-500 hover:bg-sky-600 text-white px-6 py-2 rounded-lg flex items-center disabled:opacity-50 transition whitespace-nowrap"
            >
              {loading ? "Analyzing..." : <><Search className="w-4 h-4 mr-2" /> Analyze</>}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-8 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-gray-500">Ticker</h3>
              <p className="text-2xl font-bold">{data.ticker}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-gray-500">Anomalies Detected ({period === '3y' ? '3 Years' : period === '5y' ? '5 Years' : '1 Year'})</h3>
              <p className="text-2xl font-bold text-sky-600">{data.anomaly_count}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-gray-500">Data Points Analyzed</h3>
              <p className="text-2xl font-bold text-gray-800">{data.data?.length || 0} days</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Price & Volume History ({period === '3y' ? '3 Years' : period === '5y' ? '5 Years' : '1 Year'})</h3>
                <p className="text-xs text-gray-500">Historical closing prices with daily trading volume and detected anomaly markers</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center text-sky-600">
                  <span className="w-3.5 h-0.5 bg-sky-500 inline-block mr-1.5"></span> Price Line
                </span>
                <span className="flex items-center text-gray-500">
                  <span className="w-3 h-3 bg-gray-200 inline-block mr-1.5 rounded-sm"></span> Volume
                </span>
                <span className="flex items-center text-red-600">
                  <span className="w-2.5 h-2.5 bg-red-500 rounded-full inline-block mr-1.5 ring-2 ring-red-200"></span> Anomaly Event
                </span>
              </div>
            </div>

            <div className="h-[450px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.data} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    minTickGap={40}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    dy={10}
                    tickFormatter={(val: string) => {
                      if (!val) return "";
                      const parts = val.split("-");
                      if (parts.length < 3) return val;
                      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                      const monthStr = monthNames[parseInt(parts[1], 10) - 1] || parts[1];
                      return period === "1y" ? `${monthStr} ${parts[2]}` : `${monthStr} '${parts[0].slice(2)}`;
                    }}
                  />
                  <YAxis 
                    yAxisId="left" 
                    domain={['auto', 'auto']}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    dx={-5}
                    tickFormatter={(val: number) => {
                      if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
                      if (val >= 1000) return `₹${(val / 1000).toFixed(1)}k`;
                      return `₹${Math.round(val)}`;
                    }}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    domain={[0, (dataMax: number) => dataMax * 4]} 
                    hide 
                  />
                  <Tooltip 
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-white p-4 rounded-xl shadow-xl border border-gray-200 text-xs space-y-2 max-w-xs z-50">
                            <div className="flex justify-between items-center border-b pb-1 font-bold text-gray-800">
                              <span>{item.date}</span>
                              <span className="text-sky-600 font-bold text-sm">₹{Number(item.close).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between text-gray-500">
                              <span>Volume:</span>
                              <span className="font-semibold text-gray-800">{Number(item.volume).toLocaleString('en-IN')} shares</span>
                            </div>
                            {item.is_anomaly && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700">
                                <span className="font-bold block mb-1 text-red-700 flex items-center">
                                  🚨 Anomaly Detected
                                </span>
                                <p className="text-[11px] leading-tight text-red-600">{item.explanation}</p>
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar yAxisId="right" dataKey="volume" fill="#cbd5e1" opacity={0.5} radius={[2, 2, 0, 0]} />
                  <Line 
                    yAxisId="left" 
                    type="monotone" 
                    dataKey="close" 
                    stroke="#0284c7" 
                    strokeWidth={2.5} 
                    dot={false} 
                    activeDot={{ r: 5, fill: "#0284c7" }}
                  />
                  <Scatter 
                    yAxisId="left"
                    dataKey={(row: any) => row.is_anomaly ? row.close : null} 
                    shape={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (!payload || !payload.is_anomaly || cx == null || cy == null) return null;
                      return (
                        <g key={`dot-${payload.date}`}>
                          <circle cx={cx} cy={cy} r={7} fill="#ef4444" fillOpacity={0.3} />
                          <circle cx={cx} cy={cy} r={4} fill="#dc2626" stroke="#ffffff" strokeWidth={1.5} />
                        </g>
                      );
                    }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold mb-4">Detected Anomalies</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="p-3 text-sm font-medium text-gray-500">Date</th>
                    <th className="p-3 text-sm font-medium text-gray-500">Close Price</th>
                    <th className="p-3 text-sm font-medium text-gray-500">Explanation</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.filter((d: any) => d.is_anomaly).reverse().map((d: any) => (
                    <tr key={d.date} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="p-3 text-sm">{d.date}</td>
                      <td className="p-3 text-sm font-medium">₹{d.close.toFixed(2)}</td>
                      <td className="p-3 text-sm text-gray-600">{d.explanation}</td>
                    </tr>
                  ))}
                  {data.data.filter((d: any) => d.is_anomaly).length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-gray-500">No anomalies detected in the selected period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
