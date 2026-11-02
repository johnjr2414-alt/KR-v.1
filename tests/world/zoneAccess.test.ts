import { describe, it, expect } from 'vitest';
import { checkZoneAccess, DANGER_WARNING_THRESHOLD_LEVEL_DELTA } from '@/world/zoneAccess';
import { ZoneDangerLevel } from '@/world/HuntingZoneDefinition';

describe('Zone Access & Risk Warning', () => {
  it('reports Safe when player level equals monster level', () => {
    const result = checkZoneAccess(10, 10, 'Test Zone', 1);
    expect(result.isDangerous).toBe(false);
    expect(result.dangerLevel).toBe(ZoneDangerLevel.Safe);
    expect(result.warningMessage).toBe('');
  });

  it('reports Safe when player is above monster level', () => {
    const result = checkZoneAccess(15, 5, 'Test Zone', 1);
    expect(result.isDangerous).toBe(false);
    expect(result.dangerLevel).toBe(ZoneDangerLevel.Safe);
  });

  it('reports Caution for delta 1–4', () => {
    expect(checkZoneAccess(6, 8, 'Zone', 1).dangerLevel).toBe(ZoneDangerLevel.Caution);
    expect(checkZoneAccess(1, 5, 'Zone', 1).dangerLevel).toBe(ZoneDangerLevel.Caution);
    expect(checkZoneAccess(6, 8, 'Zone', 1).isDangerous).toBe(false);
  });

  it('reports Danger and triggers warning for delta >= 5', () => {
    const result = checkZoneAccess(1, 6, 'Danger Zone', 5);
    expect(result.isDangerous).toBe(true);
    expect(result.dangerLevel).toBe(ZoneDangerLevel.Danger);
    expect(result.warningMessage).toContain('Danger Zone');
    expect(result.warningMessage).toContain('Level 1');
  });

  it('reports Extreme for delta >= 10', () => {
    const result = checkZoneAccess(1, 15, 'Extreme Zone', 10);
    expect(result.dangerLevel).toBe(ZoneDangerLevel.Extreme);
    expect(result.isDangerous).toBe(true);
  });

  it('correctly reports delta value', () => {
    const result = checkZoneAccess(3, 10, 'Zone', 8);
    expect(result.delta).toBe(7);
    expect(result.playerLevel).toBe(3);
    expect(result.averageMonsterLevel).toBe(10);
  });

  it('DANGER_WARNING_THRESHOLD_LEVEL_DELTA is 5', () => {
    expect(DANGER_WARNING_THRESHOLD_LEVEL_DELTA).toBe(5);
  });
});
