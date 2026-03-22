"use server";

import { MachineChartData } from "./types";

interface PrometheusMetric {
  machine?: string;
  sensor?: string;
  [key: string]: any;
}

interface PrometheusResult {
  metric: PrometheusMetric;
  values: [number, string][];
}

interface PrometheusResponse {
  status: string;
  data: {
    resultType: string;
    result: PrometheusResult[];
  };
}

export async function getMetrics(): Promise<string[]> {
  try {
    const host = process.env.PROMETHEUS_HOST || 'victoriametrics';
    const port = process.env.PROMETHEUS_PORT || '8428';
    const res = await fetch(`http://${host}:${port}/api/v1/label/__name__/values`, { cache: 'no-store' });
    const data = await res.json();
    if (data.status === 'success' && Array.isArray(data.data)) {
      return data.data;
    }
    return [];
  } catch (error) {
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

    if (data.status === 'success' && data.data?.result && data.data.result.length > 0) {
      const normalizeString = (str: string) => (str || "").toLowerCase().replace(/[-_ ]/g, '');
      const normalizedTarget = normalizeString(machineDbId); 
      const targetMachineData = data.data.result.find((result) => {
        const dbMachine = normalizeString(result.metric?.machine || "");
        const dbSensor = normalizeString(result.metric?.sensor || "");
        return dbMachine.startsWith(normalizedTarget) || dbSensor.startsWith(normalizedTarget);
      });

      if (!targetMachineData) return [];

      return [{
        machine: machineName, 
        values: targetMachineData.values?.map((v) => ({
          time: v[0] * 1000,
          value: parseFloat(v[1])
        })) || []
      }];
    }
    return [];
  } catch (error) {
    return [];
  }
}