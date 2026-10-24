"use client";

import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  TrendingUp,
  Percent,
  Layers,
  Calendar,
  Smartphone,
  CreditCard,
  Banknote,
  BookOpen
} from "lucide-react";

export type ReportingPeriod = "daily" | "monthly" | "quarterly" | "yearly";

interface PeriodMetric {
  period: ReportingPeriod;
  label: string;
  unitsIn: number;
  unitsOut: number;
  revenue: number;
  cogs: number;
  paymentRails: {
    name: string;
    amount: number;
    sharePercent: number;
    color: string;
    icon: string;
  }[];
}

const PERIOD_DATA: Record<ReportingPeriod, PeriodMetric> = {
  daily: {
    period: "daily",
    label: "Today's Operations (Daily)",
    unitsIn: 45,
    unitsOut: 112,
    revenue: 35100,
    cogs: 26050,
    paymentRails: [
      { name: "Telebirr Merchant", amount: 18252, sharePercent: 52, color: "#6366F1", icon: "telebirr" },
      { name: "CBE Birr", amount: 10179, sharePercent: 29, color: "#8B5CF6", icon: "cbe" },
      { name: "Cash Till", amount: 5265, sharePercent: 15, color: "#10B981", icon: "cash" },
      { name: "Store Credit", amount: 1404, sharePercent: 4, color: "#F59E0B", icon: "credit" }
    ]
  },
  monthly: {
    period: "monthly",
    label: "Current Month (Monthly)",
    unitsIn: 1240,
    unitsOut: 2890,
    revenue: 890000,
    cogs: 660000,
    paymentRails: [
      { name: "Telebirr Merchant", amount: 462800, sharePercent: 52, color: "#6366F1", icon: "telebirr" },
      { name: "CBE Birr", amount: 258100, sharePercent: 29, color: "#8B5CF6", icon: "cbe" },
      { name: "Cash Till", amount: 133500, sharePercent: 15, color: "#10B981", icon: "cash" },
      { name: "Store Credit", amount: 35600, sharePercent: 4, color: "#F59E0B", icon: "credit" }
    ]
  },
  quarterly: {
    period: "quarterly",
    label: "Q3 Aggregation (Quarterly)",
    unitsIn: 4100,
    unitsOut: 8450,
    revenue: 2620000,
    cogs: 1940000,
    paymentRails: [
      { name: "Telebirr Merchant", amount: 1362400, sharePercent: 52, color: "#6366F1", icon: "telebirr" },
      { name: "CBE Birr", amount: 759800, sharePercent: 29, color: "#8B5CF6", icon: "cbe" },
      { name: "Cash Till", amount: 393000, sharePercent: 15, color: "#10B981", icon: "cash" },
      { name: "Store Credit", amount: 104800, sharePercent: 4, color: "#F59E0B", icon: "credit" }
    ]
  },
  yearly: {
    period: "yearly",
    label: "Fiscal 2026 Run-Rate (Yearly)",
    unitsIn: 16500,
    unitsOut: 32800,
    revenue: 10480000,
    cogs: 7760000,
    paymentRails: [
      { name: "Telebirr Merchant", amount: 5449600, sharePercent: 52, color: "#6366F1", icon: "telebirr" },
      { name: "CBE Birr", amount: 3039200, sharePercent: 29, color: "#8B5CF6", icon: "cbe" },
      { name: "Cash Till", amount: 1572000, sharePercent: 15, color: "#10B981", icon: "cash" },
      { name: "Store Credit", amount: 419200, sharePercent: 4, color: "#F59E0B", icon: "credit" }
    ]
  }
};

