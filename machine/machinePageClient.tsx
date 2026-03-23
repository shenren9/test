"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { LineChart } from "../components/LineChart";
import { MachineList } from "../components/MachineList/MachineList";
import { Heatmap } from "../components/Heatmap/Heatmap";
import { getMachineData } from "./actions";
import { MachinePageClientProps, MachineChartData } from "./types";
import "./page.css";

export default function MachinePageClient({ 
  groups, machines, initialMachineId, initialChartData, initialSensor, initialTimeRange,
  metricsName, topPrediction, predictions: machinePreds
}: MachinePageClientProps) {  
  const [hydrated, setHydrated] = useState(false);
  const router = useRouter();

  const [comparedData, setComparedData] = useState<MachineChartData[]>([]);
  const [isFetchingCompare, setIsFetchingCompare] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    const refetchComparisons = async () => {
      if (comparedData.length === 0) return;
      setIsFetchingCompare(true);
      const step = Math.floor((initialTimeRange * 3600) / 30);
      
      const newData = await Promise.all(
        comparedData.map(async (cm) => {
          const m = machines.find(mac => mac.name === cm.machine);
          if (!m) return null;
          const data = await getMachineData(m.name, m.id, initialSensor, initialTimeRange, step);
          return data[0];
        })
      );
      
      setComparedData(newData.filter(Boolean) as MachineChartData[]);
      setIsFetchingCompare(false);
    };
    refetchComparisons();
  }, [initialSensor, initialTimeRange]); 
  
  const formattedChartData = useMemo(() => {
    if (!hydrated) return []; 
    const allData = [...initialChartData, ...comparedData];
    
    return allData.map(series => ({
      ...series,
      values: series.values.map(v => ({
        ...v,
        time: new Date(v.time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      }))
    }));
  }, [initialChartData, comparedData, hydrated]);

  const handleAddCompare = async (machineName: string) => {
    if (!machineName) return;
    setIsFetchingCompare(true);
    
    const targetMachine = machines.find(m => m.name === machineName);
    if (targetMachine) {
      const step = Math.floor((initialTimeRange * 3600) / 30);
      const data = await getMachineData(targetMachine.name, targetMachine.id, initialSensor, initialTimeRange, step);
      if (data && data.length > 0) {
        setComparedData(prev => [...prev, data[0]]);
      }
    }
    setIsFetchingCompare(false);
  };

  const handleRemoveCompare = (machineName: string) => {
    setComparedData(prev => prev.filter(d => d.machine !== machineName));
  };

  const handleSelectMachine = (name: string) => {
    router.push(`/machine?id=${encodeURIComponent(name)}&sensor=${initialSensor}&range=${initialTimeRange}`);
  };

  const handleSensorChange = (sensor: string) => {
    router.push(`/machine?id=${encodeURIComponent(initialMachineId)}&sensor=${sensor}&range=${initialTimeRange}`);
  };

  const handleRangeChange = (range: number) => {
    router.push(`/machine?id=${encodeURIComponent(initialMachineId)}&sensor=${initialSensor}&range=${range}`);
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
              
              {comparedData.length > 0 && (
                <div className="flex gap-2 mb-3 flex-wrap">
                  {comparedData.map(cmd => (
                    <div key={cmd.machine} className="flex items-center gap-2 bg-[#e8f4f8] text-[#2b5a7a] px-3 py-1.5 text-xs shadow-sm">
                      <span>{cmd.machine}</span>
                      <button 
                        onClick={() => handleRemoveCompare(cmd.machine)} 
                        title="Remove comparison"
                      >
                      X
                      </button>
                    </div>
                  ))}
                </div>
              )}

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

                <div className="sensor-selector mb-0">
                  <label>Compare:</label>
                  <select 
                    value=""
                    onChange={(e) => handleAddCompare(e.target.value)}
                    disabled={isFetchingCompare}
                    className="!w-[145px]"
                  >
                    <option value="" disabled>
                      {isFetchingCompare ? "Loading..." : "Select machine..."}
                    </option>
                    {machines
                      .filter(m => m.name !== initialMachineId && !comparedData.some(cmd => cmd.machine === m.name))
                      .map(m => (
                        <option key={m.id} value={m.name}>
                          {m.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="stats-column">
              <div className="prediction-grid">
                <div className="prediction-box purple">
                  <span className="label">Predicted Failure</span>
                  {topPrediction ? (
                    <>
                      <span className="value">
                        {hydrated ? Math.ceil((new Date(topPrediction.fail_timestamp).getTime() - Date.now()) / 86400000) : '-'}d
                      </span>
                      <span className="sub-label">{topPrediction.description}</span>
                      <span className="sub-label">{Math.round(topPrediction.certainty * 100)}% confidence</span>
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

            <Heatmap 
              predictions={machinePreds} 
              initialMachineId={initialMachineId} 
              hydrated={hydrated} 
            />

          </div>
        </section>
      </div>
    </main>
  );
}