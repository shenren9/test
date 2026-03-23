export interface ChartValue {
  time: number;
  value: number;
}

export interface MachineChartData {
  machine: string;
  values: ChartValue[];
}

export interface Machine {
  id: string;
  name: string;
  group_name: string;
  group_id: string;
}

export interface Group {
  name: string;
  id: string;
}

export interface Prediction {
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

export interface MachinePageClientProps {
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