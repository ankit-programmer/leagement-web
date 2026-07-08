/** Shapes returned by leagement-api (see its src/db/schema.ts and module services). */

export interface User {
  id: string;
  email: string;
  name: string | null;
  pictureUrl: string | null;
  timezone: string;
  dayStartHour: number;
  retentionTarget: number;
  aiProvider: string;
  aiModel: string | null;
  newCardsPerDay: number;
  createdAt: string;
}

export interface DeckCounts {
  new: number;
  /** New cards a session would actually serve today (daily introduction quota applied). */
  newAvailable: number;
  learning: number;
  due: number;
  total: number;
}

export interface Deck {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type DeckWithCounts = Deck & { counts: DeckCounts };

/** FSRS state values (ts-fsrs State enum). */
export const CardState = {
  New: 0,
  Learning: 1,
  Review: 2,
  Relearning: 3,
} as const;

export interface Card {
  id: string;
  deckId: string;
  front: string;
  back: string;
  imageUrl: string | null;
  sourceNote: string | null;
  state: number;
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  lastReview: string | null;
  introducedAt: string | null;
  suspended: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ReviewLog {
  id: string;
  cardId: string;
  rating: number;
  state: number;
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  lastElapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  review: string;
  durationMs: number | null;
  confidence: number | null;
  typedAnswer: string | null;
  createdAt: string;
}

export type Rating = 1 | 2 | 3 | 4;

/** Pre-reveal self-judgment: 1 = No idea, 2 = Think so, 3 = Sure. */
export type Confidence = 1 | 2 | 3;

export interface QueueCounts {
  learning: number;
  due: number;
  new: number;
}
