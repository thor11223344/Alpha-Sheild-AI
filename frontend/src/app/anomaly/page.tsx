"use client";

import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { 
  Activity, Search, AlertCircle, Minus, TrendingUp, MousePointer, 
  Trash2, Plus, Palette, Target, X
} from "lucide-react";
import { StockSelector } from "@/components/StockSelector";
import { createChart, ColorType, CrosshairMode, LineStyle, IChartApi, ISeriesApi, AreaSeries, HistogramSeries, LineSeries, createSeriesMarkers } from "lightweight-charts";

interface HorizontalLine {
  id: string;
  price: number;
  color: string;
  label: string;
  line: any;
}

interface FreestyleLine {
  id: string;
  date1: string;
  price1: number;
  date2: string;
  price2: number;
  color: string;
  series: any;
}

export default function AnomalyPage() {
  const [ticker, setTicker] = useState("RELIANCE");
  const [period, setPeriod] = useState("3y");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  const [drawMode, setDrawMode] = useState<"pointer" | "horizontal" | "freestyle">("pointer");
  const [lineColor, setLineColor] = useState<string>("#10b981");
  const [horizontalLines, setHorizontalLines] = useState<HorizontalLine[]>([]);
  const [freestyleLines, setFreestyleLines] = useState<FreestyleLine[]>([]);
  
  const [freestyleStart, setFreestyleStart] = useState<{ date: string; price: number } | null>(null);
  const [manualPrice, setManualPrice] = useState<string>("");

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const freestyleDraftSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  const stateRef = useRef({ drawMode, lineColor, freestyleStart, data });
  useEffect(() => {
    stateRef.current = { drawMode, lineColor, freestyleStart, data };
  }, [drawMode, lineColor, freestyleStart, data]);

  const roundToTwo = (val: number) => Math.round(val * 100) / 100;

  const fetchData = async () => {
    const cleanTicker = ticker.toUpperCase().replace(/\.NS$/i, "");
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(`http://127.0.0.1:8000/api/anomaly/?ticker=${cleanTicker}&period=${period}`);
      setData(response.data);
      clearAllLines();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!chartContainerRef.current || !data?.data) return;

    if (chartRef.current) {
        try { chartRef.current.remove(); } catch (e) {}
        chartRef.current = null;
    }
    
    const chart = createChart(chartContainerRef.current, {
      layout: { background: { type: ColorType.Solid, color: 'white' }, textColor: '#333' },
      width: chartContainerRef.current.clientWidth,
      height: 480,
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#d1d5db' },
      timeScale: { borderColor: '#d1d5db', timeVisible: true },
    });
    chartRef.current = chart;

    const mainSeries = chart.addSeries(AreaSeries, {
      lineColor: '#2962FF', topColor: '#2962FF', bottomColor: 'rgba(41, 98, 255, 0.1)',
    });
    mainSeriesRef.current = mainSeries;

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    const chartData = data.data.map((d: any) => ({ time: d.date, value: d.close }));
    const volumeData = data.data.map((d: any) => ({ 
      time: d.date, 
      value: d.volume, 
      color: d.is_anomaly ? '#ef5350' : '#26a69a'
    }));

    mainSeries.setData(chartData);
    volumeSeries.setData(volumeData);
    
    const markers = data.data
      .filter((d: any) => d.is_anomaly)
      .map((d: any) => ({
        time: d.date,
        position: 'aboveBar',
        color: '#ef5350',
        shape: 'circle',
        text: 'Anomaly'
      }));
    const seriesMarkers = createSeriesMarkers(mainSeries);
    seriesMarkers.setMarkers(markers);
    
    chart.timeScale().fitContent();

    const clickHandler = (param: any) => {
      const state = stateRef.current;
      if (state.drawMode === "pointer" || !param.point) return;
      
      const price = mainSeries.coordinateToPrice(param.point.y);
      if (price === null) return;
      
      let time = param.time as string | null | undefined;
      if (!time && chartRef.current) {
        time = chartRef.current.timeScale().coordinateToTime(param.point.x) as string | null | undefined;
      }
      if (!time) return;
      
      const targetPrice = roundToTwo(price);
      
      if (state.drawMode === "horizontal") {
         const line = mainSeries.createPriceLine({
            price: targetPrice,
            color: state.lineColor,
            lineWidth: 2,
            lineStyle: LineStyle.Solid,
            axisLabelVisible: true,
            title: 'Line',
         });
         setHorizontalLines(prev => [...prev, {
            id: Math.random().toString(), price: targetPrice, color: state.lineColor, label: "Level", line
         }]);
      } else if (state.drawMode === "freestyle") {
         const start = state.freestyleStart;
         if (!start) {
            setFreestyleStart({ date: time, price: targetPrice });
         } else {
            const newLineSeries = chart.addSeries(LineSeries, { color: state.lineColor, lineWidth: 2 });
            
            const t1 = start.date;
            const t2 = time;
            
            const t1Val = typeof t1 === 'object' ? new Date((t1 as any).year, (t1 as any).month - 1, (t1 as any).day).getTime() : new Date(t1 as string).getTime();
            const t2Val = typeof t2 === 'object' ? new Date((t2 as any).year, (t2 as any).month - 1, (t2 as any).day).getTime() : new Date(t2 as string).getTime();
            
            let dataPoints = [];
            if (t1Val < t2Val) {
               dataPoints = [{ time: t1, value: start.price }, { time: t2, value: targetPrice }];
            } else if (t1Val > t2Val) {
               dataPoints = [{ time: t2, value: targetPrice }, { time: t1, value: start.price }];
            } else {
               dataPoints = [{ time: t1, value: targetPrice }];
            }

            try {
              newLineSeries.setData(dataPoints);
            } catch (e) {
              console.error("Trendline Commit Error:", e, { t1, t2, dataPoints });
            }
            
            setFreestyleLines(prev => [...prev, {
               id: Math.random().toString(), date1: start.date, price1: start.price,
               date2: time, price2: targetPrice, color: state.lineColor, series: newLineSeries
            }]);
            
            setFreestyleStart(null);
            if (freestyleDraftSeriesRef.current) {
               chart.removeSeries(freestyleDraftSeriesRef.current);
               freestyleDraftSeriesRef.current = null;
            }
         }
      }
    };

    const crosshairMoveHandler = (param: any) => {
       const state = stateRef.current;
       const start = state.freestyleStart;
       if (state.drawMode === "freestyle" && start && param.point) {
          let time = param.time as string | null | undefined;
          if (!time && chartRef.current) {
             time = chartRef.current.timeScale().coordinateToTime(param.point.x) as string | null | undefined;
          }
          if (!time) return;

          const targetPrice = mainSeries.coordinateToPrice(param.point.y);
          if (targetPrice !== null) {
              if (!freestyleDraftSeriesRef.current) {
                 freestyleDraftSeriesRef.current = chart.addSeries(LineSeries, { color: state.lineColor, lineWidth: 2, lineStyle: LineStyle.Dashed });
              }
              
              const t1 = start.date;
              const t2 = time;
              
              const t1Val = typeof t1 === 'object' ? new Date((t1 as any).year, (t1 as any).month - 1, (t1 as any).day).getTime() : new Date(t1 as string).getTime();
              const t2Val = typeof t2 === 'object' ? new Date((t2 as any).year, (t2 as any).month - 1, (t2 as any).day).getTime() : new Date(t2 as string).getTime();
              
              let dataPoints = [];
              if (t1Val < t2Val) {
                 dataPoints = [{ time: t1, value: start.price }, { time: t2, value: targetPrice }];
              } else if (t1Val > t2Val) {
                 dataPoints = [{ time: t2, value: targetPrice }, { time: t1, value: start.price }];
              } else {
                 return;
              }
              
              try {
                freestyleDraftSeriesRef.current.setData(dataPoints);
              } catch(e) {
                console.error("Trendline Draft Error:", e, { t1, t2, dataPoints });
              }
          }
       }
    };
    
    chart.subscribeClick(clickHandler);
    chart.subscribeCrosshairMove(crosshairMoveHandler);

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.unsubscribeClick(clickHandler);
      chart.unsubscribeCrosshairMove(crosshairMoveHandler);
      try { chart.remove(); } catch (e) {}
      chartRef.current = null;
      mainSeriesRef.current = null;
      freestyleDraftSeriesRef.current = null;
    };
  }, [data]);

  const removeHorizontalLine = (id: string) => {
    setHorizontalLines((prev) => {
      const lineToRemove = prev.find(l => l.id === id);
      if (lineToRemove && mainSeriesRef.current) {
         mainSeriesRef.current.removePriceLine(lineToRemove.line);
      }
      return prev.filter((l) => l.id !== id);
    });
  };

  const removeFreestyleLine = (id: string) => {
    setFreestyleLines((prev) => {
      const lineToRemove = prev.find(l => l.id === id);
      if (lineToRemove && chartRef.current) {
         chartRef.current.removeSeries(lineToRemove.series);
      }
      return prev.filter((l) => l.id !== id);
    });
  };

  const clearAllLines = () => {
    horizontalLines.forEach(l => {
       if (mainSeriesRef.current) mainSeriesRef.current.removePriceLine(l.line);
    });
    freestyleLines.forEach(l => {
       if (chartRef.current) chartRef.current.removeSeries(l.series);
    });
    setHorizontalLines([]);
    setFreestyleLines([]);
    setFreestyleStart(null);
    if (freestyleDraftSeriesRef.current && chartRef.current) {
        chartRef.current.removeSeries(freestyleDraftSeriesRef.current);
        freestyleDraftSeriesRef.current = null;
    }
  };

  const handleAddManualHorizontalLine = () => {
    const numPrice = parseFloat(manualPrice);
    if (isNaN(numPrice) || numPrice <= 0 || !mainSeriesRef.current) return;
    
    const line = mainSeriesRef.current.createPriceLine({
       price: numPrice,
       color: lineColor,
       lineWidth: 2,
       lineStyle: LineStyle.Solid,
       axisLabelVisible: true,
       title: 'Manual Level',
    });

    setHorizontalLines((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        price: numPrice,
        color: lineColor,
        label: "Manual Level",
        line
      }
    ]);
    setManualPrice("");
  };

  const addHighResistanceLine = () => {
    if (!data?.data?.length || !mainSeriesRef.current) return;
    const prices = data.data.map((d: any) => d.close);
    const maxP = roundToTwo(Math.max(...prices));
    
    const line = mainSeriesRef.current.createPriceLine({
       price: maxP,
       color: "#ef4444",
       lineWidth: 2,
       lineStyle: LineStyle.Solid,
       axisLabelVisible: true,
       title: 'Resistance',
    });

    setHorizontalLines((prev) => [
      ...prev,
      { id: Math.random().toString(), price: maxP, color: "#ef4444", label: "Resistance (Period High)", line }
    ]);
  };

  const addLowSupportLine = () => {
    if (!data?.data?.length || !mainSeriesRef.current) return;
    const prices = data.data.map((d: any) => d.close);
    const minP = roundToTwo(Math.min(...prices));

    const line = mainSeriesRef.current.createPriceLine({
       price: minP,
       color: "#10b981",
       lineWidth: 2,
       lineStyle: LineStyle.Solid,
       axisLabelVisible: true,
       title: 'Support',
    });

    setHorizontalLines((prev) => [
      ...prev,
      { id: Math.random().toString(), price: minP, color: "#10b981", label: "Support (Period Low)", line }
    ]);
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

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-4 border-b pb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800 flex items-center">
                  Price & Volume History 
                  <span className="ml-2 text-xs bg-sky-100 text-sky-800 px-2 py-0.5 rounded-md font-semibold flex items-center">
                    <Target className="w-3 h-3 mr-1" /> TradingView Engine
                  </span>
                </h3>
              </div>

              <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200 flex-wrap">
                <button
                  onClick={() => { setDrawMode("pointer"); setFreestyleStart(null); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center transition ${
                    drawMode === "pointer" ? "bg-white text-gray-900 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  <MousePointer className="w-3.5 h-3.5 mr-1.5" /> Inspect
                </button>

                <button
                  onClick={() => { setDrawMode("horizontal"); setFreestyleStart(null); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center transition ${
                    drawMode === "horizontal" ? "bg-sky-500 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Minus className="w-3.5 h-3.5 mr-1.5" /> + Horizontal Line
                </button>

                <button
                  onClick={() => { setDrawMode("freestyle"); setFreestyleStart(null); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center transition ${
                    drawMode === "freestyle" ? "bg-purple-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5 mr-1.5" /> + Freestyle Trendline
                </button>

                <div className="flex items-center gap-1 pl-2 border-l border-gray-300">
                  <Palette className="w-3.5 h-3.5 text-gray-400 mr-1" />
                  {["#10b981", "#ef4444", "#0284c7", "#8b5cf6", "#f59e0b"].map((c) => (
                    <button
                      key={c}
                      onClick={() => setLineColor(c)}
                      className={`w-4 h-4 rounded-full transition transform ${lineColor === c ? "ring-2 ring-offset-1 ring-gray-600 scale-110" : "opacity-80 hover:opacity-100"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-1 pl-2 border-l border-gray-300">
                  <button
                    onClick={addHighResistanceLine}
                    className="px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded text-[11px] font-bold hover:bg-red-100 transition whitespace-nowrap"
                  >
                    + High (Resistance)
                  </button>
                  <button
                    onClick={addLowSupportLine}
                    className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[11px] font-bold hover:bg-emerald-100 transition whitespace-nowrap"
                  >
                    + Low (Support)
                  </button>
                </div>

                <div className="flex items-center gap-1 pl-2 border-l border-gray-300">
                  <input
                    type="number"
                    placeholder="₹ Price level"
                    value={manualPrice}
                    onChange={(e) => setManualPrice(e.target.value)}
                    className="w-24 px-2 py-1 text-xs border rounded bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  <button
                    onClick={handleAddManualHorizontalLine}
                    className="p-1 bg-sky-50 text-sky-600 border border-sky-200 rounded hover:bg-sky-100 transition"
                    title="Add Horizontal Line at Price"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {(horizontalLines.length > 0 || freestyleLines.length > 0) && (
                  <button
                    onClick={clearAllLines}
                    className="px-2.5 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg flex items-center transition ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear ({horizontalLines.length + freestyleLines.length})
                  </button>
                )}
              </div>
            </div>

            {drawMode !== "pointer" && (
              <div className="bg-sky-50 border border-sky-200 text-sky-800 text-xs px-4 py-2 rounded-lg flex justify-between items-center">
                <span>
                  {drawMode === "horizontal" && "🎯 Click anywhere on the chart (or use inputs above) to place a Horizontal Support/Resistance line."}
                  {drawMode === "freestyle" && (freestyleStart ? `🎯 Click Point 2 (End Date & Price) to complete trendline.` : "🎯 Click Point 1 (Start Date & Price) on the chart line to begin drawing freestyle trendline.")}
                </span>
                <button onClick={() => { setDrawMode("pointer"); setFreestyleStart(null); }} className="text-sky-600 hover:text-sky-900 font-bold text-xs underline">
                  Exit Draw Mode
                </button>
              </div>
            )}

            <div 
              ref={chartContainerRef}
              className={`h-[480px] relative rounded-xl transition ${drawMode !== "pointer" ? "cursor-crosshair ring-2 ring-sky-400" : ""}`}
            />
          </div>

          {(horizontalLines.length > 0 || freestyleLines.length > 0) && (
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
              <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center">
                Active Annotations
              </h4>
              <div className="flex flex-wrap gap-2">
                {horizontalLines.map((line) => (
                  <div key={line.id} className="flex items-center bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm text-xs">
                    <div className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: line.color }} />
                    <span className="font-semibold text-gray-800 mr-2">₹{line.price}</span>
                    <span className="text-gray-500 mr-3">{line.label}</span>
                    <button onClick={() => removeHorizontalLine(line.id)} className="text-gray-400 hover:text-red-500 transition">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {freestyleLines.map((line) => (
                  <div key={line.id} className="flex items-center bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm text-xs">
                    <div className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: line.color }} />
                    <span className="font-semibold text-gray-800 mr-1">₹{line.price1}</span>
                    <span className="text-gray-400 mx-1">→</span>
                    <span className="font-semibold text-gray-800 mr-3">₹{line.price2}</span>
                    <button onClick={() => removeFreestyleLine(line.id)} className="text-gray-400 hover:text-red-500 transition">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
