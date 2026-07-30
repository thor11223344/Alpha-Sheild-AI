"use client";

import { useState } from "react";
import axios from "axios";
import { AlertTriangle, Search, AlertCircle, TrendingUp, Newspaper } from "lucide-react";

import { StockSelector } from "@/components/StockSelector";

export default function ManipulationPage() {
  const [ticker, setTicker] = useState("SUZLON");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  const fetchData = async () => {
    const cleanTicker = ticker.toUpperCase().replace(/\.NS$/i, "");
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(`http://localhost:8000/api/manipulation/?ticker=${cleanTicker}`);
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
          <AlertTriangle className="w-8 h-8 mr-3 text-violet-500" />
          Pump-and-Dump Detector
        </h1>
        <p className="text-gray-600">Correlate price/volume anomalies with news sentiment to detect potential manipulation.</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
        <div className="flex gap-4 items-center">
          <StockSelector
            value={ticker}
            onChange={(sym) => setTicker(sym)}
            placeholder="Search stock ticker or company name (e.g. SUZLON, Reliance)..."
            inputClassName="w-full px-4 py-2 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button
            onClick={fetchData}
            disabled={loading}
            className="bg-violet-500 hover:bg-violet-600 text-white px-6 py-2 rounded-lg flex items-center disabled:opacity-50 transition"
          >
            {loading ? "Analyzing..." : <><Search className="w-4 h-4 mr-2" /> Detect</>}
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
            <div className={`p-6 rounded-xl shadow-sm border text-white ${
              data.risk_level === 'High' ? 'bg-red-500 border-red-600' : 
              data.risk_level === 'Medium' ? 'bg-orange-500 border-orange-600' : 
              'bg-emerald-500 border-emerald-600'
            }`}>
              <h3 className="text-sm font-medium opacity-90">Risk Level</h3>
              <p className="text-3xl font-bold mt-1">{data.risk_level}</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-gray-500">Manipulation Score</h3>
              <div className="flex items-end mt-1">
                <p className="text-3xl font-bold">{data.manipulation_score}</p>
                <span className="text-gray-400 font-medium ml-1 mb-1">/ 100</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-gray-500">News Sentiment (VADER)</h3>
              <p className={`text-3xl font-bold mt-1 ${data.news_analysis.avg_sentiment > 0 ? 'text-green-500' : data.news_analysis.avg_sentiment < 0 ? 'text-red-500' : ''}`}>
                {data.news_analysis.avg_sentiment > 0 ? '+' : ''}{data.news_analysis.avg_sentiment.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold flex items-center mb-4">
                <TrendingUp className="w-5 h-5 mr-2 text-violet-500" />
                Red Flag Indicators
              </h3>
              {data.indicators.length > 0 ? (
                <ul className="space-y-3">
                  {data.indicators.map((indicator: string, i: number) => (
                    <li key={i} className="flex items-start">
                      <span className="inline-block w-2 h-2 rounded-full bg-red-500 mt-2 mr-3 flex-shrink-0"></span>
                      <span className="text-gray-700">{indicator}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 italic">No significant manipulation indicators detected recently.</p>
              )}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold flex items-center mb-4">
                <Newspaper className="w-5 h-5 mr-2 text-violet-500" />
                Recent News Context
              </h3>
              <p className="text-sm text-gray-500 mb-4">Found {data.news_analysis.news_volume} recent articles related to this stock.</p>
              
              {data.news_analysis.recent_articles.length > 0 ? (
                <div className="space-y-4">
                  {data.news_analysis.recent_articles.map((article: any, i: number) => (
                    <div key={i} className="border-b pb-3 last:border-0">
                      <a href={article.link} target="_blank" rel="noreferrer" className="text-sm font-medium hover:text-violet-600 line-clamp-2">
                        {article.title}
                      </a>
                      <div className="flex items-center mt-1 text-xs text-gray-500">
                        <span className={`px-2 py-0.5 rounded-full mr-2 ${article.sentiment > 0 ? 'bg-green-100 text-green-700' : article.sentiment < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100'}`}>
                          Score: {article.sentiment.toFixed(2)}
                        </span>
                        <span>{article.published}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">No recent news found for this ticker.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
