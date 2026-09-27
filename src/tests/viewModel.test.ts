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

  it('sets, reassesses and clears a monthly target', () => {
    expect(vm.activeAssessment).toBeNull();
    vm.updateTarget(200); // 示例方案约 265 kWh/月 → 超标
    expect(vm.activeScenario?.monthlyTargetKwh).toBe(200);
    expect(vm.activeAssessment?.status).toBe('exceeded');
    expect(vm.activeAssessment?.devices.reduce((sum, device) => sum + device.excessShareKwh, 0)).toBeCloseTo(vm.activeAssessment?.deltaKwh ?? 0);
    vm.updateDevice('device-aircon', { dailyHours: 1 }); // 参数一变立即重新判断 → 达标
    expect(vm.activeAssessment?.status).toBe('met');
    vm.updateTarget(null);
    expect(vm.activeScenario?.monthlyTargetKwh).toBeNull();
    expect(vm.activeAssessment).toBeNull();
  });

  it('rejects unreasonable target values without touching the document', () => {
    vm.updateTarget(200);
    const savedCalls = (repository.save as ReturnType<typeof vi.fn>).mock.calls.length;
    vm.updateTarget(-5);
    expect(vm.getState().status).toBe('error');
    expect(vm.activeScenario?.monthlyTargetKwh).toBe(200); // 保留原目标
    expect((repository.save as ReturnType<typeof vi.fn>).mock.calls.length).toBe(savedCalls);
    expect(vm.activeAssessment?.status).toBe('exceeded'); // 推演照常
  });

  it('keeps each scenario its own target and copies it on duplicate', () => {
    vm.updateTarget(200);
    vm.duplicateActive();
    const copy = vm.activeScenario;
    expect(copy?.monthlyTargetKwh).toBe(200); // 副本带走目标
    vm.updateTarget(500); // 副本上单独改
    const original = vm.getState().document?.scenarios.find((scenario) => scenario.id === exampleScenario.id);
    expect(original?.monthlyTargetKwh).toBe(200); // 原方案不受影响
    vm.selectScenario(exampleScenario.id);
    expect(vm.activeScenario?.monthlyTargetKwh).toBe(200); // 切换回来各自带着自己的目标
    expect(vm.activeAssessment?.targetKwh).toBe(200);
  });
});
