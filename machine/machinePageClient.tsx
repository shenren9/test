"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { LineChart } from "../components/LineChart";
import { MachineList } from "../components/MachineList/MachineList";
import { Machine, Group, Prediction, MachineChartData } from "./types";
import "./page.css";

interface Props {
  groups: Group[];
  machines: Machine[];
  initialMachineId: string;
  initialChartData: MachineChartData[];
  initialSensor: string;
  initialTimeRange: number;
  topPrediction: Prediction | null; 
  predictions: Prediction[];
  metricsName: string[];
}

export default function MachinePageClient({ 
  groups, machines, initialMachineId, initialChartData, initialSensor, initialTimeRange,
  metricsName, topPrediction, predictions: machinePreds
}: Props) {  
  const [hydrated, setHydrated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setHydrated(true);
  }, []);

  const heatmapData = useMemo(() => {
    const data = [];
    if (!hydrated) {
      for (let i = 0; i < 91; i++) data.push({ day: i, value: 0 });
      return data;
    }
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const counts = new Array(91).fill(0);

    machinePreds.forEach(p => {
      if (p.completed && p.verification_status === true) {
        const failDate = new Date(p.fail_timestamp);
        const failDay = new Date(failDate.getFullYear(), failDate.getMonth(), failDate.getDate());
        const diffTime = today.getTime() - failDay.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 90) {
          counts[90 - diffDays] += 1;
        }
      }
    });

    for (let i = 0; i < 91; i++) {
      data.push({ day: i, value: counts[i] });
    }
    return data;
  }, [machinePreds, hydrated]);

  const prediction = useMemo(() => {
    if (!hydrated && topPrediction) return topPrediction;
    return machinePreds
      .filter(p => new Date(p.fail_timestamp) > new Date())
      .sort((a, b) => b.certainty - a.certainty)[0] || null;
  }, [machinePreds, topPrediction, hydrated]);

  const formattedChartData = useMemo(() => {
    if (!hydrated) return []; 
    return initialChartData.map(series => ({
      ...series,
      values: series.values.map(v => ({
        ...v,
        time: new Date(v.time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      }))
    }));
  }, [initialChartData, hydrated]);

  const handleSelectMachine = (name: string) => {
    router.push(`/machine?id=${encodeURIComponent(name)}&sensor=${initialSensor}&range=${initialTimeRange}`);
  };

  const handleSensorChange = (sensor: string) => {
    router.push(`/machine?id=${encodeURIComponent(initialMachineId)}&sensor=${sensor}&range=${initialTimeRange}`);
  };

  const handleRangeChange = (range: number) => {
    router.push(`/machine?id=${encodeURIComponent(initialMachineId)}&sensor=${initialSensor}&range=${range}`);
  };

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
    <main className="machine-dashboard">
      <div className="main-container">
        <div className="machine-header-title block md:hidden pt-6 px-4 pb-0 text-center text-2xl font-bold text-[#35699f] capitalize">
          {initialMachineId || 'Select a machine'}
        </div>

        <aside className="machine-sidebar">
          <MachineList 
            groups={groups}
            machines={machines}
            selectedMachines={initialMachineId ? [initialMachineId] : []}
            onSelectMachine={handleSelectMachine}
          />
        </aside>
        <section className="machine-content">
          <div className="machine-header-title hidden md:block">{initialMachineId || 'Select a machine'}</div>
          
          <div className="content-top-row">
            <div className="widget live-data-widget">
              <h2>Live Data</h2>
              <div className="chart-container">
                  <LineChart chartData={formattedChartData} />
              </div>
              
              <div className="flex flex-col md:flex-row gap-4 mt-4 md:items-center">
                <div className="sensor-selector mb-0">
                  <label>Sensor:</label>
                  <select value={initialSensor} onChange={(e) => handleSensorChange(e.target.value)}>
                    {metricsName.map(metric => (
                      <option key={metric} value={metric}>
                        {metric}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="sensor-selector mb-0">
                  <label>Range:</label>
                  <select value={initialTimeRange} onChange={(e) => handleRangeChange(Number(e.target.value))}>
                    <option value={24}>1 Day</option>
                    <option value={168}>7 Days</option>
                    <option value={336}>14 Days</option>
                    <option value={720}>30 Days</option>
                  </select>
                </div>
              </div>

            </div>

            <div className="stats-column">
              <div className="prediction-grid">
                <div className="prediction-box purple">
                  <span className="label">Predicted Failure</span>
                  {prediction ? (
                    <>
                      <span className="value">
                        {hydrated ? Math.ceil((new Date(prediction.fail_timestamp).getTime() - Date.now()) / 86400000) : '-'}d
                      </span>
                      <span className="sub-label">{prediction.description}</span>
                      <span className="sub-label">{Math.round(prediction.certainty * 100)}% confidence</span>
                    </>
                  ) : (
                    <>
                      <span className="value">-</span>
                      <span className="sub-label">No prediction available</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="content-bottom-row">
            <div className="widget alert-history">
              <div className="widget-header">
                <h2>Alert History</h2> 
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Description</th>
                    <th>Severity</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {machinePreds.length > 0 ? (
                    machinePreds.map((p) => (
                      <tr key={p.id}>
                        <td>{hydrated ? new Date(p.created_at).toLocaleDateString() : '-/-/----'}</td>
                        <td>{hydrated ? new Date(p.created_at).toLocaleTimeString() : '-:--:--'}</td>
                        <td>{p.description}</td>
                        <td>{p.kind}</td>
                        <td>{Math.round(p.certainty * 100)}%</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5}>No alert history available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="widget common-issues-heatmap">
              <div className="heatmap-header">
                <h2>Failure Alerted Frequency (Last 90 Days)</h2>
              </div>
              <div className="heatmap-grid-container">
                <div className="heatmap-grid">
                  {heatmapData.map((data) => (
                    <div
                      key={data.day}
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
          </div>
        </section>
      </div>
    </main>
  );
}