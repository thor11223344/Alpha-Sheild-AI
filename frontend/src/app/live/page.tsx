"use client";

import React, { useState, useEffect, useRef } from "react";
import { createChart, ColorType, CrosshairMode, IChartApi, ISeriesApi, CandlestickSeries, HistogramSeries, createSeriesMarkers } from "lightweight-charts";
import { AlertTriangle, Activity, Zap, Newspaper, TrendingUp, TrendingDown, Radio } from "lucide-react";
import { StockSelector } from "@/components/StockSelector";
import axios from "axios";

export default function LiveTrackingPage() {
  const [ticker, setTicker] = useState("SUZLON");
  const [news, setNews] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");
  const [livePrice, setLivePrice] = useState(0);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const markersRef = useRef<any[]>([]);

  // Fetch News Sentiment once when ticker changes
  useEffect(() => {
    setNews(null);
    axios.get(`http://127.0.0.1:8000/api/live/news/sentiment/?ticker=${ticker}`)
      .then((res) => setNews(res.data))
      .catch((err) => console.error("News fetch error:", err));
  }, [ticker]);

  // Setup WebSocket and Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (chartRef.current) {
        try { chartRef.current.remove(); } catch(e) {}
        chartRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
      layout: { background: { type: ColorType.Solid, color: "#000000" }, textColor: "#d1d5db" },
      width: chartContainerRef.current.clientWidth,
      height: 600,
      crosshair: { mode: CrosshairMode.Normal },
      grid: { vertLines: { color: "#333" }, horzLines: { color: "#333" } },
      timeScale: { timeVisible: true, secondsVisible: true, borderColor: "#333" },
      rightPriceScale: { borderColor: "#333" },
    });
    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981", downColor: "#ef4444", borderVisible: false, wickUpColor: "#10b981", wickDownColor: "#ef4444",
    });
    candleSeriesRef.current = candleSeries;

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "#26a69a", priceFormat: { type: "volume" }, priceScaleId: "",
    });
    volumeSeriesRef.current = volumeSeries;

    chart.priceScale('').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    markersRef.current = [];

    // Connect WebSocket
    const wsUrl = `ws://127.0.0.1:8000/api/live/ws/live/${ticker}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setConnectionStatus("Connected (Live)");
    ws.onclose = () => setConnectionStatus("Disconnected");
    ws.onerror = () => setConnectionStatus("Error");

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      setLivePrice(data.close);

      // Update Chart
      candleSeries.update({
        time: data.time,
        open: data.open,
        high: data.high,
        low: data.low,
        close: data.close
      });

      volumeSeries.update({
        time: data.time,
        value: data.value,
        color: data.close >= data.open ? "rgba(16, 185, 129, 0.5)" : "rgba(239, 68, 68, 0.5)"
      });

      if (data.is_anomaly) {
         const newMarker = {
             time: data.time as any,
             position: data.anomaly_type === "pump" ? "belowBar" : "aboveBar",
             color: data.anomaly_type === "pump" ? "#10b981" : "#ef4444",
             shape: data.anomaly_type === "pump" ? "arrowUp" : "arrowDown",
             text: data.anomaly_type === "pump" ? "PUMP DETECTED" : "DUMP DETECTED"
         };
         markersRef.current.push(newMarker);
         const seriesMarkers = createSeriesMarkers(candleSeries);
         seriesMarkers.setMarkers(markersRef.current);
      }
    };

    const handleResize = () => {
      if (chartContainerRef.current) chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (wsRef.current) wsRef.current.close();
      try { chart.remove(); } catch(e) {}
      chartRef.current = null;
    };
  }, [ticker]);

  return (
    <div className="min-h-screen bg-black text-gray-100 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-900 border border-gray-800 p-6 rounded-2xl">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Radio className={`h-8 w-8 ${connectionStatus.includes('Live') ? 'text-green-500 animate-pulse' : 'text-gray-500'}`} />
              Live Manipulation Tracking
            </h1>
            <p className="text-gray-400 mt-2">Real-time WebSocket feed simulating tick-by-tick market flow.</p>
          </div>
          <div className="flex items-center gap-4">
            <StockSelector value={ticker} onChange={setTicker} />
            <div className="px-4 py-2 bg-gray-800 rounded-lg text-sm flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${connectionStatus.includes('Live') ? 'bg-green-500' : 'bg-red-500'}`}></span>
                {connectionStatus}
            </div>
            <div className="px-4 py-2 bg-gray-800 rounded-lg text-xl font-bold font-mono text-white min-w-[120px] text-right">
                ₹{livePrice.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Chart Area */}
            <div className="lg:col-span-2 space-y-4">
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
                        <Activity className="h-5 w-5 text-blue-400" />
                        Live Order Flow ({ticker})
                    </h2>
                    <div ref={chartContainerRef} className="w-full" />
                </div>
            </div>

            {/* News Sentiment Area */}
            <div className="space-y-4">
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 h-full flex flex-col">
                    <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
                        <Newspaper className="h-5 w-5 text-purple-400" />
                        Live News Sentiment AI
                    </h2>

                    {!news ? (
                        <div className="animate-pulse space-y-4 mt-4">
                            <div className="h-20 bg-gray-800 rounded-lg"></div>
                            <div className="h-10 bg-gray-800 rounded-lg"></div>
                            <div className="h-10 bg-gray-800 rounded-lg"></div>
                        </div>
                    ) : (
                        <div className="space-y-6 flex-1 mt-4">
                            
                            {/* Verdict */}
                            <div className={`p-4 rounded-xl border flex items-center gap-4 ${
                                news.verdict.includes("Extremely Positive") 
                                  ? "bg-green-900/20 border-green-800/50 text-green-400"
                                  : news.verdict.includes("Extremely Negative")
                                  ? "bg-red-900/20 border-red-800/50 text-red-400"
                                  : "bg-blue-900/20 border-blue-800/50 text-blue-400"
                            }`}>
                                {news.verdict.includes("Extremely Positive") ? <TrendingUp className="h-8 w-8" /> : 
                                 news.verdict.includes("Extremely Negative") ? <TrendingDown className="h-8 w-8" /> : 
                                 <Activity className="h-8 w-8" />}
                                
                                <div>
                                    <div className="text-sm opacity-80 uppercase tracking-wide">AI Sentiment Verdict</div>
                                    <div className="text-lg font-bold">{news.verdict}</div>
                                </div>
                            </div>

                            {/* Score */}
                            <div className="flex justify-between items-center p-4 bg-gray-800/50 rounded-xl">
                                <span className="text-gray-400">Average Polarity</span>
                                <span className="text-2xl font-bold text-white font-mono">{news.average_sentiment}</span>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 space-y-3" style={{ maxHeight: '400px' }}>
                                {news.articles.map((article: any, idx: number) => (
                                    <a key={idx} href={article.link} target="_blank" rel="noreferrer" className="block p-4 bg-gray-800/30 hover:bg-gray-800/60 rounded-xl transition-colors group">
                                        <div className="flex justify-between items-start gap-3">
                                            <h3 className="text-sm font-medium text-gray-200 group-hover:text-blue-400 line-clamp-2">
                                                {article.title}
                                            </h3>
                                            <span className={`text-xs px-2 py-1 rounded font-mono ${
                                                article.sentiment_label === 'Positive' ? 'bg-green-900/50 text-green-400' :
                                                article.sentiment_label === 'Negative' ? 'bg-red-900/50 text-red-400' :
                                                'bg-gray-700 text-gray-300'
                                            }`}>
                                                {article.sentiment_score}
                                            </span>
                                        </div>
                                    </a>
                                ))}
                                {news.articles.length === 0 && (
                                    <div className="text-center text-gray-500 py-8">No recent news found.</div>
                                )}
                            </div>

                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