export default function LedgerAnalyticsVisualizer() {
  const [selectedPeriod, setSelectedPeriod] = useState<ReportingPeriod>("monthly");

  const currentData = useMemo(() => PERIOD_DATA[selectedPeriod], [selectedPeriod]);

  const grossProfit = currentData.revenue - currentData.cogs;
  const grossMargin = (grossProfit / currentData.revenue) * 100;
  const netDeltaUnits = currentData.unitsIn - currentData.unitsOut;

  // Bar chart dataset comparing Stock In vs Stock Out
  const barChartData = [
    {
      category: "Stock Inbound (+)",
      units: currentData.unitsIn,
      type: "inbound",
      fillColor: "#10B981"
    },
    {
      category: "Stock Outbound (-)",
      units: currentData.unitsOut,
      type: "outbound",
      fillColor: "#EF4444"
    }
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 md:p-6 text-slate-100 shadow-xl space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Immutable Ledger Analytics & Settlement Rails
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time reconciliation of double-entry stock movements against multi-rail payment intake.
          </p>
        </div>

        {/* Dropdown period switcher */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as ReportingPeriod)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="daily">Daily View (Today)</option>
            <option value="monthly">Monthly View (October 2026)</option>
            <option value="quarterly">Quarterly Aggregation (Q3)</option>
            <option value="yearly">Yearly Rollup (2026 YTD)</option>
          </select>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Inbound Receipts</span>
            <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-1.5 text-xl font-bold font-mono text-white">
            +{currentData.unitsIn.toLocaleString()}{" "}
            <span className="text-xs font-sans text-slate-500 font-normal">units</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-400 font-mono">PO Goods Receipts</div>
        </div>

        <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Outbound Dispatches</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="mt-1.5 text-xl font-bold font-mono text-white">
            -{currentData.unitsOut.toLocaleString()}{" "}
            <span className="text-xs font-sans text-slate-500 font-normal">units</span>
          </div>
          <div className="mt-1 text-[11px] text-rose-400 font-mono">
            Net Delta: {netDeltaUnits > 0 ? `+${netDeltaUnits}` : netDeltaUnits} units
          </div>
        </div>

        <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Gross Revenue</span>
            <DollarSign className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="mt-1.5 text-xl font-bold font-mono text-indigo-400">
            {currentData.revenue.toLocaleString()}{" "}
            <span className="text-xs font-sans text-slate-500 font-normal">ETB</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400 font-mono">
            COGS: {currentData.cogs.toLocaleString()} ETB
          </div>
        </div>

        <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Gross Profit & Margin</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-1.5 text-xl font-bold font-mono text-emerald-400">
            {grossProfit.toLocaleString()}{" "}
            <span className="text-xs font-sans text-slate-500 font-normal">ETB</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-400/90 font-mono">
            Margin Rate: {grossMargin.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Visualizer Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
        {/* Left Chart: Stock In vs Out Bar Chart */}
        <div className="lg:col-span-6 bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Double-Entry Inventory Movement Ledger
              </h3>
              <p className="text-[11px] text-slate-500">Gross Physical Stock Flow (Units)</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-300">
              {currentData.label}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis
                  dataKey="category"
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#334155" }}
                />
                <YAxis
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#334155" }}
                  tickFormatter={(val) => Number(val).toLocaleString()}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255, 255, 255, 0.03)" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs space-y-1">
                          <p className="font-semibold text-white">{data.category}</p>
                          <p className="font-mono text-emerald-400">
                            Volume: <span className="font-bold">{data.units.toLocaleString()} units</span>
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Locked Landed Cost Base Evaluated
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="units" radius={[6, 6, 0, 0]}>
                  {barChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fillColor} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 text-center text-xs font-mono">
            <div className="text-emerald-400">
              <span className="text-[10px] text-slate-500 uppercase block font-sans">Purchased In</span>
              +{currentData.unitsIn.toLocaleString()} Units
            </div>
            <div className="text-rose-400">
              <span className="text-[10px] text-slate-500 uppercase block font-sans">Dispensed Out</span>
              -{currentData.unitsOut.toLocaleString()} Units
            </div>
          </div>
        </div>

        {/* Right Chart: Multi-Rail Payment Settlement Doughnut */}
        <div className="lg:col-span-6 bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Multi-Rail Payment Settlement Channel Mix
              </h3>
              <p className="text-[11px] text-slate-500">Tender breakdown across electronic & cash rails</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-300">
              100% Reconciled
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={currentData.paymentRails}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="amount"
                  >
                    {currentData.paymentRails.map((entry, index) => (
                      <Cell key={`rail-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs space-y-1">
                            <p className="font-semibold text-white">{data.name}</p>
                            <p className="font-mono text-indigo-300">
                              Amount: {Number(data.amount).toLocaleString()} ETB
                            </p>
                            <p className="font-mono text-emerald-400">Share: {data.sharePercent}%</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Rail Legend Breakdown */}
            <div className="space-y-2 text-xs">
              {currentData.paymentRails.map((rail, idx) => (
                <div key={idx} className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: rail.color }}
                    />
                    <span className="text-slate-300 font-medium text-[11px]">{rail.name}</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-white font-bold block text-[11px]">
                      {rail.amount.toLocaleString()} <span className="text-[9px] text-slate-500">ETB</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">{rail.sharePercent}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">Cumulative Net Settled:</span>
            <span className="font-mono font-bold text-indigo-400 text-sm">
              {currentData.revenue.toLocaleString()} ETB
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
