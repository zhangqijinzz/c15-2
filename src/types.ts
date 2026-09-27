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
  devices: EnergyDevice[];
  createdAt: string;
  /** 月度用电目标（kWh），未设置或值不合理时视为无目标 */
  monthlyTargetKwh?: number | null;
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

export interface TargetDeviceShare {
  id: string;
  name: string;
  monthlyKwh: number;
  /** 该设备分摊到的超出电量（按用电占比拆分） */
  excessShareKwh: number;
  /** 是否还有可下调空间（功率和时长均大于 0） */
  adjustable: boolean;
  /** 把使用时长降到 0 时最多可省下的月度电量 */
  maxReducibleKwh: number;
}

export interface TargetAssessment {
  targetKwh: number;
  actualKwh: number;
  status: 'met' | 'exceeded';
  /** 实际 − 目标，负数表示尚有富余 */
  deltaKwh: number;
  /** 实际 / 目标 */
  usageRatio: number;
  devices: TargetDeviceShare[];
}
