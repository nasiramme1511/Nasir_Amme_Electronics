"use client";

import React, { useEffect, useState, useTransition } from "react";
import { getPurchaseOrders, receivePurchaseOrder } from "@/app/actions/retail";
import {
  Truck,
  PackageCheck,
  Clock,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Database,
  Calendar,
} from "lucide-react";

interface PurchaseOrderDTO {
  id: string;
  poNumber: string;
  orderDate: string;
  deliveryDue: string | null;
  supplierName: string;
  itemCount: number;
  totalUnits: number;
  totalCost: number;
  status: string;
}

interface PurchasesViewLiveProps {
  adminUserId?: string;
  hideHeader?: boolean;
}

export default function PurchasesViewLive({
  adminUserId = "usr-01",
  hideHeader = false,
}: PurchasesViewLiveProps) {
  const [orders, setOrders] = useState<PurchaseOrderDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [receivingId, setReceivingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadData = () => {
    setLoading(true);
    startTransition(async () => {
      try {
        const data = await getPurchaseOrders();
        setOrders(data);
        setLastSynced(new Date());
      } catch (err) {
        console.error("Failed to load POs from PostgreSQL", err);
      } finally {
        setLoading(false);
      }
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReceiveStock = async (poId: string, poNumber: string) => {
    setReceivingId(poId);
    setFeedback(null);
    try {
      await receivePurchaseOrder(poId, adminUserId);
      setFeedback({
        message: `Goods for order ${poNumber} successfully received and committed to PostgreSQL inventory ledger.`,
        type: "success",
      });
      loadData();
    } catch (err: any) {
      console.error("Receiving error:", err);
      setFeedback({
        message: err.message || "Failed to commit goods receipt to database.",
        type: "error",
      });
    } finally {
      setReceivingId(null);
    }
  };

  const totalCommittedCapital = orders.reduce((sum, o) => sum + o.totalCost, 0);
  const receivedOrdersCount = orders.filter((o) => o.status === "RECEIVED_FULL").length;
  const pendingOrdersCount = orders.filter((o) => o.status !== "RECEIVED_FULL").length;

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 font-sans">
      {/* Top Header / Toolbar */}
      {!hideHeader ? (
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Purchases & Goods Receiving
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Track inbound vendor shipments and commit stock into the PostgreSQL inventory ledger.
            </p>
          </div>

          <button
            onClick={loadData}
            disabled={loading || isPending}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || isPending ? "animate-spin text-indigo-600 dark:text-indigo-400" : ""}`} />
            Refresh Orders
          </button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              PostgreSQL Direct Ledger Active
            </span>
            {lastSynced && (
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono hidden sm:inline">
                • Synced {lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>

          <button
            onClick={loadData}
            disabled={loading || isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || isPending ? "animate-spin text-indigo-600 dark:text-indigo-400" : ""}`} />
            Refresh Orders
          </button>
        </div>
      )}

      {/* Financial & Status KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Procurement Value</div>
          <div className="mt-1 text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {totalCommittedCapital.toLocaleString("en-US", { minimumFractionDigits: 2 })}{" "}
            <span className="text-xs font-sans text-slate-400 font-normal">ETB</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            Across {orders.length} supplier orders
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Inbound Shipments Pending</div>
          <div className="mt-1 text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {pendingOrdersCount}{" "}
            <span className="text-xs font-sans text-slate-400 font-normal">orders</span>
          </div>
          <div className="mt-1 text-[11px] text-amber-600/80 dark:text-amber-400/80 font-mono">
            Awaiting warehouse receiving (GRN)
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Received & Stocked</div>
          <div className="mt-1 text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
            {receivedOrdersCount}{" "}
            <span className="text-xs font-sans text-slate-400 font-normal">orders</span>
          </div>
          <div className="mt-1 text-[11px] text-indigo-600/80 dark:text-indigo-400/80 font-mono">
            Ledger movements posted
          </div>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs border flex items-center gap-2 ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs font-mono text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-5 h-5 animate-spin text-indigo-600 dark:text-indigo-400" />
            <span>Querying purchase orders from PostgreSQL...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 dark:text-slate-400">
            No purchase orders currently recorded in PostgreSQL.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950/70 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800 font-mono">
                <tr>
                  <th className="py-3 px-4">PO Number & Date</th>
                  <th className="py-3 px-4">Supplier & Delivery Window</th>
                  <th className="py-3 px-4">Items / SKUs</th>
                  <th className="py-3 px-4 text-right">Total Cost (ETB)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                {orders.map((po) => {
                  const isReceived = po.status === "RECEIVED_FULL";
                  return (
                    <tr key={po.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{po.poNumber}</span>
                        <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                          {new Date(po.orderDate).toLocaleDateString()}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 dark:text-slate-200 block">{po.supplierName}</span>
                        {po.deliveryDue && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                            Due: {new Date(po.deliveryDue).toLocaleDateString()}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                        {po.itemCount} item(s) ({po.totalUnits} units)
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        {po.totalCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}{" "}
                        <span className="text-[10px] font-sans font-normal text-slate-500 dark:text-slate-400">ETB</span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        {isReceived ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" /> RECEIVED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                            <Clock className="w-3 h-3" /> ORDERED
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {!isReceived && (
                          <button
                            type="button"
                            onClick={() => handleReceiveStock(po.id, po.poNumber)}
                            disabled={receivingId === po.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            {receivingId === po.id ? "Receiving..." : "Receive Goods (GRN)"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
