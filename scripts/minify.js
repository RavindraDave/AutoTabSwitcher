/**
 * Minify and optimize JavaScript files
 *
 * This script uses Terser to:
 * - Minify JavaScript code
 * - Remove dead code (tree-shaking)
 * - Eliminate unreachable code based on constant conditions
 * - Remove console.log statements in production
 *
 * For premium feature exclusion:
 * - When PREMIUM_FEATURES_AVAILABLE is false, all premium code blocks are removed
 * - Terser's dead code elimination removes unreachable if/else branches
 */

const { minify } = require('terser');
const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

async function minifyFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');

  try {
    const result = await minify(code, {
      compress: {
        // Enable dead code elimination
        dead_code: true,
        // Remove unreachable code
        conditionals: true,
        // Evaluate constant expressions
        evaluate: true,
        // Remove unused code
        unused: true,
        // Inline functions when beneficial
        inline: true,
        // Remove console.* in production builds
        drop_console: process.env.BUILD_TYPE !== 'development',
        // Remove debugger statements
        drop_debugger: true,
        // Pass information about constant conditions
        global_defs: {
          // These will be replaced by actual values from build-config.ts
          // Terser will see the actual boolean values and eliminate dead branches
        },
      },
      mangle: {
        // Don't mangle top-level names (needed for Chrome extension)
        toplevel: false,
        // Keep class names (needed for instanceof checks)
        keep_classnames: true,
        // Keep function names (helpful for debugging)
        keep_fnames: false,
      },
      format: {
        // Add comments with license info
        comments: /^!|@preserve|@license|@cc_on/i,
      },
      sourceMap: false, // Chrome extensions don't need source maps in production
    });

    if (result.code) {
      fs.writeFileSync(filePath, result.code, 'utf8');

      const originalSize = code.length;
      const minifiedSize = result.code.length;
      const savings = ((1 - minifiedSize / originalSize) * 100).toFixed(1);

      console.log(`  ✓ ${path.relative(process.cwd(), filePath)} (${savings}% smaller)`);
    }
  } catch (error) {
    console.error(`  ✗ Error minifying ${filePath}:`, error.message);
    process.exit(1);
  }
}

async function minifyAll() {
  const distDir = path.join(__dirname, '..', 'dist');

  if (!fs.existsSync(distDir)) {
    console.error('Error: dist directory not found. Run build first.');
    process.exit(1);
  }

  console.log('Minifying JavaScript files...');

  // Find all .js files in dist
  const jsFiles = await glob('**/*.js', {
    cwd: distDir,
    absolute: true,
    ignore: ['**/*.min.js'], // Skip already minified files
  });

  if (jsFiles.length === 0) {
    console.log('No JavaScript files found to minify.');
    return;
  }

  console.log(`Found ${jsFiles.length} files to minify`);

  // Minify all files
  for (const file of jsFiles) {
    await minifyFile(file);
  }

  console.log('\n✓ Minification complete!');
}

// Run minification
minifyAll().catch(error => {
  console.error('Minification failed:', error);
  process.exit(1);
});
