import type { MapDefinition } from './MapDefinition';

/**
 * Headless validation of a set of map definitions and their connections.
 *
 * Part of the reusable region content architecture (Phase 26.2): every region
 * ships a set of maps whose bounds, obstacles, and entry/exit points must be
 * internally consistent. This module performs no rendering and reads no UI
 * state, so it can validate region data before it is ever loaded by a scene.
 */

/** Result of validating a set of maps. */
export interface MapGraphValidation {
  valid: boolean;
  errors: string[];
}

/** Options controlling how strictly connections are validated. */
export interface MapGraphValidationOptions {
  /**
   * All map ids that count as valid connection targets. Defaults to the ids of
   * the supplied `maps`. Pass the full world registry when a region connects to
   * maps outside the validated set.
   */
  knownMapIds?: readonly string[];
  /**
   * When true, every connection whose target is part of the validated set must
   * have a matching return connection. Defaults to false.
   */
  requireBidirectional?: boolean;
}

function isInside(
  position: { x: number; y: number },
  width: number,
  height: number,
): boolean {
  return (
    position.x >= 0 &&
    position.y >= 0 &&
    position.x <= width &&
    position.y <= height
  );
}

/**
 * Validates map ids, bounds, obstacle rectangles, and connections.
 *
 * Checks that map ids are unique, bounds are positive, every collision rect
 * fits inside its map, every exit sits inside its own map, no connection is
 * self-referencing, every connection targets a known map, and every entry point
 * sits inside its target map.
 */
export function validateMapGraph(
  maps: readonly MapDefinition[],
  options: MapGraphValidationOptions = {},
): MapGraphValidation {
  const errors: string[] = [];

  const byId = new Map<string, MapDefinition>();
  for (const map of maps) {
    if (byId.has(map.id)) {
      errors.push(`Duplicate map id "${map.id}".`);
      continue;
    }
    byId.set(map.id, map);
  }

  const known = new Set<string>(options.knownMapIds ?? maps.map((map) => map.id));

  for (const map of maps) {
    const { width, height } = map.bounds;
    if (width <= 0 || height <= 0) {
      errors.push(`Map "${map.id}" has non-positive bounds.`);
    }

    for (const rect of map.collisionRects) {
      if (rect.width <= 0 || rect.height <= 0) {
        errors.push(`Map "${map.id}" has a collision rect with non-positive size.`);
        continue;
      }
      const inside =
        rect.x >= 0 &&
        rect.y >= 0 &&
        rect.x + rect.width <= width &&
        rect.y + rect.height <= height;
      if (!inside) {
        errors.push(`Map "${map.id}" has a collision rect outside its bounds.`);
      }
    }

    for (const conn of map.connections) {
      if (conn.exitWidth <= 0 || conn.exitHeight <= 0) {
        errors.push(
          `Map "${map.id}" connection to "${conn.targetMapId}" has a non-positive exit size.`,
        );
      }
      if (!isInside(conn.exitPosition, width, height)) {
        errors.push(`Map "${map.id}" exit to "${conn.targetMapId}" is outside its bounds.`);
      }
      if (conn.targetMapId === map.id) {
        errors.push(`Map "${map.id}" has a self-referencing connection.`);
        continue;
      }
      if (!known.has(conn.targetMapId)) {
        errors.push(
          `Map "${map.id}" connection references unknown map "${conn.targetMapId}".`,
        );
        continue;
      }
      const target = byId.get(conn.targetMapId);
      if (!target) continue;

      if (!isInside(conn.entryPosition, target.bounds.width, target.bounds.height)) {
        errors.push(
          `Map "${map.id}" → "${conn.targetMapId}" entry point is outside the target bounds.`,
        );
      }
      if (options.requireBidirectional) {
        const hasReturn = target.connections.some((c) => c.targetMapId === map.id);
        if (!hasReturn) {
          errors.push(
            `Connection "${map.id}" → "${conn.targetMapId}" has no return connection.`,
          );
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
