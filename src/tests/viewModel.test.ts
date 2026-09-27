import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exampleScenario } from '../domain';
import type { EnergyDocument } from '../types';
import { EnergyLensViewModel } from '../viewModel';
import type { EnergyRepository } from '../repository';

function makeRepository(): EnergyRepository & { data: EnergyDocument; save: ReturnType<typeof vi.fn> } {
  const data: EnergyDocument = { version: 1, scenarios: [structuredClone(exampleScenario)], activeScenarioId: exampleScenario.id };
  return { data, load: () => data, save: vi.fn((next: EnergyDocument) => { data.scenarios = next.scenarios; data.activeScenarioId = next.activeScenarioId; }) };
}

describe('EnergyLensViewModel', () => {
  let repository: ReturnType<typeof makeRepository>;
  let vm: EnergyLensViewModel;
  beforeEach(() => { repository = makeRepository(); vm = new EnergyLensViewModel(repository); vm.initialize(); });

  it('initializes, persists edits, and recalculates results', () => {
    expect(vm.getState().status).toBe('ready');
    const before = vm.activeSummary?.total.monthlyKwh;
    vm.updateDevice('device-aircon', { dailyHours: 2 });
    expect(vm.activeSummary?.total.monthlyKwh).toBeLessThan(before ?? Infinity);
    expect(repository.save).toHaveBeenCalled();
  });

  it('keeps invalid values out of the document and exposes an error notice', () => {
    vm.updateDevice('device-aircon', { watts: -50 });
    expect(vm.getState().status).toBe('error');
    expect(vm.getState().notice?.text).toBe('功率不能为负数');
    expect(vm.activeScenario?.devices[0].watts).toBe(1200);
  });

  it('duplicates a scenario and can recover a saved document', () => {
    vm.duplicateActive();
    expect(vm.getState().document?.scenarios).toHaveLength(2);
    const recovered = new EnergyLensViewModel(repository);
    recovered.initialize();
    expect(recovered.getState().document?.scenarios).toHaveLength(2);
  });

  it('surfaces persistence failure as a recoverable error', () => {
    repository.save.mockImplementation(() => { throw new Error('quota'); });
    vm.addDevice();
    expect(vm.getState().status).toBe('error');
    expect(vm.getState().notice?.text).toContain('保存失败');
  });

  it('evaluates the target live as device parameters change', () => {
    vm.updateTarget(200);
    expect(vm.activeTargetEvaluation?.status).toBe('exceeded');
    vm.updateDevice('device-aircon', { dailyHours: 3 });
    expect(vm.activeTargetEvaluation?.status).toBe('met');
    expect(vm.activeTargetEvaluation?.targetKwh).toBe(200);
  });

  it('keeps an unreasonable target out of the document without disrupting editing', () => {
    vm.updateTarget(-10);
    expect(vm.activeScenario?.targetMonthlyKwh).toBe(300);
    expect(vm.getState().status).not.toBe('error');
    expect(vm.getState().notice?.kind).toBe('info');
    vm.updateTarget(0);
    expect(vm.activeScenario?.targetMonthlyKwh).toBe(300);
  });

  it('clears the target without affecting the estimate', () => {
    const before = vm.activeSummary?.total.monthlyKwh;
    vm.updateTarget(null);
    expect(vm.activeScenario?.targetMonthlyKwh).toBeNull();
    expect(vm.activeTargetEvaluation).toBeNull();
    expect(vm.activeSummary?.total.monthlyKwh).toBe(before);
  });

  it('carries the target into duplicates but keeps it independently editable', () => {
    vm.updateTarget(250);
    vm.duplicateActive();
    expect(vm.activeScenario?.targetMonthlyKwh).toBe(250);
    vm.updateTarget(180);
    const original = vm.getState().document?.scenarios.find((scenario) => scenario.id === exampleScenario.id);
    expect(original?.targetMonthlyKwh).toBe(250);
  });

  it('keeps each scenario’s own target when switching', () => {
    vm.updateTarget(250);
    vm.duplicateActive();
    vm.updateTarget(180);
    vm.selectScenario(exampleScenario.id);
    expect(vm.activeScenario?.targetMonthlyKwh).toBe(250);
    expect(vm.activeTargetEvaluation?.targetKwh).toBe(250);
  });
});
