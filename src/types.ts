export interface EnergyDevice {
  id: string;
  name: string;
  watts: number;
  dailyHours: number;
}

export interface EnergyScenario {
  id: string;
  name: string;
  pricePerKwh: number;
  daysPerMonth: number;
  targetMonthlyKwh?: number | null;
  devices: EnergyDevice[];
  createdAt: string;
}

export interface EnergyDocument {
  version: 1;
  scenarios: EnergyScenario[];
  activeScenarioId: string;
}

export type ViewStatus = 'loading' | 'ready' | 'editing' | 'error' | 'completed';

export interface Notice {
  kind: 'success' | 'error' | 'info';
  text: string;
}

export interface EnergyEstimate {
  dailyKwh: number;
  monthlyKwh: number;
  monthlyCost: number;
}

export interface ScenarioSummary {
  total: EnergyEstimate;
  devices: Array<EnergyDevice & EnergyEstimate & { share: number }>;
}

export type TargetStatus = 'met' | 'exceeded';

export interface TargetDeviceEvaluation {
  id: string;
  name: string;
  monthlyKwh: number;
  excessShareKwh: number;
  adjustable: boolean;
  savingPerHourKwh: number;
}

export interface TargetEvaluation {
  targetKwh: number;
  actualKwh: number;
  status: TargetStatus;
  deltaKwh: number;
  ratio: number;
  devices: TargetDeviceEvaluation[];
}
