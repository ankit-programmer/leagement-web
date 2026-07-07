/** All-time review-count milestones — retrieval attempts, never time-in-app. */
export const REVIEW_MILESTONES = [50, 100, 250, 500, 1000, 2500, 5000, 10000];

/** The milestone crossed during a session that just added `justReviewed` reviews, if any. */
export function crossedMilestone(totalReviews: number, justReviewed: number): number | null {
  for (const milestone of REVIEW_MILESTONES) {
    if (totalReviews >= milestone && totalReviews - justReviewed < milestone) return milestone;
  }
  return null;
}
