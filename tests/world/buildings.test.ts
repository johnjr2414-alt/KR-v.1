import { describe, it, expect } from 'vitest';
import {
  BUILDING_REGISTRY,
  HUNTING_ZONE_REGISTRY,
  BuildingIds,
  HuntingZoneIds,
  MATH_BUILDING_DEF,
  SCIENCE_LAB_DEF,
  LIBRARY_DEF,
  TECH_WORKSHOP_DEF,
} from '@/world';
import { SubjectId } from '@/core/types';

describe('Building Data Model', () => {
  it('defines all four Beginners Village buildings', () => {
    expect(BUILDING_REGISTRY[BuildingIds.MathBuilding]).toBeDefined();
    expect(BUILDING_REGISTRY[BuildingIds.Library]).toBeDefined();
    expect(BUILDING_REGISTRY[BuildingIds.ScienceLab]).toBeDefined();
    expect(BUILDING_REGISTRY[BuildingIds.TechWorkshop]).toBeDefined();
  });

  it('Mathematics Building has correct subject and hunting zone', () => {
    expect(MATH_BUILDING_DEF.subject).toBe(SubjectId.Mathematics);
    expect(MATH_BUILDING_DEF.huntingZoneIds).toContain(HuntingZoneIds.MathHuntingGround);
    expect(MATH_BUILDING_DEF.name).toBe('Mathematics Building');
  });

  it('Science Lab has correct subject and hunting zone', () => {
    expect(SCIENCE_LAB_DEF.subject).toBe(SubjectId.Science);
    expect(SCIENCE_LAB_DEF.huntingZoneIds).toContain(HuntingZoneIds.ScienceHuntingGround);
  });

  it('Library has correct subject and hunting zone', () => {
    expect(LIBRARY_DEF.subject).toBe(SubjectId.GeneralKnowledge);
    expect(LIBRARY_DEF.huntingZoneIds).toContain(HuntingZoneIds.LibraryHuntingGround);
  });

  it('Technology Workshop has correct subject', () => {
    expect(TECH_WORKSHOP_DEF.subject).toBe(SubjectId.Programming);
    expect(TECH_WORKSHOP_DEF.huntingZoneIds).toContain(HuntingZoneIds.TechHuntingGround);
  });

  it('all buildings have valid interaction positions', () => {
    for (const bld of Object.values(BUILDING_REGISTRY)) {
      expect(bld.interactionPosition.x).toBeGreaterThan(0);
      expect(bld.interactionPosition.y).toBeGreaterThan(0);
    }
  });
});

describe('Hunting Zone Data Model', () => {
  it('defines all five hunting zones', () => {
    expect(HUNTING_ZONE_REGISTRY[HuntingZoneIds.MathHuntingGround]).toBeDefined();
    expect(HUNTING_ZONE_REGISTRY[HuntingZoneIds.LibraryHuntingGround]).toBeDefined();
    expect(HUNTING_ZONE_REGISTRY[HuntingZoneIds.ScienceHuntingGround]).toBeDefined();
    expect(HUNTING_ZONE_REGISTRY[HuntingZoneIds.TechHuntingGround]).toBeDefined();
    expect(HUNTING_ZONE_REGISTRY[HuntingZoneIds.GeneralHuntingGround]).toBeDefined();
  });

  it('each zone has at least one monster spawn config', () => {
    for (const zone of Object.values(HUNTING_ZONE_REGISTRY)) {
      expect(zone.monsterSpawnConfigs.length).toBeGreaterThan(0);
    }
  });

  it('each zone has a valid recommended level range', () => {
    for (const zone of Object.values(HUNTING_ZONE_REGISTRY)) {
      expect(zone.recommendedMinLevel).toBeGreaterThanOrEqual(1);
      expect(zone.recommendedMaxLevel).toBeGreaterThanOrEqual(zone.recommendedMinLevel);
    }
  });

  it('Math hunting zone links back to Mathematics subject', () => {
    const zone = HUNTING_ZONE_REGISTRY[HuntingZoneIds.MathHuntingGround];
    expect(zone.subject).toBe(SubjectId.Mathematics);
  });
});
