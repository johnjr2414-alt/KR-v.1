import type { ArenaCompetitor } from './ArenaTypes';
import { SubjectId } from '../core/types/education';

export const MOCK_RIVALS: ArenaCompetitor[] = [
  {
    id: 'rival-novice-fizz',
    displayName: 'Apprentice Fizz',
    level: 2,
    rating: 1000,
    subjectFocus: SubjectId.Mathematics,
  },
  {
    id: 'rival-adept-valeria',
    displayName: 'Scholar Valeria',
    level: 5,
    rating: 1250,
    subjectFocus: SubjectId.Science,
  },
  {
    id: 'rival-grandmaster-ignis',
    displayName: 'Grandmaster Ignis',
    level: 10,
    rating: 1600,
    subjectFocus: SubjectId.GeneralKnowledge,
  },
];
