import { summarizeCost } from './tests/helpers/cost';

/**
 * Runs once after the entire test suite finishes.
 * Prints the total AI cost incurred during the run.
 *
 * See Chapter 7 for details.
 */
export default async function globalTeardown(): Promise<void> {
  summarizeCost();
}
