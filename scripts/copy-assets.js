#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy manifest.json
console.log('Copying manifest.json...');
fs.copyFileSync(
  path.join(srcDir, 'manifest.json'),
  path.join(distDir, 'manifest.json')
);

// Copy icons
console.log('Copying icons...');
const icons = ['icon.png', 'icon-off.png'];
icons.forEach(icon => {
  const srcPath = path.join(srcDir, icon);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, path.join(distDir, icon));
  }
});

// Copy popup directory
console.log('Copying popup HTML files...');
const popupDistDir = path.join(distDir, 'popup');
if (!fs.existsSync(popupDistDir)) {
  fs.mkdirSync(popupDistDir, { recursive: true });
}

// Copy all HTML files from popup directory
const htmlFiles = ['index.html', 'settings.html'];
htmlFiles.forEach(file => {
  const srcPath = path.join(srcDir, 'popup', file);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, path.join(popupDistDir, file));
  }
});

// Copy options directory
console.log('Copying options HTML...');
const optionsDistDir = path.join(distDir, 'options');
if (!fs.existsSync(optionsDistDir)) {
  fs.mkdirSync(optionsDistDir, { recursive: true });
}

const optionsHtmlFiles = ['options.html', 'diagnostics.html'];
optionsHtmlFiles.forEach(file => {
  const srcPath = path.join(srcDir, 'options', file);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, path.join(optionsDistDir, file));
  }
});

// Copy CSS directory
console.log('Copying CSS files...');
const cssDistDir = path.join(distDir, 'css');
if (!fs.existsSync(cssDistDir)) {
  fs.mkdirSync(cssDistDir, { recursive: true });
}

const cssSrcDir = path.join(srcDir, 'css');
if (fs.existsSync(cssSrcDir)) {
  const cssFiles = fs.readdirSync(cssSrcDir);
  cssFiles.forEach(file => {
    fs.copyFileSync(
      path.join(cssSrcDir, file),
      path.join(cssDistDir, file)
    );
  });
}

console.log('✓ Assets copied successfully!');
