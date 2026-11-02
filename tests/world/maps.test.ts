import { describe, it, expect } from 'vitest';
import {
  ZoneType,
  MapIds,
  MAP_REGISTRY,
  BEGINNERS_VILLAGE,
  BEGINNERS_HUNTING_GROUND,
} from '@/world';

describe('Map Data Models & World Registry', () => {
  it('defines Beginners Village with recommended levels 1–10', () => {
    expect(BEGINNERS_VILLAGE.id).toBe(MapIds.BeginnersVillage);
    expect(BEGINNERS_VILLAGE.zoneType).toBe(ZoneType.Town);
    expect(BEGINNERS_VILLAGE.entryRequirements.recommendedMinLevel).toBe(1);
    expect(BEGINNERS_VILLAGE.entryRequirements.recommendedMaxLevel).toBe(10);
    expect(BEGINNERS_VILLAGE.bounds.width).toBe(1200);
    expect(BEGINNERS_VILLAGE.bounds.height).toBe(900);
  });

  it('includes placeholders for all village buildings and landmarks', () => {
    const landmarkIds = BEGINNERS_VILLAGE.landmarks.map((l) => l.id);
    expect(landmarkIds).toContain('fountain');
    expect(landmarkIds).toContain('math-building');
    expect(landmarkIds).toContain('library');
    expect(landmarkIds).toContain('science-lab');
    expect(landmarkIds).toContain('tech-workshop');
    expect(landmarkIds).toContain('shop');

    for (const lm of BEGINNERS_VILLAGE.landmarks) {
      expect(lm.position.x).toBeGreaterThan(0);
      expect(lm.position.y).toBeGreaterThan(0);
      expect(lm.width).toBeGreaterThan(0);
      expect(lm.height).toBeGreaterThan(0);
    }
  });

  it('defines valid connections between Village and Hunting Ground', () => {
    const villageToHunting = BEGINNERS_VILLAGE.connections.find(
      (c) => c.targetMapId === MapIds.BeginnersHuntingGround,
    );
    expect(villageToHunting).toBeDefined();
    expect(villageToHunting?.exitPosition.x).toBeGreaterThan(0);
    expect(villageToHunting?.entryPosition.x).toBeGreaterThan(0);

    const huntingToVillage = BEGINNERS_HUNTING_GROUND.connections.find(
      (c) => c.targetMapId === MapIds.BeginnersVillage,
    );
    expect(huntingToVillage).toBeDefined();
  });

  it('provides all registered maps in MAP_REGISTRY', () => {
    expect(MAP_REGISTRY[MapIds.BeginnersVillage]).toBeDefined();
    expect(MAP_REGISTRY[MapIds.BeginnersHuntingGround]).toBeDefined();
    expect(MAP_REGISTRY[MapIds.MathBuilding]).toBeDefined();
    expect(MAP_REGISTRY[MapIds.ScienceLab]).toBeDefined();
    expect(MAP_REGISTRY[MapIds.Library]).toBeDefined();
    expect(MAP_REGISTRY[MapIds.TechWorkshop]).toBeDefined();
  });
});
