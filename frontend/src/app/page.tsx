import { Shield, Activity, AlertTriangle, TrendingDown, Building } from "lucide-react";
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
      </div>
    </div>
  );
}
