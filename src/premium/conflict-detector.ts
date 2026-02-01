/**
 * Conflict Detector - Identifies conflicts between premium features
 *
 * Detects when Skip Rules and Tab Groups have conflicting matchers
 */

import type { TabGroup, TabMatcher } from '../core/types.js';
import { logger } from '../core/logger.js';

export interface Conflict {
  type: 'skip-vs-group';
  skipRuleId: string;
  skipRulePattern: string;
  groupId: string;
  groupName: string;
  matcherIndex: number;
  matcherPattern: string;
  description: string;
}

/**
 * Check if a skip rule pattern conflicts with a group matcher
 *
 * Conflict occurs when:
 * - Skip rule removes tabs that a group matcher includes
 * - Pattern types match (e.g., both URL or both domain)
 * - Patterns overlap (skip pattern matches group pattern)
 *
 * @param skipPattern - Skip rule pattern
 * @param skipType - Skip rule type
 * @param matcher - Group tab matcher
 * @returns True if patterns conflict
 */
function patternsConflict(
  skipPattern: string,
  skipType: string,
  matcher: TabMatcher
): boolean {
  // Only check if types are compatible
  if (skipType !== matcher.type && skipType !== 'url' && matcher.type !== 'url') {
    return false; // Different types don't conflict
  }

  const pattern = matcher.pattern?.toLowerCase() || '';
  const skip = skipPattern.toLowerCase();

  // Check for overlap
  // Simple heuristic: if skip pattern contains group pattern or vice versa
  if (skip.includes(pattern) || pattern.includes(skip)) {
    return true;
  }

  // Check for exact match
  if (skip === pattern) {
    return true;
  }

  return false;
}

/**
 * Detect conflicts between skip rules and a specific group
 *
 * @param skipRules - Array of skip rules
 * @param group - Tab group to check
 * @returns Array of conflicts found
 */
export async function detectSkipRuleGroupConflicts(
  skipRules: Array<{ id: string; pattern: string; type: string; enabled: boolean }>,
  group: TabGroup
): Promise<Conflict[]> {
  const conflicts: Conflict[] = [];

  try {
    // Only check enabled skip rules
    const enabledSkipRules = skipRules.filter(rule => rule.enabled);

    for (const skipRule of enabledSkipRules) {
      for (let i = 0; i < group.tabs.length; i++) {
        const matcher = group.tabs[i];

        if (matcher && matcher.pattern && patternsConflict(skipRule.pattern, skipRule.type, matcher)) {
          conflicts.push({
            type: 'skip-vs-group',
            skipRuleId: skipRule.id,
            skipRulePattern: skipRule.pattern,
            groupId: group.id,
            groupName: group.name,
            matcherIndex: i,
            matcherPattern: matcher.pattern || '',
            description: `Skip rule "${skipRule.pattern}" may remove tabs that group "${group.name}" needs (matcher: "${matcher.pattern ?? 'unknown'}")`
          });
        }
      }
    }

    if (conflicts.length > 0) {
      await logger.info('ConflictDetector', 'Detected skip rule vs group conflicts', {
        groupId: group.id,
        groupName: group.name,
        conflictCount: conflicts.length
      });
    }
  } catch (error) {
    await logger.error('ConflictDetector', 'Error detecting conflicts', {
      error: error instanceof Error ? error.message : String(error),
      groupId: group.id
    });
  }

  return conflicts;
}

/**
 * Detect all conflicts for active group
 *
 * @returns Array of conflicts found for active group
 */
export async function detectActiveGroupConflicts(): Promise<Conflict[]> {
  try {
    // Dynamically import managers to avoid circular dependencies
    const [skipRuleModule, groupModule] = await Promise.all([
      import('./SkipRuleEngine.js'),
      import('./GroupManager.js')
    ]);

    const skipRuleEngine = skipRuleModule.skipRuleEngine;
    const groupManager = groupModule.groupManager;

    // Get active group
    const activeGroupId = await groupManager.getActiveGroupId();
    if (!activeGroupId) {
      return []; // No active group, no conflicts
    }

    const activeGroup = await groupManager.getGroup(activeGroupId);
    if (!activeGroup) {
      return [];
    }

    // Get all skip rules
    const skipRules = await skipRuleEngine.getRules();

    // Detect conflicts
    return await detectSkipRuleGroupConflicts(skipRules, activeGroup);
  } catch (error) {
    await logger.error('ConflictDetector', 'Error detecting active group conflicts', {
      error: error instanceof Error ? error.message : String(error)
    });
    return [];
  }
}

/**
 * Get conflict summary for display
 *
 * @param conflicts - Array of conflicts
 * @returns Human-readable summary
 */
export function getConflictSummary(conflicts: Conflict[]): string {
  if (!conflicts || conflicts.length === 0) {
    return 'No conflicts detected';
  }

  if (conflicts.length === 1) {
    return conflicts[0]?.description ?? 'Conflict detected';
  }

  const uniqueSkipRules = new Set(conflicts.map(c => c.skipRulePattern));
  return `${conflicts.length} conflicts detected with ${uniqueSkipRules.size} skip rule${uniqueSkipRules.size > 1 ? 's' : ''}`;
}
