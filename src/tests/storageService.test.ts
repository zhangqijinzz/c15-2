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

  it('sanitizes an unreasonable saved target instead of rejecting the document', () => {
    const damaged = { version: 1, scenarios: [{ ...exampleScenario, targetMonthlyKwh: -100 }], activeScenarioId: exampleScenario.id };
    localStorage.setItem('energy-lens.document.v1', JSON.stringify(damaged));
    const recovered = new LocalEnergyRepository().load();
    expect(recovered.scenarios[0].id).toBe(exampleScenario.id);
    expect(recovered.scenarios[0].targetMonthlyKwh).toBeNull();
    expect(recovered.scenarios[0].devices.length).toBeGreaterThan(0);
  });

  it('preserves a valid saved target across reloads', () => {
    const saved = { version: 1, scenarios: [{ ...exampleScenario, targetMonthlyKwh: 280 }], activeScenarioId: exampleScenario.id };
    localStorage.setItem('energy-lens.document.v1', JSON.stringify(saved));
    const recovered = new LocalEnergyRepository().load();
    expect(recovered.scenarios[0].targetMonthlyKwh).toBe(280);
  });
});
