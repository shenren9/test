"use client";

import { useState, useEffect } from "react";
import { AlertItem } from "@/app/components/AlertItem/AlertItem";

interface Prediction {
  id: string;
  kind: string;
  certainty: number;
  fail_timestamp: Date;
  created_at: Date;
  description: string;
  machine_name: string;
  completed: boolean;
}

export default function DashboardAlertsList({ alerts }: { alerts: Prediction[] }) {
  const [showIncomplete, setShowIncomplete] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [now, setNow] = useState<number>(0);
  const [hydrated, setHydrated] = useState(false);
  
  useEffect(() => {
    setNow(Date.now());
    setHydrated(true);
  }, []);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 670);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const incompleteAlerts = alerts.filter((a) => !a.completed);
  const completedAlerts = alerts.filter((a) => a.completed);

  if (!hydrated) {
    return null;
  }

  if (alerts.length === 0) {
    return <p className="no-alerts text-center py-4">No active alerts</p>;
  }

  return (
    <>
      <section className="flex flex-col mb-4">
        <div className="sticky top-0 z-30 bg-white pb-1">
          <button
            onClick={() => setShowIncomplete(!showIncomplete)}
            className="flex items-center justify-between w-full px-3 py-2 text-sm font-bold text-[#2b5a7a] bg-[#f8fafc] border border-gray-200 rounded shadow-sm"
          >
            <span>Incomplete ({incompleteAlerts.length})</span>
            <span className="text-xs">{showIncomplete ? "▲" : "▼"}</span>
          </button>
        </div>

        {showIncomplete && (
          <div className="isolate px-2 py-2 space-y-2 overflow-hidden">
            {incompleteAlerts.map((alert) => (
              <AlertItem
                key={alert.id}
                id={alert.id}
                machineName={alert.machine_name}
                fault={alert.description}
                severity={alert.kind as "Y1" | "Y2" | "Spike"}
                percentage={alert.certainty}
                created={alert.created_at}
                failDate={alert.fail_timestamp}
                now={now}
                isMobile={isMobile}
                completed={alert.completed}
              />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col">
        <div className="sticky top-0 z-20 bg-white pb-1">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center justify-between w-full px-3 py-2 text-sm font-bold text-gray-500 bg-[#f8fafc] border border-gray-200 rounded shadow-sm"
          >
            <span>Completed ({completedAlerts.length})</span>
            <span className="text-xs">{showCompleted ? "▲" : "▼"}</span>
          </button>
        </div>

        {showCompleted && (
          <div className="isolate px-2 py-2 space-y-2 overflow-hidden opacity-75">
            {completedAlerts.map((alert) => (
              <AlertItem
                key={alert.id}
                id={alert.id}
                machineName={alert.machine_name}
                fault={alert.description}
                severity={alert.kind as "Y1" | "Y2" | "Spike"}
                percentage={alert.certainty}
                created={alert.created_at}
                failDate={alert.fail_timestamp}
                now={now}
                isMobile={isMobile}
                completed={alert.completed}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
