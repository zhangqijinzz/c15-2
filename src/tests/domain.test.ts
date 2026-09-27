import { describe, expect, it } from 'vitest';
import { estimateDevice, evaluateTarget, normalizeTarget, summarizeScenario, validateDevice } from '../domain';
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

  describe('monthly target', () => {
    const scenario: EnergyScenario = { id: 's', name: 'test', pricePerKwh: 1, daysPerMonth: 30, createdAt: '', devices: [
      { id: 'a', name: 'a', watts: 100, dailyHours: 1 }, { id: 'b', name: 'b', watts: 300, dailyHours: 1 },
    ] };

    it('treats empty or unreasonable targets as no target', () => {
      expect(normalizeTarget(undefined)).toBeNull();
      expect(normalizeTarget(null)).toBeNull();
      expect(normalizeTarget(NaN)).toBeNull();
      expect(normalizeTarget(Infinity)).toBeNull();
      expect(normalizeTarget(0)).toBeNull();
      expect(normalizeTarget(-5)).toBeNull();
      expect(normalizeTarget(250)).toBe(250);
    });

    it('marks the scenario as met when usage stays within target', () => {
      const evaluation = evaluateTarget(summarizeScenario(scenario), 12);
      expect(evaluation?.status).toBe('met');
      expect(evaluation?.deltaKwh).toBe(0);
      expect(evaluation?.ratio).toBe(1);
    });

    it('splits the excess across devices by share and flags adjustable ones', () => {
      const evaluation = evaluateTarget(summarizeScenario(scenario), 8);
      expect(evaluation?.status).toBe('exceeded');
      expect(evaluation?.deltaKwh).toBe(4);
      expect(evaluation?.devices.map((device) => device.excessShareKwh)).toEqual([3, 1]);
      expect(evaluation?.devices.every((device) => device.adjustable)).toBe(true);
      expect(evaluation?.devices[0].savingPerHourKwh).toBe(9);
    });

    it('returns null when the target is missing or unreasonable', () => {
      expect(evaluateTarget(summarizeScenario(scenario), null)).toBeNull();
      expect(evaluateTarget(summarizeScenario(scenario), undefined)).toBeNull();
      expect(evaluateTarget(summarizeScenario(scenario), -1)).toBeNull();
    });
  });
});
