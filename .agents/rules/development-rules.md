# Development Rules & Gameplay Invariants

## Persistent Constraints

1. **Implement only the requested task**: Focus strictly on the single objective specified in the current user prompt.
2. **Inspect existing code before editing**: Always read relevant existing files and dependencies before proposing or writing changes.
3. **Modify only files necessary for the task**: Keep diffs minimal and surgical; do not touch unrelated files.
4. **Preserve existing working functionality**: Ensure existing tests and capabilities remain intact without regressions.
5. **Do not rewrite unrelated modules**: Refrain from refactoring code that is outside the scope of the immediate task.
6. **Use TypeScript and strict typing where practical**: Explicit interfaces, types, and return types; no unnecessary `any` usage.
7. **Keep game logic independent of Phaser rendering**: All core algorithms, progression logic, formulas, and data models must execute cleanly without Phaser or DOM dependencies.
8. **Keep modules independently testable**: Design classes and functions with clear interfaces that can be instantiated and tested in isolation.
9. **Use configuration files for adjustable gameplay values**: Hardcoded magic numbers are prohibited; constants and balancing variables belong in dedicated config files or JSON tables.
10. **Never silently change approved game mechanics**: Adhere strictly to the approved mechanics defined in the GDD. Never alter mechanics without explicit approval.
11. **Do not add unnecessary dependencies**: Keep the dependency footprint light. Do not introduce third-party libraries when clean native TypeScript solutions suffice.
12. **Do not implement future features prematurely**: Implement only what is required for the active milestone.
13. **Run relevant tests after implementation**: Execute the test suite (`npm.cmd test`) and build verification (`npm.cmd run build`) after every task.
14. **Report changed files and test results**: Detail all created or modified files and summarize verification outcomes in every response.
15. **Stop and wait for the next task**: End each turn after completing the immediate task and await user direction.

---

## Knowledge Realms Core Mechanics & Invariants

1. **Character EXP Source**:
   - Character EXP comes primarily from defeating monsters in combat.
2. **Dual Progression Separation**:
   - Subject mastery is completely separate from character progression. A high-level character does not automatically have high subject mastery, and vice versa.
3. **PvE Question Difficulty**:
   - PvE question difficulty depends on monster level and player-versus-monster level difference.
4. **Educational Difficulty Jumps**:
   - Significantly higher-level monsters can cause major educational difficulty jumps.
5. **Randomized Battle Question Count**:
   - Battle question count is randomized based on monster HP/category and determined once per battle.
6. **Combat Answer Resolution (Player Attack)**:
   - Correct answers allow the player to attack and deal damage to the enemy.
7. **Combat Penalty (Player Damage)**:
   - Incorrect answers and question timeouts damage the player character.
8. **Zone Accessibility**:
   - Higher-level zones are accessible but dangerous (open exploration with level-based peril).
9. **Mastery Progression**:
   - Mastery EXP is performance-based, reflecting question accuracy and streak performance rather than pure grinding.
10. **PvP Mechanics (Reverse Difficulty)**:
    - PvP uses reverse difficulty: lower-level players receive harder questions to balance competitive play.
