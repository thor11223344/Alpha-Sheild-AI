"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2, ArrowUpRight, ArrowDownRight, Briefcase, Activity, Share2, AlertTriangle } from "lucide-react";
import dynamic from 'next/dynamic';

// ForceGraph2D requires browser environment, so we dynamically import it with ssr: false
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

export default function IntelligenceDashboard() {
  const [ticker, setTicker] = useState("RELIANCE");
  const [loading, setLoading] = useState(false);
  const [insiderData, setInsiderData] = useState<any>(null);
  const [smartMoneyData, setSmartMoneyData] = useState<any>(null);
  const [networkData, setNetworkData] = useState<any>(null);

  const fetchIntelligence = async (searchTicker: string) => {
    setLoading(true);
    try {
      const [insiderRes, smartMoneyRes, networkRes] = await Promise.all([
        fetch(`http://127.0.0.1:8000/api/intelligence/insider/${searchTicker}`),
        fetch(`http://127.0.0.1:8000/api/intelligence/smart-money/${searchTicker}`),
        fetch(`http://127.0.0.1:8000/api/intelligence/network/${searchTicker}`)
      ]);

      const insider = await insiderRes.json();
      const smartMoney = await smartMoneyRes.json();
      const network = await networkRes.json();

      setInsiderData(insider);
      setSmartMoneyData(smartMoney);
      setNetworkData(network);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchIntelligence(ticker);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchIntelligence(ticker);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8 pt-24 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">Corporate Intelligence</h1>
            <p className="text-gray-600 mt-2">Uncover insider trading, block deals, and circular shell networks.</p>
          </div>
          <form onSubmit={handleSearch} className="flex w-full md:w-auto">
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="Enter NSE Ticker..."
              className="px-4 py-3 rounded-l-xl border-gray-300 focus:ring-black focus:border-black w-full md:w-64 border shadow-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-black text-white px-6 py-3 rounded-r-xl hover:bg-gray-800 transition disabled:opacity-50 flex items-center shadow-sm"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            </button>
          </form>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-gray-400" />
          </div>
        )}

        {!loading && insiderData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Insider Trading Tracker */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[500px]">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-indigo-600" />
                    Insider Trading Activity
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">Recent Promoter / Executive Transactions</p>
                </div>
              </div>
              <div className="overflow-y-auto flex-1 p-0">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Insider</th>
                      <th className="px-6 py-3">Type</th>
                      <th className="px-6 py-3">Shares</th>
                      <th className="px-6 py-3 text-right">Value (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insiderData.insider_trades?.length === 0 && (
                      <tr><td colSpan={5} className="text-center py-8 text-gray-500">No recent insider filings found.</td></tr>
                    )}
                    {insiderData.insider_trades?.map((trade: any, idx: number) => (
                      <tr key={idx} className="bg-white border-b hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{trade.date}</td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {trade.insider}
                          <div className="text-xs text-gray-500 font-normal">{trade.position}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center w-fit gap-1 ${
                            trade.transaction_type === 'Buy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {trade.transaction_type === 'Buy' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {trade.transaction_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-700">{trade.shares.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right font-mono text-gray-900">{trade.value.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Smart Money Tracker */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[500px]">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    Smart Money Block Deals
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">High Volume + Low Volatility Detection (Last 6 Months)</p>
                </div>
              </div>
              <div className="overflow-y-auto flex-1 p-0">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Price</th>
                      <th className="px-6 py-3">Vol Spike</th>
                      <th className="px-6 py-3">Classification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {smartMoneyData?.blocks?.length === 0 && (
                      <tr><td colSpan={4} className="text-center py-8 text-gray-500">No block deals detected.</td></tr>
                    )}
                    {smartMoneyData?.blocks?.map((block: any, idx: number) => (
                      <tr key={idx} className="bg-white border-b hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{block.date}</td>
                        <td className="px-6 py-4 font-mono">₹{block.price}</td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-red-600">{block.volume_ratio}x</span> avg
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            block.classification.includes('Accumulation') ? 'bg-green-100 text-green-700' :
                            block.classification.includes('Distribution') ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {block.classification}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Corporate Network Graph */}
            <div className="col-span-1 lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-purple-600" />
                    Corporate Entity Network
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">Visualization of known cross-holdings, promoters, and suspected shell circular routes.</p>
                </div>
                <div className="flex items-center gap-2 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-lg text-sm font-medium border border-orange-200">
                  <AlertTriangle className="w-4 h-4" />
                  Graph is interactive. Drag nodes to explore.
                </div>
              </div>
              <div className="h-[600px] w-full bg-gray-50 relative cursor-grab active:cursor-grabbing">
                {networkData && networkData.nodes && typeof window !== "undefined" && (
                  <ForceGraph2D
                    graphData={networkData}
                    nodeLabel="name"
                    nodeAutoColorBy="group"
                    nodeRelSize={6}
                    linkColor={() => "#cbd5e1"}
                    linkWidth={2}
                    linkDirectionalArrowLength={3.5}
                    linkDirectionalArrowRelPos={1}
                    // Custom link text drawing
                    linkCanvasObjectMode={() => 'after'}
                    linkCanvasObject={(link: any, ctx: CanvasRenderingContext2D) => {
                      const MAX_FONT_SIZE = 4;
                      const LABEL = link.label;
                      if (!LABEL) return;
                      const start = link.source;
                      const end = link.target;
                      // ignore unbound links
                      if (typeof start !== 'object' || typeof end !== 'object') return;
                      const textPos = {
                        x: start.x + (end.x - start.x) / 2,
                        y: start.y + (end.y - start.y) / 2
                      };
                      const relLink = { x: end.x - start.x, y: end.y - start.y };
                      const maxTextLength = Math.sqrt(Math.pow(relLink.x, 2) + Math.pow(relLink.y, 2)) - 10;
                      let textAngle = Math.atan2(relLink.y, relLink.x);
                      // maintain label vertical orientation
                      if (textAngle > Math.PI / 2) textAngle = -(Math.PI - textAngle);
                      if (textAngle < -Math.PI / 2) textAngle = -(Math.PI + textAngle);
                      
                      const fontSize = Math.min(MAX_FONT_SIZE, maxTextLength / LABEL.length);
                      ctx.font = `${fontSize}px Sans-Serif`;
                      const textWidth = ctx.measureText(LABEL).width;
                      const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); // some padding
                      ctx.save();
                      ctx.translate(textPos.x, textPos.y);
                      ctx.rotate(textAngle);
                      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                      ctx.fillRect(- bckgDimensions[0] / 2, - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);
                      ctx.textAlign = 'center';
                      ctx.textBaseline = 'middle';
                      ctx.fillStyle = '#64748b';
                      ctx.fillText(LABEL, 0, 0);
                      ctx.restore();
                    }}
                  />
                )}
              </div>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}
