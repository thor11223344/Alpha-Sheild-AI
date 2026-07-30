"use client";

import { useState, useRef } from "react";
import axios from "axios";
import { 
  Activity, 
  Search, 
  AlertCircle, 
  Minus, 
  TrendingUp, 
  MousePointer, 
  Trash2, 
  Plus, 
  Palette,
  X
} from "lucide-react";
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
  Bar,
  ReferenceLine
} from "recharts";

import { StockSelector } from "@/components/StockSelector";

interface HorizontalLine {
  id: string;
  price: number;
  color: string;
  label: string;
}

interface FreestyleLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

export default function AnomalyPage() {
  const [ticker, setTicker] = useState("RELIANCE");
  const [period, setPeriod] = useState("3y");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  // Trendline Drawing States
  const [drawMode, setDrawMode] = useState<"pointer" | "horizontal" | "freestyle">("pointer");
  const [lineColor, setLineColor] = useState<string>("#10b981"); // Default Emerald Green
  const [horizontalLines, setHorizontalLines] = useState<HorizontalLine[]>([]);
  const [freestyleLines, setFreestyleLines] = useState<FreestyleLine[]>([]);
  const [drawingStart, setDrawingStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDraftLine, setCurrentDraftLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [manualPrice, setManualPrice] = useState<string>("");

  const chartContainerRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    const cleanTicker = ticker.toUpperCase().replace(/\.NS$/i, "");
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(`http://localhost:8000/api/anomaly/?ticker=${cleanTicker}&period=${period}`);
      setData(response.data);
      setHorizontalLines([]);
      setFreestyleLines([]);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  };

  // Add Horizontal Line via manual price input
  const handleAddManualHorizontalLine = () => {
    const numPrice = parseFloat(manualPrice);
    if (isNaN(numPrice) || numPrice <= 0) return;
    setHorizontalLines((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        price: numPrice,
        color: lineColor,
        label: numPrice > (data?.data?.[data.data.length - 1]?.close || 0) ? "Resistance" : "Support"
      }
    ]);
    setManualPrice("");
  };

  // Canvas Click Handler for Horizontal & Freestyle drawing
  const handleChartClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!chartContainerRef.current || !data?.data?.length) return;
    const rect = chartContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    if (drawMode === "horizontal") {
      // Calculate Price based on click height
      const prices = data.data.map((d: any) => d.close);
      const minP = Math.min(...prices);
      const maxP = Math.max(...prices);
      const priceRange = maxP - minP || 1;
      
      // Top padding ~10%, bottom ~10%
      const chartTop = rect.height * 0.05;
      const chartHeight = rect.height * 0.85;
      const relativeY = Math.max(0, Math.min(1, (clickY - chartTop) / chartHeight));
      const calculatedPrice = roundToTwo(maxP - relativeY * priceRange);

      setHorizontalLines((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          price: calculatedPrice,
          color: lineColor,
          label: calculatedPrice > (data.data[data.data.length - 1]?.close || 0) ? "Resistance" : "Support"
        }
      ]);
    } else if (drawMode === "freestyle") {
      if (!drawingStart) {
        setDrawingStart({ x: clickX, y: clickY });
        setCurrentDraftLine({ x1: clickX, y1: clickY, x2: clickX, y2: clickY });
      } else {
        setFreestyleLines((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            x1: drawingStart.x,
            y1: drawingStart.y,
            x2: clickX,
            y2: clickY,
            color: lineColor
          }
        ]);
        setDrawingStart(null);
        setCurrentDraftLine(null);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (drawMode === "freestyle" && drawingStart && chartContainerRef.current) {
      const rect = chartContainerRef.current.getBoundingClientRect();
      const moveX = e.clientX - rect.left;
      const moveY = e.clientY - rect.top;
      setCurrentDraftLine({
        x1: drawingStart.x,
        y1: drawingStart.y,
        x2: moveX,
        y2: moveY
      });
    }
  };

  const roundToTwo = (val: number) => Math.round(val * 100) / 100;

  const removeHorizontalLine = (id: string) => {
    setHorizontalLines((prev) => prev.filter((l) => l.id !== id));
  };

  const removeFreestyleLine = (id: string) => {
    setFreestyleLines((prev) => prev.filter((l) => l.id !== id));
  };

  const clearAllLines = () => {
    setHorizontalLines([]);
    setFreestyleLines([]);
    setDrawingStart(null);
    setCurrentDraftLine(null);
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
                <h3 className="text-lg font-bold text-gray-800">Price & Volume History ({period === '3y' ? '3 Years' : period === '5y' ? '5 Years' : '1 Year'})</h3>
                <p className="text-xs text-gray-500">Historical closing prices with daily trading volume and interactive trendline drawing tools</p>
              </div>

              {/* Drawing Toolbar */}
              <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200 flex-wrap">
                <button
                  onClick={() => setDrawMode("pointer")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center transition ${
                    drawMode === "pointer" ? "bg-white text-gray-900 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  <MousePointer className="w-3.5 h-3.5 mr-1.5" /> Inspect
                </button>

                <button
                  onClick={() => setDrawMode("horizontal")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center transition ${
                    drawMode === "horizontal" ? "bg-sky-500 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Minus className="w-3.5 h-3.5 mr-1.5" /> + Horizontal Line
                </button>

                <button
                  onClick={() => setDrawMode("freestyle")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center transition ${
                    drawMode === "freestyle" ? "bg-purple-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5 mr-1.5" /> + Freestyle Trendline
                </button>

                {/* Color Palette Selector */}
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

                {/* Manual Price Level Input */}
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

            {/* Instruction Banner when Drawing */}
            {drawMode !== "pointer" && (
              <div className="bg-sky-50 border border-sky-200 text-sky-800 text-xs px-4 py-2 rounded-lg flex justify-between items-center">
                <span>
                  {drawMode === "horizontal" && "💡 Click anywhere on the chart canvas (or type price above) to place a horizontal Support/Resistance line."}
                  {drawMode === "freestyle" && (drawingStart ? "💡 Click endpoint (Point 2) to finish drawing the trendline." : "💡 Click start point (Point 1) on chart to begin trendline.")}
                </span>
                <button onClick={() => setDrawMode("pointer")} className="text-sky-600 hover:text-sky-900 font-bold text-xs underline">
                  Exit Draw Mode
                </button>
              </div>
            )}

            {/* Interactive Chart Container */}
            <div 
              ref={chartContainerRef}
              onClick={handleChartClick}
              onMouseMove={handleMouseMove}
              className={`h-[480px] relative rounded-xl transition ${drawMode !== "pointer" ? "cursor-crosshair ring-2 ring-sky-300" : ""}`}
            >
              {/* Overlay SVG for Freestyle Lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
                {freestyleLines.map((line) => (
                  <g key={line.id}>
                    <line 
                      x1={line.x1} 
                      y1={line.y1} 
                      x2={line.x2} 
                      y2={line.y2} 
                      stroke={line.color} 
                      strokeWidth={2.5} 
                      strokeDasharray="4 4"
                    />
                    <circle cx={line.x1} cy={line.y1} r={4.5} fill={line.color} stroke="#fff" strokeWidth={1.5} />
                    <circle cx={line.x2} cy={line.y2} r={4.5} fill={line.color} stroke="#fff" strokeWidth={1.5} />
                  </g>
                ))}
                {currentDraftLine && (
                  <g>
                    <line 
                      x1={currentDraftLine.x1} 
                      y1={currentDraftLine.y1} 
                      x2={currentDraftLine.x2} 
                      y2={currentDraftLine.y2} 
                      stroke={lineColor} 
                      strokeWidth={2} 
                      strokeDasharray="3 3"
                    />
                    <circle cx={currentDraftLine.x1} cy={currentDraftLine.y1} r={4} fill={lineColor} />
                  </g>
                )}
              </svg>

              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.data} margin={{ top: 15, right: 20, left: 15, bottom: 25 }}>
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

                  {/* Horizontal User-Placed Lines */}
                  {horizontalLines.map((line) => (
                    <ReferenceLine 
                      key={line.id} 
                      yAxisId="left" 
                      y={line.price} 
                      stroke={line.color} 
                      strokeWidth={2} 
                      strokeDasharray="4 4"
                      label={{ 
                        value: `${line.label}: ₹${line.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
                        fill: line.color, 
                        position: 'right', 
                        fontSize: 11, 
                        fontWeight: 700 
                      }}
                    />
                  ))}

                  {drawMode === "pointer" && (
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
                  )}

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

            {/* Active User Lines Management Panel */}
            {(horizontalLines.length > 0 || freestyleLines.length > 0) && (
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Active Drawn Trendlines ({horizontalLines.length + freestyleLines.length})</span>
                  <button onClick={clearAllLines} className="text-red-600 hover:text-red-800 text-[11px] underline font-semibold">
                    Clear All
                  </button>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {horizontalLines.map((line) => (
                    <span 
                      key={line.id} 
                      className="inline-flex items-center text-xs px-2.5 py-1 bg-white rounded-lg border shadow-sm gap-2"
                      style={{ borderColor: line.color }}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: line.color }} />
                      <span className="font-semibold text-gray-800">Horizontal: ₹{line.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      <button onClick={() => removeHorizontalLine(line.id)} className="text-gray-400 hover:text-red-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                  {freestyleLines.map((line, idx) => (
                    <span 
                      key={line.id} 
                      className="inline-flex items-center text-xs px-2.5 py-1 bg-white rounded-lg border shadow-sm gap-2"
                      style={{ borderColor: line.color }}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: line.color }} />
                      <span className="font-semibold text-gray-800">Freestyle Trend #{idx + 1}</span>
                      <button onClick={() => removeFreestyleLine(line.id)} className="text-gray-400 hover:text-red-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
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
