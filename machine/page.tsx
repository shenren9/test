import { getMachineList } from "@/lib/frontendData";
import { requireSession } from "@/lib/require-session";
import { fetchMachinePredictions } from "@/lib/actions";
import MachinePageClient from "./machinePageClient";
import { getMetrics, getMachineData } from "./actions";

export default async function MachinePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {

  await requireSession("/machine");

  const { ok, groups, machines, error } = await getMachineList();
  if (!ok) return <div>Error: {error}</div>;
  
  const resolvedSearchParams = await searchParams;
  const queriedId = Array.isArray(resolvedSearchParams?.id) 
    ? resolvedSearchParams.id[0] 
    : resolvedSearchParams?.id;

  let sensor = (resolvedSearchParams?.sensor as string) || "inlet_temperature_C";
  let range = Number(resolvedSearchParams?.range) || 168; 

  const metricsName = await getMetrics();
  
  if (metricsName.length > 0 && !metricsName.includes(sensor)) {
      sensor = metricsName[0];
  }

  let initialMachineId = machines?.find(m => m.group_id === groups?.[0]?.id)?.name || machines?.[0]?.name || "";
  if (queriedId) {
    initialMachineId = queriedId;
  }
  
  const initialMachineDbId = machines.find(m => m.name === initialMachineId)?.id || "";
  const step = Math.floor((range * 3600) / 30);
  
  const [initialChartData, { ok: predOk, data: allPredictions }] = await Promise.all([
    getMachineData(initialMachineId, initialMachineDbId, sensor, range, step), 
    fetchMachinePredictions()
  ]);

  const machinePredictions = predOk ? allPredictions.filter((p: any) => p.machine_id === initialMachineDbId) : [];

  const topPrediction = machinePredictions
    .filter((p: any) => new Date(p.fail_timestamp) > new Date())
    .sort((a: any, b: any) => b.certainty - a.certainty)[0] || null;

  return (
    <MachinePageClient 
      groups={groups} 
      machines={machines} 
      initialMachineId={initialMachineId}
      initialChartData={initialChartData}
      initialSensor={sensor}
      initialTimeRange={range}
      topPrediction={predOk ? topPrediction : null}
      predictions={machinePredictions}
      metricsName={metricsName}
    />
  );
}