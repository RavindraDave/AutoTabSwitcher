/**
 * Comprehensive tests for popup validation functions
 * Tests all validation logic with 90%+ coverage
 */

import { describe, it, expect } from '@jest/globals';
import {
  validateDelayTime,
  validatePauseDuration,
  ValidationResult,
} from '../../popup/shared/validation';

// Mock constants for testing
jest.mock('../../core/constants', () => ({
  MIN_DELAY_SECONDS: 2,
  MAX_DELAY_SECONDS: 3600,
  MIN_PAUSE_DURATION_SECONDS: 5,
  MAX_PAUSE_DURATION_SECONDS: 300,
}));

describe('popup/shared/validation.ts', () => {
  describe('validateDelayTime', () => {
    describe('Valid inputs', () => {
      it('should accept minimum delay time (2 seconds)', () => {
        const result = validateDelayTime(2);

        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should accept maximum delay time (3600 seconds)', () => {
        const result = validateDelayTime(3600);

        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should accept value in middle of range', () => {
        const result = validateDelayTime(100);

        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should accept custom minimum delay', () => {
        const result = validateDelayTime(60, 60);

        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should accept value at custom minimum', () => {
        const result = validateDelayTime(5, 5);

        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    describe('Invalid inputs - Below minimum', () => {
      it('should reject delay time below minimum (1 second)', () => {
        const result = validateDelayTime(1);

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('at least 2 seconds');
        expect(result.error).toContain('2-3600');
      });

      it('should reject zero delay time', () => {
        const result = validateDelayTime(0);

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('at least 2 seconds');
      });

      it('should reject negative delay time', () => {
        const result = validateDelayTime(-10);

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should reject value below custom minimum', () => {
        const result = validateDelayTime(5, 10);

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('at least 10 seconds');
      });
    });

    describe('Invalid inputs - Above maximum', () => {
      it('should reject delay time above maximum (3601 seconds)', () => {
        const result = validateDelayTime(3601);

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('at most 3600 seconds');
        expect(result.error).toContain('2-3600');
      });

      it('should reject very large delay time', () => {
        const result = validateDelayTime(100000);

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should show custom minimum in error message when provided', () => {
        const result = validateDelayTime(10000, 60);

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('60-3600');
      });
    });

    describe('Invalid inputs - NaN', () => {
      it('should reject NaN', () => {
        const result = validateDelayTime(NaN);

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('valid number');
      });

      it('should reject Infinity', () => {
        const result = validateDelayTime(Infinity);

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should reject -Infinity', () => {
        const result = validateDelayTime(-Infinity);

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('Edge cases', () => {
      it('should accept decimal values within range', () => {
        const result = validateDelayTime(2.5);

        expect(result.valid).toBe(true);
      });

      it('should accept very small decimal above minimum', () => {
        const result = validateDelayTime(2.001);

        expect(result.valid).toBe(true);
      });

      it('should reject decimal just below minimum', () => {
        const result = validateDelayTime(1.999);

        expect(result.valid).toBe(false);
      });

      it('should accept decimal at maximum', () => {
        const result = validateDelayTime(3600.0);

        expect(result.valid).toBe(true);
      });

      it('should reject decimal above maximum', () => {
        const result = validateDelayTime(3600.001);

        expect(result.valid).toBe(false);
      });
    });

    describe('Boundary testing', () => {
      it('should validate at lower boundary (2)', () => {
        const atMin = validateDelayTime(2);
        const justBelowMin = validateDelayTime(1.999);

        expect(atMin.valid).toBe(true);
        expect(justBelowMin.valid).toBe(false);
      });

      it('should validate at upper boundary (3600)', () => {
        const atMax = validateDelayTime(3600);
        const justAboveMax = validateDelayTime(3600.001);

        expect(atMax.valid).toBe(true);
        expect(justAboveMax.valid).toBe(false);
      });

      it('should validate custom minimum boundary', () => {
        const customMin = 60;
        const atMin = validateDelayTime(customMin, customMin);
        const justBelowMin = validateDelayTime(customMin - 0.001, customMin);

        expect(atMin.valid).toBe(true);
        expect(justBelowMin.valid).toBe(false);
      });
    });
  });

  describe('validatePauseDuration', () => {
    describe('Valid inputs', () => {
      it('should accept minimum pause duration (5 seconds)', () => {
        const result = validatePauseDuration(5);

        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should accept maximum pause duration (300 seconds)', () => {
        const result = validatePauseDuration(300);

        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should accept value in middle of range', () => {
        const result = validatePauseDuration(30);

        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should accept typical pause durations', () => {
        const durations = [10, 20, 30, 60, 120, 180];

        durations.forEach(duration => {
          const result = validatePauseDuration(duration);
          expect(result.valid).toBe(true);
        });
      });
    });

    describe('Invalid inputs - Below minimum', () => {
      it('should reject pause duration below minimum (4 seconds)', () => {
        const result = validatePauseDuration(4);

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('at least 5 seconds');
      });

      it('should reject zero pause duration', () => {
        const result = validatePauseDuration(0);

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should reject negative pause duration', () => {
        const result = validatePauseDuration(-5);

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should reject very small positive values', () => {
        const result = validatePauseDuration(0.1);

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('Invalid inputs - Above maximum', () => {
      it('should reject pause duration above maximum (301 seconds)', () => {
        const result = validatePauseDuration(301);

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('at most 300 seconds');
      });

      it('should reject very large pause duration', () => {
        const result = validatePauseDuration(10000);

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('Invalid inputs - NaN', () => {
      it('should reject NaN', () => {
        const result = validatePauseDuration(NaN);

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('valid pause duration');
      });

      it('should reject Infinity', () => {
        const result = validatePauseDuration(Infinity);

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should reject -Infinity', () => {
        const result = validatePauseDuration(-Infinity);

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('Edge cases', () => {
      it('should accept decimal values within range', () => {
        const result = validatePauseDuration(10.5);

        expect(result.valid).toBe(true);
      });

      it('should accept very small decimal above minimum', () => {
        const result = validatePauseDuration(5.001);

        expect(result.valid).toBe(true);
      });

      it('should reject decimal just below minimum', () => {
        const result = validatePauseDuration(4.999);

        expect(result.valid).toBe(false);
      });

      it('should accept decimal at maximum', () => {
        const result = validatePauseDuration(300.0);

        expect(result.valid).toBe(true);
      });

      it('should reject decimal above maximum', () => {
        const result = validatePauseDuration(300.001);

        expect(result.valid).toBe(false);
      });
    });

    describe('Boundary testing', () => {
      it('should validate at lower boundary (5)', () => {
        const atMin = validatePauseDuration(5);
        const justBelowMin = validatePauseDuration(4.999);

        expect(atMin.valid).toBe(true);
        expect(justBelowMin.valid).toBe(false);
      });

      it('should validate at upper boundary (300)', () => {
        const atMax = validatePauseDuration(300);
        const justAboveMax = validatePauseDuration(300.001);

        expect(atMax.valid).toBe(true);
        expect(justAboveMax.valid).toBe(false);
      });
    });
  });

  describe('ValidationResult interface', () => {
    it('should return correct structure for valid result', () => {
      const result: ValidationResult = validateDelayTime(10);

      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return correct structure for invalid result', () => {
      const result: ValidationResult = validateDelayTime(1);

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('error');
      expect(result.valid).toBe(false);
      expect(typeof result.error).toBe('string');
    });

    it('should have consistent error message format', () => {
      const delayError = validateDelayTime(1);
      const pauseError = validatePauseDuration(1);

      expect(delayError.error).toBeDefined();
      expect(pauseError.error).toBeDefined();
      expect(typeof delayError.error).toBe('string');
      expect(typeof pauseError.error).toBe('string');
    });
  });

  describe('Integration scenarios', () => {
    it('should validate common user input scenarios for delay time', () => {
      const scenarios = [
        { input: 2, expected: true, description: 'Minimum acceptable' },
        { input: 5, expected: true, description: 'Low but acceptable' },
        { input: 10, expected: true, description: 'Common short delay' },
        { input: 30, expected: true, description: 'Common medium delay' },
        { input: 60, expected: true, description: 'One minute' },
        { input: 300, expected: true, description: 'Five minutes' },
        { input: 3600, expected: true, description: 'Maximum (one hour)' },
        { input: 1, expected: false, description: 'Below minimum' },
        { input: 3601, expected: false, description: 'Above maximum' },
      ];

      scenarios.forEach(({ input, expected, description }) => {
        const result = validateDelayTime(input);
        expect(result.valid).toBe(expected);
      });
    });

    it('should validate common user input scenarios for pause duration', () => {
      const scenarios = [
        { input: 5, expected: true, description: 'Minimum acceptable' },
        { input: 10, expected: true, description: 'Short pause' },
        { input: 30, expected: true, description: 'Default pause' },
        { input: 60, expected: true, description: 'One minute pause' },
        { input: 120, expected: true, description: 'Two minute pause' },
        { input: 300, expected: true, description: 'Maximum (5 minutes)' },
        { input: 4, expected: false, description: 'Below minimum' },
        { input: 301, expected: false, description: 'Above maximum' },
      ];

      scenarios.forEach(({ input, expected, description }) => {
        const result = validatePauseDuration(input);
        expect(result.valid).toBe(expected);
      });
    });

    it('should handle sequential validations', () => {
      // Simulate user input corrections
      let result = validateDelayTime(1);
      expect(result.valid).toBe(false);

      result = validateDelayTime(2);
      expect(result.valid).toBe(true);

      result = validateDelayTime(5000);
      expect(result.valid).toBe(false);

      result = validateDelayTime(3600);
      expect(result.valid).toBe(true);
    });

    it('should validate form submission scenario', () => {
      const formData = {
        delayTime: 30,
        pauseDuration: 60,
      };

      const delayValid = validateDelayTime(formData.delayTime);
      const pauseValid = validatePauseDuration(formData.pauseDuration);

      expect(delayValid.valid).toBe(true);
      expect(pauseValid.valid).toBe(true);
    });

    it('should catch invalid form submission', () => {
      const invalidForm = {
        delayTime: 1,
        pauseDuration: 1,
      };

      const delayValid = validateDelayTime(invalidForm.delayTime);
      const pauseValid = validatePauseDuration(invalidForm.pauseDuration);

      expect(delayValid.valid).toBe(false);
      expect(pauseValid.valid).toBe(false);
    });
  });

  describe('Error message quality', () => {
    it('should provide helpful error message for delay time too low', () => {
      const result = validateDelayTime(1);

      expect(result.error).toContain('at least');
      expect(result.error).toContain('2');
      expect(result.error).toContain('valid range');
    });

    it('should provide helpful error message for delay time too high', () => {
      const result = validateDelayTime(5000);

      expect(result.error).toContain('at most');
      expect(result.error).toContain('3600');
      expect(result.error).toContain('valid range');
    });

    it('should provide helpful error message for pause duration too low', () => {
      const result = validatePauseDuration(1);

      expect(result.error).toContain('at least');
      expect(result.error).toContain('5');
    });

    it('should provide helpful error message for pause duration too high', () => {
      const result = validatePauseDuration(500);

      expect(result.error).toContain('at most');
      expect(result.error).toContain('300');
    });

    it('should provide helpful error message for NaN delay', () => {
      const result = validateDelayTime(NaN);

      expect(result.error).toContain('valid number');
    });

    it('should provide helpful error message for NaN pause', () => {
      const result = validatePauseDuration(NaN);

      expect(result.error).toContain('valid');
    });
  });

  describe('Custom minimum delay validation', () => {
    it('should respect custom minimum when validating', () => {
      const customMin = 60;

      const belowCustom = validateDelayTime(30, customMin);
      const atCustom = validateDelayTime(60, customMin);
      const aboveCustom = validateDelayTime(90, customMin);

      expect(belowCustom.valid).toBe(false);
      expect(atCustom.valid).toBe(true);
      expect(aboveCustom.valid).toBe(true);
    });

    it('should include custom minimum in error message', () => {
      const result = validateDelayTime(30, 60);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('60');
      expect(result.error).toContain('valid range');
    });

    it('should handle custom minimum equal to default', () => {
      const result = validateDelayTime(2, 2);

      expect(result.valid).toBe(true);
    });

    it('should handle custom minimum higher than default', () => {
      const result = validateDelayTime(50, 100);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('100');
    });
  });

  describe('Type safety and interface compliance', () => {
    it('should return ValidationResult type', () => {
      const result: ValidationResult = validateDelayTime(10);

      // TypeScript compilation ensures type safety
      expect(result).toBeDefined();
      expect('valid' in result).toBe(true);
    });

    it('should handle boolean return type correctly', () => {
      const result = validateDelayTime(10);

      expect(typeof result.valid).toBe('boolean');
    });

    it('should handle optional error field correctly', () => {
      const validResult = validateDelayTime(10);
      const invalidResult = validateDelayTime(1);

      expect(validResult.error).toBeUndefined();
      expect(typeof invalidResult.error).toBe('string');
    });
  });
});
