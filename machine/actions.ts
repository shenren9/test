"use server";

import { MachineChartData } from "./types";
import { PrometheusResponse } from "./types";

export async function getMetrics(): Promise<string[]> {
  try {
    const host = process.env.PROMETHEUS_HOST || 'victoriametrics';
    const port = process.env.PROMETHEUS_PORT || '8428';
    const end = Math.floor(Date.now() / 1000);
    const start = end - (30 * 24 * 3600); 
    const url = `http://${host}:${port}/api/v1/label/__name__/values?start=${start}&end=${end}`;
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    
    if (data.status === 'success' && Array.isArray(data.data)) {
      return data.data.filter((name: string) => !name.startsWith('go_') && !name.startsWith('vm_') && !name.startsWith('promhttp_'));
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch metrics from VictoriaMetrics:", error);
    return [];
  }
}

export async function getMachineData(
  machineName: string, 
  machineDbId: string, 
  sensorType: string, 
  timeRangeHours: number = 168, 
  step: number = 20160
): Promise<MachineChartData[]> {
  try {
    const host = process.env.PROMETHEUS_HOST || 'victoriametrics';
    const port = process.env.PROMETHEUS_PORT || '8428';
    const end = Math.floor(Date.now() / 1000);
    const start = end - (timeRangeHours * 3600);
    const promQuery = `{__name__="${sensorType}"}`;
    const encodedQuery = encodeURIComponent(promQuery);
    const res = await fetch(
      `http://${host}:${port}/api/v1/query_range?query=${encodedQuery}&start=${start}&end=${end}&step=${step}`,
      { cache: 'no-store' }
    );
    
    const data: PrometheusResponse = await res.json();
    const expectedTimes: number[] = [];
    for (let t = start; t <= end; t += step) {
      expectedTimes.push(t * 1000);
    }
    const normalizeString = (str: string) => (str || "").toLowerCase().replace(/[-_ ]/g, '');
    const normalizedTarget = normalizeString(machineDbId); 
    let targetMachineData = null;
    if (data.status === 'success' && data.data?.result && data.data.result.length > 0) {
      targetMachineData = data.data.result.find((result) => {
        const dbMachine = normalizeString(result.metric?.machine || "");
        const dbSensor = normalizeString(result.metric?.sensor || "");
        return dbMachine.startsWith(normalizedTarget) || dbSensor.startsWith(normalizedTarget);
      });
    }
    const dbValuesMap = new Map<number, number>();
    if (targetMachineData && targetMachineData.values) {
      targetMachineData.values.forEach((v) => {
        dbValuesMap.set(v[0] * 1000, parseFloat(v[1])); 
      });
    }
    const filledValues = expectedTimes.map(time => ({
      time: time,
      value: dbValuesMap.has(time) ? dbValuesMap.get(time)! : 0
    }));
    return [{
      machine: machineName, 
      values: filledValues
    }];
  } catch (error) {
    console.error("Failed to fetch machine data from VictoriaMetrics:", error);
    const fallbackTimes = [];
    const end = Math.floor(Date.now() / 1000);
    const start = end - (timeRangeHours * 3600);
    for (let t = start; t <= end; t += step) {
      fallbackTimes.push({ time: t * 1000, value: 0 });
    }
    return [{ machine: machineName, values: fallbackTimes }];
  }
}