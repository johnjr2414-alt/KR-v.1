import type { MonsterDefinition } from '../core/types/monster';
import type { HuntingZoneDefinition } from '../world/HuntingZoneDefinition';
import { getMonsterById } from './monsterData';

/** A 2-D position in world-space pixels. */
export interface Position {
  x: number;
  y: number;
}

/** Rectangular bounds for position generation. */
export interface MapBounds {
  width: number;
  height: number;
}

/**
 * MonsterSpawner — headless (no Phaser imports).
 *
 * Provides pure / deterministic utilities for:
 *  - selecting which monster type spawns based on weighted probability
 *  - generating non-overlapping spawn positions within map bounds
 */
export class MonsterSpawner {
  /**
   * Selects a monster definition from the zone's spawn table using
   * weighted-random selection.  Returns undefined only when the zone has
   * no spawn configs or none of the referenced monster IDs exist in the
   * registry.
   */
  selectMonsterFromZone(zone: HuntingZoneDefinition): MonsterDefinition | undefined {
    const configs = zone.monsterSpawnConfigs;
    if (configs.length === 0) return undefined;

    // Build a weighted pool
    const totalWeight = configs.reduce((sum, cfg) => sum + cfg.spawnWeight, 0);
    if (totalWeight <= 0) return undefined;

    let roll = Math.random() * totalWeight;

    for (const cfg of configs) {
      roll -= cfg.spawnWeight;
      if (roll <= 0) {
        return getMonsterById(cfg.monsterId);
      }
    }

    // Fallback: last entry
    const last = configs[configs.length - 1];
    return getMonsterById(last.monsterId);
  }

  /**
   * Generates `count` spawn positions within the given map bounds.
   *
   * Positions are kept `minMargin` pixels from the edges and at least
   * `minSpacing` pixels apart from each other (best-effort: if a valid
   * non-overlapping position cannot be found within `maxAttempts` tries,
   * the position is still added to avoid an infinite loop).
   */
  generateSpawnPositions(
    bounds: MapBounds,
    count: number,
    options: {
      minMargin?: number;
      minSpacing?: number;
      maxAttempts?: number;
    } = {},
  ): Position[] {
    const {
      minMargin = 80,
      minSpacing = 96,
      maxAttempts = 30,
    } = options;

    const usableWidth = bounds.width - minMargin * 2;
    const usableHeight = bounds.height - minMargin * 2;

    if (usableWidth <= 0 || usableHeight <= 0) {
      // Bounds too small — return centre for every spawn
      return Array.from({ length: count }, () => ({
        x: bounds.width / 2,
        y: bounds.height / 2,
      }));
    }

    const positions: Position[] = [];
    const minSpacingSq = minSpacing * minSpacing;

    for (let i = 0; i < count; i++) {
      let candidate: Position = { x: 0, y: 0 };
      let valid = false;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        candidate = {
          x: minMargin + Math.random() * usableWidth,
          y: minMargin + Math.random() * usableHeight,
        };

        const tooClose = positions.some((p) => {
          const dx = p.x - candidate.x;
          const dy = p.y - candidate.y;
          return dx * dx + dy * dy < minSpacingSq;
        });

        if (!tooClose) {
          valid = true;
          break;
        }
      }

      if (!valid) {
        // Accept candidate anyway to avoid hanging on dense zones
      }

      positions.push(candidate);
    }

    return positions;
  }

  /**
   * Convenience: selects `count` monsters from the zone (with repetition)
   * and pairs each with a spawn position.
   *
   * @returns Array of `{ definition, position }` pairs ready for scene use.
   */
  generateSpawnPlan(
    zone: HuntingZoneDefinition,
    bounds: MapBounds,
    count: number,
  ): Array<{ definition: MonsterDefinition; position: Position }> {
    const positions = this.generateSpawnPositions(bounds, count);
    const plan: Array<{ definition: MonsterDefinition; position: Position }> = [];

    for (const position of positions) {
      const definition = this.selectMonsterFromZone(zone);
      if (definition) {
        plan.push({ definition, position });
      }
    }

    return plan;
  }
}

/** Shared singleton spawner instance. */
export const monsterSpawner = new MonsterSpawner();
