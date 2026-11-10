// log-steps.ts
import { test } from '@playwright/test';

export async function logStep(
  title: string,
  stepFunction?: () => Promise<void> // Mark as optional with ?
): Promise<void> {
  if (stepFunction) {
    await test.step(title, stepFunction);
  } else {
    await test.step(title, async () => {}); // Or execute console/reporter log
  }
}