import { Shield, Activity, AlertTriangle, TrendingDown, Building, Share2 } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-12 text-center mt-10">
        <div className="flex justify-center mb-6">
          <Shield className="w-16 h-16 text-indigo-600" />
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
          Welcome to AlphaSheild AI
        </h1>
        <p className="mt-4 text-xl text-gray-500 max-w-3xl mx-auto">
          An integrated market intelligence and risk analysis platform tailored for the Indian Stock Market (NSE).
          Powered by advanced machine learning models for anomaly detection, sentiment analysis, and regime-aware simulations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        <Link href="/anomaly">
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition cursor-pointer h-full">
            <Activity className="w-10 h-10 text-sky-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Anomaly & Leakage Screener</h2>
            <p className="text-gray-600">
              Uses Isolation Forests to detect unusual price and volume movements, flagging potential information leakage before major news breaks.
            </p>
          </div>
        </Link>

        <Link href="/manipulation">
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition cursor-pointer h-full">
            <AlertTriangle className="w-10 h-10 text-violet-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Pump-and-Dump Detector</h2>
            <p className="text-gray-600">
              Correlates anomalous trading activity with real-time news sentiment to identify coordinated manipulation patterns.
            </p>
          </div>
        </Link>

        <Link href="/stress-test">
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition cursor-pointer h-full">
            <TrendingDown className="w-10 h-10 text-emerald-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Regime-Aware Portfolio Stress Tester</h2>
            <p className="text-gray-600">
              Classifies current market regimes (Bull/Bear) using Hidden Markov Models and runs Monte Carlo simulations to estimate VaR and Drawdowns.
            </p>
          </div>
        </Link>

        <Link href="/ipo">
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition cursor-pointer h-full">
            <Building className="w-10 h-10 text-orange-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">AI IPO Evaluator</h2>
            <p className="text-gray-600">
              A rule-based scoring engine that evaluates upcoming IPOs based on financial health, retail/QIB demand, and valuation metrics.
            </p>
          </div>
        </Link>

        <Link href="/live">
          <div className="bg-black rounded-xl shadow-md p-6 border border-gray-800 hover:shadow-lg transition cursor-pointer h-full group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 to-purple-900/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <Activity className="w-10 h-10 text-green-500 mb-4 animate-pulse relative z-10" />
            <h2 className="text-xl font-bold mb-2 text-white relative z-10">Live Manipulation Tracking</h2>
            <p className="text-gray-400 relative z-10">
              Real-time tick-by-tick WebSocket tracking correlated with live news sentiment AI to detect ongoing bot campaigns and artificial hype.
            </p>
          </div>
        </Link>

        <Link href="/intelligence">
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition cursor-pointer h-full border-l-4 border-l-purple-500">
            <Share2 className="w-10 h-10 text-purple-600 mb-4" />
            <h2 className="text-xl font-bold mb-2">Corporate Intelligence</h2>
            <p className="text-gray-600">
              Uncover insider trading activity, detect hidden institutional block deals, and map circular shell company holding networks.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
