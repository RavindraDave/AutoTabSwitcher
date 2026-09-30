/**
 * Interactive build script
 * Prompts user to select build type: production or development
 */

const readline = require('readline');
const { execSync } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n🔨 AutoTabSwitcher Build System\n');
console.log('Select build type:');
console.log('  1) Production Build  - Minified, for distribution');
console.log('  2) Dev Build         - No minification, for testing\n');

rl.question('Enter your choice (1 or 2): ', (answer) => {
  const choice = answer.trim();

  try {
    switch (choice) {
      case '1':
        console.log('\n📦 Building PRODUCTION version...\n');
        execSync('node scripts/generate-build-config.js && npm run _internal:compile && npm run _internal:build-settings && npm run _internal:minify', {
          stdio: 'inherit',
          env: { ...process.env, BUILD_TYPE: 'production' }
        });
        console.log('\n✅ Production build completed successfully!');
        console.log('📁 Output: dist/\n');
        break;

      case '2':
        console.log('\n📦 Building DEVELOPMENT version...');
        console.log('No minification.\n');
        execSync('node scripts/generate-build-config.js && npm run _internal:compile', {
          stdio: 'inherit',
          env: { ...process.env, BUILD_TYPE: 'development' }
        });
        console.log('\n✅ Development build completed successfully!');
        console.log('📁 Output: dist/\n');
        break;

      default:
        console.error('\n❌ Invalid choice. Please run the script again and select 1 or 2.\n');
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
