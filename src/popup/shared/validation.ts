/**
 * Input validation for popup UI
 */

import {
  MIN_DELAY_SECONDS,
  MAX_DELAY_SECONDS,
  MIN_PAUSE_DURATION_SECONDS,
  MAX_PAUSE_DURATION_SECONDS,
} from '../../core/constants.js';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate delay time input
 *
 * @param value - Delay time in seconds
 * @param minDelay - Minimum allowed delay (environment-specific)
 * @returns Validation result
 */
export function validateDelayTime(value: number, minDelay: number = MIN_DELAY_SECONDS): ValidationResult {
  if (isNaN(value)) {
    return { valid: false, error: 'Please enter a valid number for delay time' };
  }

  if (value < minDelay) {
    return {
      valid: false,
      error: `Delay must be at least ${minDelay} seconds (valid range: ${minDelay}-${MAX_DELAY_SECONDS})`,
    };
  }

  if (value > MAX_DELAY_SECONDS) {
    return {
      valid: false,
      error: `Delay must be at most ${MAX_DELAY_SECONDS} seconds (valid range: ${minDelay}-${MAX_DELAY_SECONDS})`,
    };
  }

  return { valid: true };
}

/**
 * Validate pause duration input
 *
 * @param value - Pause duration in seconds
 * @returns Validation result
 */
export function validatePauseDuration(value: number): ValidationResult {
  if (isNaN(value)) {
    return { valid: false, error: 'Please enter a valid pause duration' };
  }

  if (value < MIN_PAUSE_DURATION_SECONDS) {
    return {
      valid: false,
      error: `Pause duration must be at least ${MIN_PAUSE_DURATION_SECONDS} seconds`,
    };
  }

  if (value > MAX_PAUSE_DURATION_SECONDS) {
    return {
      valid: false,
      error: `Pause duration must be at most ${MAX_PAUSE_DURATION_SECONDS} seconds`,
    };
  }

  return { valid: true };
}
