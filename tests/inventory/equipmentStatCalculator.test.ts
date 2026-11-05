import { describe, it, expect } from 'vitest';
import { EquipmentStatCalculator } from '../../src/inventory/EquipmentStatCalculator';
import { EquipmentSlot } from '../../src/inventory/ItemTypes';
import { createPlayerData } from '../../src/player/PlayerData';

describe('EquipmentStatCalculator', () => {
  const calculator = new EquipmentStatCalculator();

  it('calculates bonuses as zeros when no gear is equipped', () => {
    const bonuses = calculator.calculateEquipmentBonuses({});
    expect(bonuses.attack).toBe(0);
    expect(bonuses.defense).toBe(0);
    expect(bonuses.hp).toBe(0);
    expect(bonuses.mp).toBe(0);
    expect(bonuses.intelligence).toBe(0);
    expect(bonuses.critRate).toBe(0);
    expect(bonuses.movementSpeed).toBe(0);
  });

  it('aggregates stat bonuses correctly across multiple equipped slots', () => {
    // wooden-sword: attack: 4
    // leather-vest: defense: 6, hp: 25
    // scholars-hood: defense: 4, mp: 20, intelligence: 6
    // copper-ring: critRate: 3
    const bonuses = calculator.calculateEquipmentBonuses({
      [EquipmentSlot.Weapon]: 'wooden-sword',
      [EquipmentSlot.Armor]: 'leather-vest',
      [EquipmentSlot.Helmet]: 'scholars-hood',
      [EquipmentSlot.Accessory]: 'copper-ring',
    });

    expect(bonuses.attack).toBe(4);
    expect(bonuses.defense).toBe(10); // 6 + 4
    expect(bonuses.hp).toBe(25);
    expect(bonuses.mp).toBe(20);
    expect(bonuses.intelligence).toBe(6);
    expect(bonuses.critRate).toBe(3);
  });

  it('calculates effective character stats without mutating base PlayerData', () => {
    const player = createPlayerData('p-1', 'Hero');
    const originalMaxHp = player.maxHp;
    const originalAttack = player.attack;
    const originalDefense = player.defense;

    const equipped = {
      [EquipmentSlot.Weapon]: 'iron-blade', // attack: 10, critRate: 2
      [EquipmentSlot.Armor]: 'leather-vest', // defense: 6, hp: 25
    };

    const effective = calculator.calculateEffectiveStats(player, equipped);

    expect(effective.attack).toBe(originalAttack + 10);
    expect(effective.defense).toBe(originalDefense + 6);
    expect(effective.maxHp).toBe(originalMaxHp + 25);
    expect(effective.critRate).toBe(player.critRate + 2);

    // Verify PlayerData base stats were NOT mutated
    expect(player.attack).toBe(originalAttack);
    expect(player.defense).toBe(originalDefense);
    expect(player.maxHp).toBe(originalMaxHp);
  });
});
