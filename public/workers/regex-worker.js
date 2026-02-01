/**
 * Web Worker for safe regex execution
 *
 * Runs regex patterns in a separate thread with timeout protection.
 * If the regex takes too long, the worker is terminated, preventing ReDoS attacks.
 */

self.onmessage = function(e) {
  const { pattern, testString, flags, taskId } = e.data;

  try {
    // Create and test regex
    const regex = new RegExp(pattern, flags || '');
    const result = regex.test(testString);

    // Send success result
    self.postMessage({
      taskId,
      success: true,
      result
    });
  } catch (error) {
    // Send error result
    self.postMessage({
      taskId,
      success: false,
      error: error.message || 'Regex execution failed'
    });
  }
};
