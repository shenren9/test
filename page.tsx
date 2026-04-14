import { MachineItem } from "./components/MachineItem/MachineItem";
import DashboardAlertsList from "./components/DashboardAlertsList";
import { requireSession } from "@/lib/require-session";
import { pool } from "@/lib/db";
import { fetchMachinePredictions } from "@/lib/actions";
import { DonutChart } from "./components/DonutChart/DonutChartWrapper";

import "./page.css";

interface Prediction {
  id: string;
  kind: string;
  certainty: number;
  fail_timestamp: Date;
  created_at: Date;
  description: string;
  machine_name: string;
  completed: boolean;
  verification_status: boolean | null;
}

interface MachineRow {
  id: number;
  name: string;
  site_id: string;
  latest_status: string;
}

interface DonutRow {
  status: string;
  value: number;
}

async function getMachineData() {
  const query = `
    SELECT
      m.id,
      m.name,
      m.site_id,
      COALESCE(p.kind, 'GOOD') as latest_status
    FROM machines m
    LEFT JOIN (
      SELECT DISTINCT ON (machine_id) machine_id, kind
      FROM predictions WHERE completed = False AND kind IN ('Y1', 'Y2')
      ORDER BY machine_id, CASE kind WHEN 'Y2' THEN 1 WHEN 'Y1' THEN 2 ELSE 3 END ASC, created_at DESC
    ) p ON m.id = p.machine_id
    ORDER BY m.id ASC
  `;

  try {
    const { rows }: { rows: MachineRow[] } = await pool.query(query);

    return rows.map((machine: MachineRow, index: number) => ({
      id: index + 1,
      name: machine.name,
      zone: machine.site_id,
      status: machine.latest_status,
    }));
  } catch (err) {
    console.error("Error fetching machine data:", err);
    return [];
  }
}

async function getDonutData() {
  const query = `
    SELECT
        COALESCE(p.kind, 'GOOD') as status,
        COUNT(*)::int as value
    FROM machines m
    LEFT JOIN (
        SELECT DISTINCT ON (machine_id) machine_id, kind
        FROM predictions WHERE completed = False AND kind IN ('Y1', 'Y2')
        ORDER BY machine_id, CASE kind WHEN 'Y2' THEN 1 WHEN 'Y1' THEN 2 ELSE 3 END ASC, created_at DESC
    ) p ON m.id = p.machine_id
    GROUP BY status;
  `;

  try {
    const { rows }: { rows: DonutRow[] } = await pool.query(query);
    const counts = Object.fromEntries(rows.map((r) => [r.status, r.value]));

    // Convert notification "kind" from sheet to display name
    const order = [
      { key: "GOOD", label: "Stable" },
      { key: "Y2", label: "Y2" },
      { key: "Y1", label: "Y1" },
    ];

    return order.map((item) => ({
      machine: item.label,
      value: counts[item.key] || 0,
    }));
  } catch (err) {
    console.error("Donut Query Error:", err);
    return [
      { machine: "Stable", value: 0 },
      { machine: "Y2", value: 0 },
      { machine: "Y1", value: 0 },
    ];
  }
}

async function getModelData() {
  const query = `
    SELECT created_at FROM sap s
    LIMIT 1
  `;
  try {
const result = await pool.query(query);
    const row = result.rows[0];
    if (!row) return null;
    const diffMs = Date.now() - new Date(row.created_at).getTime(); 
    const totalMins = Math.floor(diffMs / (1000 * 60));
    const days = Math.floor(totalMins / (60 * 24));
    const hours = Math.floor((totalMins % (60 * 24)) / 60);
    const mins = totalMins % 60;
    const parts = [];
    
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0 || parts.length === 0) parts.push(`${mins}m`);
    return parts.join(' ');
  } catch (err) {
    console.error("GetModelData error:", err);
    return null;
  }
}

export default async function Dashboard() {
  await requireSession("/");

  const machines = await getMachineData();
  const status_counts = await getDonutData();
  const { ok: predictionsOk, data: allAlerts } = await fetchMachinePredictions();
  const modelTrained = await getModelData();
  const safeAlerts = predictionsOk && allAlerts ? allAlerts : [];
  const highPriorityAlerts = safeAlerts.filter((alert: Prediction) => alert.kind === "Y2" && alert.completed === false && new Date(alert.fail_timestamp).getTime() > Date.now())
  .sort((a: Prediction, b: Prediction) => (new Date(a.fail_timestamp).getTime() - new Date(b.fail_timestamp).getTime()));
  const uncompletedAlerts = highPriorityAlerts.filter((alert: Prediction) => !alert.completed);
  const upcomingAlert = uncompletedAlerts.find((alert: Prediction) => new Date(alert.fail_timestamp).getTime() > Date.now());
  const daysUntilNextAlert = upcomingAlert ? Math.ceil((new Date(upcomingAlert.fail_timestamp)
  .getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const pastVerifiedAlerts = safeAlerts.filter((alert: Prediction) => 
    alert.verification_status !== null && new Date(alert.fail_timestamp).getTime() < Date.now());
  const positiveAlerts = pastVerifiedAlerts.filter((alert: Prediction) => alert.verification_status === true);
  const modelAccuracy = pastVerifiedAlerts.length > 0 ? Math.round((positiveAlerts.length / pastVerifiedAlerts.length) * 100) : 0;

  return (
    <main className="home-dashboard">
      <div className="bento-grid">
        <div className="overview-card">
          <h2 className="card-title">Overview</h2>
          <div className="overview-content">
              <div className="overview-stats">
              <div className="stat-box">
                <span className="stat-label">High Priority Alerts</span>
                <span className="stat-value">{uncompletedAlerts.length}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Model Accuracy</span>
                <span className="stat-value">{modelAccuracy}%</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Next Failure</span>
                <span className="stat-value">{daysUntilNextAlert !== null ? `${daysUntilNextAlert}d` : '-'}</span>
                <span className="stat-detail">{upcomingAlert ? `${upcomingAlert.machine_name} : ${upcomingAlert.description[0] ?? "No description available"}` : 'No alerts'}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Time Since Last Train</span>
                <span className="stat-value">{modelTrained !== null ? modelTrained : '-'}</span>
              </div>
            </div>
            <div className="overview-chart">
              <div className="piechart">
                <DonutChart chartData={status_counts} />
              </div>
            </div>
          </div>
          <div className="overview-content-mobile h-40">
            <div className="overview-content-mobile-chips aspect-square bg-[#9FD2FF] text-[#1a3a5f] p-2">
              <span className="text-8xl font-bold leading-none">3</span>
              <span className="text-[10px] font-bold uppercase tracking-wider mt-1 text-center leading-tight">
                Action Items
              </span>
            </div>
            <div className="overview-content-mobile-chips flex-1 bg-gray-50 p-1">
              <DonutChart chartData={status_counts} position={"bottom"} />
            </div>
          </div>
        </div>

        <div className="alerts-card">
          <h2 className="card-title">Alerts</h2>
          <div className="alerts-list flex-1 overflow-y-auto pr-1">
            <DashboardAlertsList alerts={safeAlerts} />
          </div>
        </div>
        <div className="machines-card">
          <h2 className="card-title">Machines</h2>
          <div className="machines-list">
            {machines.map((machine) => (
              <MachineItem key={machine.id} machine={machine}></MachineItem>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
