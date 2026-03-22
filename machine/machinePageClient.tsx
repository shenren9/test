"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { LineChart } from "../components/LineChart";
import { MachineList } from "../components/MachineList/MachineList";
import { MachineChartData } from "./page";
import { useRouter } from "next/navigation";

import "./page.css";

interface Machine {
  id: string;
  name: string;
  group_name: string;
  group_id: string;
}

interface Group {
  name: string;
  id: string;
}

interface Prediction {
  id: number;
  kind: string;
  certainty: number;
  fail_timestamp: Date;
  created_at: Date;
  description: string;
  machine_name: string;
  machine_id: string;
  completed: boolean;
  verification_status: boolean | null;
}

interface Props {
  groups: Group[];
  machines: Machine[];
  initialMachineId: string;
  initialChartData: MachineChartData[];
  initialSensor: string;
  topPrediction: Prediction | null; 
  predictions: Prediction[];
  metricsName: string[];
  // MachineDbId is the machine id in the database
  // MachineId is the machine name in frontend
  fetchMachineData: (machineName: string, machineDbId: string, sensor: string, timeRangeHours: number, step: number) => Promise<MachineChartData[]>;
}

export default function MachinePageClient({ groups, machines, initialMachineId, initialChartData, initialSensor, 
  metricsName, fetchMachineData, topPrediction, predictions }: Props) {  
  const [selectedMachine, setSelectedMachine] = useState<string | null>(initialMachineId);
  const [sensorType, setSensorType] = useState<string>(initialSensor);
  const [timeRange, setTimeRange] = useState<number>(168);
  const [chartData, setChartData] = useState<MachineChartData[]>(initialChartData);
  const [heatmapData, setHeatmapData] = useState<{day: number, value: number}[]>([]);
  const [prediction, setPrediction] = useState<Prediction | null>(topPrediction);
  const [hydrated, setHydrated] = useState(false);
  
  useEffect(() => {
    setTimeout(() => {
      setHydrated(true);
    }, 0);
  }, []);
  
  const router = useRouter()
  const isInitialMount = useRef(true);
  const machineId = machines.find(m => m.name === selectedMachine)?.id || "";
  const machinePreds = useMemo(() => {
    return predictions.filter(p => p.machine_id === machineId);
  }, [predictions, machineId]);

  const formattedChartData = useMemo(() => {
    return chartData.map(series => ({
      ...series,
      values: series.values.map(v => ({
        ...v,
        time: new Date(v.time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      }))
    }));
  }, [chartData]);

  useEffect(() => {
    setSelectedMachine(initialMachineId);
    setChartData(initialChartData);
    setSensorType(initialSensor);
  }, [initialMachineId, initialChartData, initialSensor]);

  useEffect(() => {
    const data = [];
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
    setHeatmapData(data);
  }, [machinePreds]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    if (selectedMachine) {
      const step = Math.floor((timeRange * 3600) / 30);

      fetchMachineData(selectedMachine, machineId, sensorType, timeRange, step).then(data => setChartData(data));

      const top = machinePreds
        .filter(p => new Date(p.fail_timestamp) > new Date())
        .sort((a, b) => b.certainty - a.certainty)[0] || null;
      setPrediction(top);
    }
  }, [selectedMachine, sensorType, timeRange, fetchMachineData, machinePreds]);

  const handleSelectMachine = (name: string) => {
    setSelectedMachine(name);
    router.push(`/machine?id=${encodeURIComponent(name)}&sensor=${sensorType}`);
  };

  const handleSensorChange = (sensor: string) => {
    setSensorType(sensor);
    router.push(`/machine?id=${encodeURIComponent(selectedMachine || "")}&sensor=${sensor}`);
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
          {selectedMachine || 'Select a machine'}
        </div>

        <aside className="machine-sidebar">
          <MachineList 
            groups={groups}
            machines={machines}
            selectedMachines={selectedMachine ? [selectedMachine] : []}
            onSelectMachine={handleSelectMachine}
          />
        </aside>
        <section className="machine-content">
          <div className="machine-header-title hidden md:block">{selectedMachine || 'Select a machine'}</div>
          
          <div className="content-top-row">
            <div className="widget live-data-widget">
              <h2>Live Data</h2>
              <div className="chart-container">
                  <LineChart chartData={formattedChartData} />
              </div>
              
              <div className="flex flex-col md:flex-row gap-4 mt-4 md:items-center">
                <div className="sensor-selector mb-0">
                  <label>Sensor:</label>
                  <select value={sensorType} onChange={(e) => handleSensorChange(e.target.value)}>
                    {metricsName.map(metric => (
                      <option key={metric} value={metric}>
                        {metric}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="sensor-selector mb-0">
                  <label>Range:</label>
                  <select value={timeRange} onChange={(e) => setTimeRange(Number(e.target.value))}>
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
                <div className="prediction-box light-gray issues-box">
                  <span className="label">Top 3 Historical Breakdowns</span>
                  <ol>
                    <li>1. Leakage - 65%</li>
                    <li>2. Motor Breakdown - 45%</li>
                    <li>3. Heat Damage - 30%</li>
                  </ol>
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
                        if (selectedMachine) {
                          router.push(`/alert_view?machine=${encodeURIComponent(selectedMachine)}`);
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