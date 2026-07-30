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

export default function AnomalyPage() {
  const [ticker, setTicker] = useState("RELIANCE");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(`http://localhost:8000/api/anomaly/?ticker=${ticker}`);
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
        <p className="text-gray-600">Detect statistically abnormal trading days using Isolation Forests.</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
        <div className="flex gap-4">
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="Enter NSE Ticker (e.g., RELIANCE)"
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <button
            onClick={fetchData}
            disabled={loading}
            className="bg-sky-500 hover:bg-sky-600 text-white px-6 py-2 rounded-lg flex items-center disabled:opacity-50 transition"
          >
            {loading ? "Analyzing..." : <><Search className="w-4 h-4 mr-2" /> Analyze</>}
          </button>
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
              <h3 className="text-sm font-medium text-gray-500">Anomalies Detected (1yr)</h3>
              <p className="text-2xl font-bold text-sky-600">{data.anomaly_count}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold mb-4">Price & Volume History</h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.data}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => val.split("-").slice(1).join("/")} 
                  />
                  <YAxis yAxisId="left" domain={['auto', 'auto']} />
                  <YAxis yAxisId="right" orientation="right" hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar yAxisId="right" dataKey="volume" fill="#e2e8f0" />
                  <Line yAxisId="left" type="monotone" dataKey="close" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                  
                  {/* Mark anomalies */}
                  <Scatter 
                    yAxisId="left"
                    dataKey={(row: any) => row.is_anomaly ? row.close : null} 
                    fill="#ef4444" 
                    r={6} 
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
