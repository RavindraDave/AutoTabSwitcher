/**
 * Interactive build script
 * Prompts user to select build type: free or premium
 */

const readline = require('readline');
const { execSync } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n🔨 AutoTabSwitcher Build System\n');
console.log('Select build type:');
console.log('  1) Free Build     - Premium features excluded (for distribution)');
console.log('  2) Premium Build  - All features included (requires license)');
console.log('  3) Dev Build      - Premium enabled for testing (no minification)\n');

rl.question('Enter your choice (1, 2, or 3): ', (answer) => {
  const choice = answer.trim();

  try {
    switch (choice) {
      case '1':
        console.log('\n📦 Building FREE version...');
        console.log('Premium features will be excluded from the build.\n');
        execSync('BUILD_PREMIUM=false BUILD_TYPE=production-free node scripts/generate-build-config.js && npm run build:compile && npm run build:minify', {
          stdio: 'inherit',
          env: { ...process.env, BUILD_PREMIUM: 'false', BUILD_TYPE: 'production-free' }
        });
        console.log('\n✅ Free build completed successfully!');
        console.log('📁 Output: dist/');
        console.log('🔒 Premium features: EXCLUDED\n');
        break;

      case '2':
        console.log('\n📦 Building PREMIUM version...');
        console.log('All premium features will be included.\n');
        execSync('BUILD_PREMIUM=true BUILD_TYPE=production-premium node scripts/generate-build-config.js && npm run build:compile && npm run build:minify', {
          stdio: 'inherit',
          env: { ...process.env, BUILD_PREMIUM: 'true', BUILD_TYPE: 'production-premium' }
        });
        console.log('\n✅ Premium build completed successfully!');
        console.log('📁 Output: dist/');
        console.log('🔓 Premium features: INCLUDED\n');
        break;

      case '3':
        console.log('\n📦 Building DEVELOPMENT version...');
        console.log('Premium features enabled, no minification.\n');
        execSync('BUILD_PREMIUM=true BUILD_TYPE=development node scripts/generate-build-config.js && npm run build:compile', {
          stdio: 'inherit',
          env: { ...process.env, BUILD_PREMIUM: 'true', BUILD_TYPE: 'development' }
        });
        console.log('\n✅ Development build completed successfully!');
        console.log('📁 Output: dist/');
        console.log('🔓 Premium features: ENABLED (for testing)\n');
        break;

      default:
        console.error('\n❌ Invalid choice. Please run the script again and select 1, 2, or 3.\n');
        process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
});

// Handle Ctrl+C gracefully
rl.on('SIGINT', () => {
  console.log('\n\n❌ Build cancelled by user.\n');
  process.exit(0);
});
