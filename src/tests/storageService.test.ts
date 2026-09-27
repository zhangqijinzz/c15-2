// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { exampleScenario } from '../domain';
import { LocalEnergyRepository } from '../repository';

describe('local persistence recovery', () => {
  beforeEach(() => localStorage.clear());

  it('falls back to a valid example when saved JSON is damaged', () => {
    localStorage.setItem('energy-lens.document.v1', JSON.stringify({ version: 1, scenarios: [null], activeScenarioId: 'missing' }));
    const recovered = new LocalEnergyRepository().load();
    expect(recovered.activeScenarioId).toBe(exampleScenario.id);
    expect(recovered.scenarios[0].devices.length).toBeGreaterThan(0);
  });

  it('loads documents saved before targets existed', () => {
    const legacy = { version: 1, activeScenarioId: exampleScenario.id, scenarios: [{ ...exampleScenario }] };
    delete (legacy.scenarios[0] as Record<string, unknown>).monthlyTargetKwh;
    localStorage.setItem('energy-lens.document.v1', JSON.stringify(legacy));
    const recovered = new LocalEnergyRepository().load();
    expect(recovered.scenarios[0].id).toBe(exampleScenario.id);
    expect(recovered.scenarios[0].monthlyTargetKwh).toBeUndefined();
  });

  it('keeps a scenario with an unreasonable stored target instead of dropping it', () => {
    localStorage.setItem('energy-lens.document.v1', JSON.stringify({ version: 1, activeScenarioId: exampleScenario.id, scenarios: [{ ...exampleScenario, monthlyTargetKwh: -30 }] }));
    const recovered = new LocalEnergyRepository().load();
    expect(recovered.scenarios[0].id).toBe(exampleScenario.id); // 文档不损坏，评估层会把 -30 当作无目标
  });
});
