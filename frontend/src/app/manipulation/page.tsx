"use client";

import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { AlertTriangle, Search, AlertCircle, TrendingUp, Newspaper, Activity, Info, BarChart2 } from "lucide-react";
import { StockSelector } from "@/components/StockSelector";
import { createChart, ColorType, CrosshairMode, IChartApi, ISeriesApi, CandlestickSeries, HistogramSeries, createSeriesMarkers } from "lightweight-charts";

export default function ManipulationPage() {
  const [ticker, setTicker] = useState("SUZLON");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const fetchData = async () => {
    const cleanTicker = ticker.toUpperCase().replace(/\.NS$/i, "");
    setLoading(true);
    setError("");
    setData(null);
    try {
      const response = await axios.get(`http://127.0.0.1:8000/api/manipulation/?ticker=${cleanTicker}`);
      setData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (data && chartContainerRef.current) {
      if (chartRef.current) {
        try {
          chartRef.current.remove();
        } catch (e) {}
        chartRef.current = null;
      }

      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: '#ffffff' },
          textColor: '#333',
        },
        grid: {
          vertLines: { color: '#f0f0f0' },
          horzLines: { color: '#f0f0f0' },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
        },
        rightPriceScale: {
          borderColor: '#e1e1e1',
        },
        timeScale: {
          borderColor: '#e1e1e1',
          timeVisible: true,
        },
      });
      chartRef.current = chart;

      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444'
      });

      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: '#9ca3af',
        priceFormat: { type: 'volume' },
        priceScaleId: '', // set as an overlay
      });

      chart.priceScale('').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });

      const cData = data.chart_data.map((d: any) => ({
        time: d.time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close
      }));
      
      const vData = data.chart_data.map((d: any) => ({
        time: d.time,
        value: d.value,
        color: d.close > d.open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'
      }));

      candleSeries.setData(cData);
      volumeSeries.setData(vData);

      if (data.markers && data.markers.length > 0) {
        const seriesMarkers = createSeriesMarkers(candleSeries);
        seriesMarkers.setMarkers(data.markers);
      }

      chart.timeScale().fitContent();

      return () => {
        try {
           chart.remove();
        } catch (e) {}
        chartRef.current = null;
      };
    }
  }, [data]);

  const ProgressBar = ({ label, value, max, colorClass }: { label: string, value: number, max: number, colorClass: string }) => {
     const percentage = Math.min((value / max) * 100, 100);
     return (
        <div className="mb-4 last:mb-0">
           <div className="flex justify-between text-xs font-medium mb-1 text-gray-600">
              <span>{label}</span>
              <span>{value}/{max}</span>
           </div>
           <div className="w-full bg-gray-200 rounded-full h-2">
              <div className={`h-2 rounded-full ${colorClass}`} style={{ width: `${percentage}%` }}></div>
           </div>
        </div>
     )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center mb-2">
          <AlertTriangle className="w-8 h-8 mr-3 text-rose-500" />
          Pro Pump-and-Dump Detector
        </h1>
        <p className="text-gray-600">Institutional-grade multi-factor analysis correlating anomalous price momentum, volume distribution, and news sentiment.</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
        <div className="flex gap-4 items-center">
          <StockSelector
            value={ticker}
            onChange={(sym) => setTicker(sym)}
            placeholder="Search stock ticker (e.g. SUZLON, YESBANK)..."
            inputClassName="w-full px-4 py-2 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
          <button
            onClick={fetchData}
            disabled={loading}
            className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-2 rounded-lg flex items-center disabled:opacity-50 transition font-medium"
          >
            {loading ? "Analyzing..." : <><Search className="w-4 h-4 mr-2" /> Scan</>}
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className={`p-6 rounded-xl shadow-md border text-white ${
              data.risk_level === 'High' ? 'bg-gradient-to-br from-red-500 to-rose-600 border-red-600' : 
              data.risk_level === 'Medium' ? 'bg-gradient-to-br from-orange-400 to-amber-500 border-orange-500' : 
              'bg-gradient-to-br from-emerald-400 to-teal-500 border-emerald-500'
            }`}>
              <h3 className="text-sm font-medium opacity-90 mb-1">Risk Level</h3>
              <p className="text-4xl font-extrabold tracking-tight">{data.risk_level}</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Total Manipulation Score</h3>
              <div className="flex items-end">
                <p className="text-4xl font-extrabold text-gray-800">{data.manipulation_score}</p>
                <span className="text-gray-400 font-medium ml-1 mb-1">/ 100</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Current Phase</h3>
              <p className={`text-2xl font-bold mt-1 ${data.phase.includes('DUMP') ? 'text-red-500' : data.phase.includes('PUMP') ? 'text-emerald-500' : data.phase.includes('ACCUMULATION') ? 'text-blue-500' : 'text-gray-600'}`}>
                {data.phase}
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-center">
              <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center"><Activity className="w-4 h-4 mr-1"/> Risk Vectors</h3>
              <ProgressBar label="Volume Spikes" value={data.vectors.volume} max={30} colorClass="bg-blue-500" />
              <ProgressBar label="Price Momentum" value={data.vectors.price} max={30} colorClass="bg-purple-500" />
              <ProgressBar label="Dump Evidence" value={data.vectors.dump} max={25} colorClass="bg-red-500" />
              <ProgressBar label="News Divergence" value={data.vectors.news} max={15} colorClass="bg-orange-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold flex items-center mb-4 text-gray-800">
              <BarChart2 className="w-5 h-5 mr-2 text-rose-500" />
              Price Action & Distribution Analysis
            </h3>
            <div ref={chartContainerRef} className="w-full h-[400px]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold flex items-center mb-4 text-gray-800">
                <TrendingUp className="w-5 h-5 mr-2 text-rose-500" />
                Red Flag Indicators
              </h3>
              {data.indicators.length > 0 ? (
                <ul className="space-y-4">
                  {data.indicators.map((indicator: string, i: number) => (
                    <li key={i} className="flex items-start bg-rose-50 p-3 rounded-lg border border-rose-100">
                      <AlertCircle className="w-5 h-5 text-rose-500 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 text-sm font-medium leading-relaxed">{indicator}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                   <Info className="w-10 h-10 mb-2 opacity-20" />
                   <p className="text-sm italic">No significant manipulation indicators detected recently.</p>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold flex items-center mb-4 text-gray-800">
                <Newspaper className="w-5 h-5 mr-2 text-rose-500" />
                Recent News Context
              </h3>
              <p className="text-sm text-gray-500 mb-4 bg-gray-50 p-2 rounded inline-block">Found <span className="font-bold text-gray-700">{data.news_analysis.news_volume}</span> recent articles related to this stock. Avg Sentiment: <span className={`font-bold ${data.news_analysis.avg_sentiment > 0 ? 'text-green-600' : 'text-red-600'}`}>{data.news_analysis.avg_sentiment.toFixed(2)}</span></p>
              
              {data.news_analysis.recent_articles.length > 0 ? (
                <div className="space-y-3">
                  {data.news_analysis.recent_articles.map((article: any, i: number) => (
                    <div key={i} className="border border-gray-100 p-3 rounded-lg hover:shadow-sm transition bg-white">
                      <a href={article.link} target="_blank" rel="noreferrer" className="text-sm font-medium hover:text-rose-600 line-clamp-2 text-gray-800">
                        {article.title}
                      </a>
                      <div className="flex items-center mt-2 text-xs font-medium">
                        <span className={`px-2 py-1 rounded-full mr-3 ${article.sentiment > 0.2 ? 'bg-green-100 text-green-700' : article.sentiment < -0.2 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                          Sentiment: {article.sentiment.toFixed(2)}
                        </span>
                        <span className="text-gray-400">{article.published}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic text-sm">No recent news found for this ticker. Lack of news during a price spike is a major red flag.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
