import { describe, expect, it } from 'vitest';
import { assessTarget, estimateDevice, sanitizeTargetKwh, summarizeScenario, validateDevice } from '../domain';
import type { EnergyScenario } from '../types';

describe('energy domain', () => {
  it('calculates kWh and cost from watts, hours, days and price', () => {
    const result = estimateDevice({ id: 'a', name: '空调', watts: 1000, dailyHours: 2 }, 30, 0.5);
    expect(result).toEqual({ dailyKwh: 2, monthlyKwh: 60, monthlyCost: 30 });
  });

  it('keeps device shares explainable and sums to 100%', () => {
    const scenario: EnergyScenario = { id: 's', name: 'test', pricePerKwh: 1, daysPerMonth: 30, createdAt: '', devices: [
      { id: 'a', name: 'a', watts: 100, dailyHours: 1 }, { id: 'b', name: 'b', watts: 300, dailyHours: 1 },
    ] };
    const summary = summarizeScenario(scenario);
    expect(summary.total.monthlyKwh).toBe(12);
    expect(summary.devices.map((device) => device.share)).toEqual([0.25, 0.75]);
  });

  it('rejects negative power and more than 24 hours', () => {
    expect(validateDevice({ name: 'x', watts: -1, dailyHours: 1 })).toBe('功率不能为负数');
    expect(validateDevice({ name: 'x', watts: 1, dailyHours: 24.1 })).toBe('每日使用时间不能超过 24 小时');
  });

  it('treats empty or unreasonable targets as no target', () => {
    expect(sanitizeTargetKwh(undefined)).toBeNull();
    expect(sanitizeTargetKwh(null)).toBeNull();
    expect(sanitizeTargetKwh(NaN)).toBeNull();
    expect(sanitizeTargetKwh(0)).toBeNull();
    expect(sanitizeTargetKwh(-10)).toBeNull();
    expect(sanitizeTargetKwh(Infinity)).toBeNull();
    expect(sanitizeTargetKwh(200)).toBe(200);
  });

  it('assesses met and exceeded states against the target', () => {
    const scenario: EnergyScenario = { id: 's', name: 'test', pricePerKwh: 1, daysPerMonth: 30, createdAt: '', devices: [
      { id: 'a', name: 'a', watts: 100, dailyHours: 1 }, { id: 'b', name: 'b', watts: 300, dailyHours: 1 },
    ] };
    const summary = summarizeScenario(scenario); // 月度共 12 kWh，占比 25% / 75%
    const met = assessTarget(summary, 20);
    expect(met?.status).toBe('met');
    expect(met?.deltaKwh).toBe(-8);
    const exceeded = assessTarget(summary, 9);
    expect(exceeded?.status).toBe('exceeded');
    expect(exceeded?.deltaKwh).toBe(3);
    expect(exceeded?.usageRatio).toBeCloseTo(12 / 9);
  });

  it('splits the excess across devices and marks adjustment room', () => {
    const scenario: EnergyScenario = { id: 's', name: 'test', pricePerKwh: 1, daysPerMonth: 30, createdAt: '', devices: [
      { id: 'a', name: 'a', watts: 100, dailyHours: 1 },
      { id: 'b', name: 'b', watts: 300, dailyHours: 1 },
      { id: 'c', name: 'c', watts: 0, dailyHours: 0 },
    ] };
    const assessment = assessTarget(summarizeScenario(scenario), 8); // 超出 4 kWh
    expect(assessment?.devices.map((device) => device.excessShareKwh)).toEqual([1, 3, 0]);
    expect(assessment?.devices[0].adjustable).toBe(true);
    expect(assessment?.devices[0].maxReducibleKwh).toBe(3);
    expect(assessment?.devices[2].adjustable).toBe(false);
    expect(assessment?.devices[2].excessShareKwh).toBe(0);
  });

  it('returns null assessment for missing or unreasonable targets', () => {
    const scenario: EnergyScenario = { id: 's', name: 'test', pricePerKwh: 1, daysPerMonth: 30, createdAt: '', devices: [
      { id: 'a', name: 'a', watts: 100, dailyHours: 1 },
    ] };
    const summary = summarizeScenario(scenario);
    expect(assessTarget(summary, null)).toBeNull();
    expect(assessTarget(summary, undefined)).toBeNull();
    expect(assessTarget(summary, -5)).toBeNull();
    expect(summary.total.monthlyKwh).toBe(3); // 原有推演不受影响
  });
});
