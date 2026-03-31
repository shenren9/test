"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Prediction } from "../../machine/types";
import "./Heatmap.css";

interface HeatmapProps {
  predictions: Prediction[];
  initialMachineId: string;
  hydrated: boolean;
}

export const Heatmap = ({ predictions, initialMachineId, hydrated }: HeatmapProps) => {
  const router = useRouter();

  const heatmapData = useMemo(() => {
    const data = [];
    if (!hydrated) {
      for (let i = 0; i < 91; i++) data.push({ week: i, value: 0 });
      return data;
    }
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const counts = new Array(91).fill(0);

    predictions.forEach(p => {
      if (p.completed && p.verification_status === true) {
        const failDate = new Date(p.fail_timestamp);
        const failDay = new Date(failDate.getFullYear(), failDate.getMonth(), failDate.getDate());
        const diffTime = today.getTime() - failDay.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const diffWeeks = Math.floor(diffDays / 7);
        if (diffWeeks >= 0 && diffWeeks <= 90) {
          counts[90 - diffWeeks] += 1;
        }
      }
    });

    for (let i = 0; i < 91; i++) {
      data.push({ week: i, value: counts[i] });
    }
    return data;
  }, [predictions, hydrated]);

  const getColorClass = (value: number) => {
    if (value >= 4) return "bg-[#1a3a5f]";
    switch (value) {
      case 1: return "bg-[#d1e1f0]";
      case 2: return "bg-[#9FBFD7]";
      case 3: return "bg-[#35699f]";
      default: return "bg-[#ebedf0]";
    }
  };

  return (
    <div className="widget common-issues-heatmap">
      <div className="heatmap-header">
        <h2>Failure Alerted Frequency (Last 90 Weeks)</h2>
      </div>
      <div className="heatmap-grid-container">
        <div className="heatmap-grid">
          {heatmapData.map((data) => (
            <div
              key={data.week}
              className={`heatmap-cell ${getColorClass(data.value)} cursor-pointer`}
              title={`Activity level: ${data.value}`}
              onClick={() => {
                if (initialMachineId) {
                  router.push(`/alert_view?machine=${encodeURIComponent(initialMachineId)}`);
                }
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};