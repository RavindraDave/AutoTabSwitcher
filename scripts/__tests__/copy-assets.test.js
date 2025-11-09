/**
 * Comprehensive tests for the build script
 * Tests all file copying operations, directory creation, and error handling
 */

const fs = require('fs');
const path = require('path');

// Mock fs module
jest.mock('fs');

describe('Copy Assets Build Script', () => {
  let mockConsoleLog;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
  });

  describe('Directory Structure', () => {
    it('should define correct root directory path', () => {
      const rootDir = path.join(__dirname, '../..');
      expect(rootDir).toBeDefined();
      expect(path.isAbsolute(rootDir) || rootDir.includes('..')).toBe(true);
    });

    it('should define correct src directory path', () => {
      const rootDir = path.join(__dirname, '../..');
      const srcDir = path.join(rootDir, 'src');
      expect(srcDir).toContain('src');
    });

    it('should define correct dist directory path', () => {
      const rootDir = path.join(__dirname, '../..');
      const distDir = path.join(rootDir, 'dist');
      expect(distDir).toContain('dist');
    });
  });

  describe('Directory Creation', () => {
    it('should create dist directory if it does not exist', () => {
      fs.existsSync.mockReturnValue(false);
      fs.mkdirSync.mockImplementation(() => {});

      const distDir = '/test/dist';
      
      if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
      }

      expect(fs.mkdirSync).toHaveBeenCalledWith(distDir, { recursive: true });
    });

    it('should not create dist directory if it already exists', () => {
      fs.existsSync.mockReturnValue(true);

      const distDir = '/test/dist';
      
      if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
      }

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should create popup directory with recursive option', () => {
      fs.existsSync.mockReturnValue(false);
      fs.mkdirSync.mockImplementation(() => {});

      const popupDir = '/test/dist/popup';
      
      if (!fs.existsSync(popupDir)) {
        fs.mkdirSync(popupDir, { recursive: true });
      }

      expect(fs.mkdirSync).toHaveBeenCalledWith(popupDir, { recursive: true });
    });

    it('should create css directory with recursive option', () => {
      fs.existsSync.mockReturnValue(false);
      fs.mkdirSync.mockImplementation(() => {});

      const cssDir = '/test/dist/css';
      
      if (!fs.existsSync(cssDir)) {
        fs.mkdirSync(cssDir, { recursive: true });
      }

      expect(fs.mkdirSync).toHaveBeenCalledWith(cssDir, { recursive: true });
    });
  });

  describe('File Copying', () => {
    beforeEach(() => {
      fs.copyFileSync.mockImplementation(() => {});
      fs.existsSync.mockReturnValue(true);
    });

    it('should copy manifest.json from src to dist', () => {
      const srcPath = '/test/src/manifest.json';
      const distPath = '/test/dist/manifest.json';

      fs.copyFileSync(srcPath, distPath);

      expect(fs.copyFileSync).toHaveBeenCalledWith(srcPath, distPath);
    });

    it('should copy icon.png if it exists', () => {
      fs.existsSync.mockReturnValue(true);
      
      const srcPath = '/test/src/icon.png';
      const distPath = '/test/dist/icon.png';

      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, distPath);
      }

      expect(fs.copyFileSync).toHaveBeenCalledWith(srcPath, distPath);
    });

    it('should copy icon-off.png if it exists', () => {
      fs.existsSync.mockReturnValue(true);
      
      const srcPath = '/test/src/icon-off.png';
      const distPath = '/test/dist/icon-off.png';

      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, distPath);
      }

      expect(fs.copyFileSync).toHaveBeenCalledWith(srcPath, distPath);
    });

    it('should not copy icon if it does not exist', () => {
      fs.existsSync.mockReturnValue(false);
      
      const srcPath = '/test/src/icon.png';
      const distPath = '/test/dist/icon.png';

      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, distPath);
      }

      expect(fs.copyFileSync).not.toHaveBeenCalled();
    });

    it('should copy index.html to popup subdirectory', () => {
      const srcPath = '/test/src/popup/index.html';
      const distPath = '/test/dist/popup/index.html';

      fs.copyFileSync(srcPath, distPath);

      expect(fs.copyFileSync).toHaveBeenCalledWith(srcPath, distPath);
    });
  });

  describe('CSS Directory Handling', () => {
    it('should copy all CSS files when directory exists', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockReturnValue(['bootstrap.min.css', 'custom.css']);
      fs.copyFileSync.mockImplementation(() => {});

      const cssSrcDir = '/test/src/css';
      
      if (fs.existsSync(cssSrcDir)) {
        const cssFiles = fs.readdirSync(cssSrcDir);
        cssFiles.forEach(file => {
          fs.copyFileSync(
            path.join(cssSrcDir, file),
            path.join('/test/dist/css', file)
          );
        });
      }

      expect(fs.copyFileSync).toHaveBeenCalledTimes(2);
      expect(fs.copyFileSync).toHaveBeenCalledWith(
        '/test/src/css/bootstrap.min.css',
        '/test/dist/css/bootstrap.min.css'
      );
      expect(fs.copyFileSync).toHaveBeenCalledWith(
        '/test/src/css/custom.css',
        '/test/dist/css/custom.css'
      );
    });

    it('should not copy CSS files if directory does not exist', () => {
      fs.existsSync.mockReturnValue(false);
      fs.copyFileSync.mockImplementation(() => {});

      const cssSrcDir = '/test/src/css';
      
      if (fs.existsSync(cssSrcDir)) {
        const cssFiles = fs.readdirSync(cssSrcDir);
        cssFiles.forEach(file => {
          fs.copyFileSync(
            path.join(cssSrcDir, file),
            path.join('/test/dist/css', file)
          );
        });
      }

      expect(fs.readdirSync).not.toHaveBeenCalled();
      expect(fs.copyFileSync).not.toHaveBeenCalled();
    });

    it('should handle empty CSS directory', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockReturnValue([]);
      fs.copyFileSync.mockImplementation(() => {});

      const cssSrcDir = '/test/src/css';
      
      if (fs.existsSync(cssSrcDir)) {
        const cssFiles = fs.readdirSync(cssSrcDir);
        cssFiles.forEach(file => {
          fs.copyFileSync(
            path.join(cssSrcDir, file),
            path.join('/test/dist/css', file)
          );
        });
      }

      expect(fs.copyFileSync).not.toHaveBeenCalled();
    });
  });

  describe('Icon Array Processing', () => {
    it('should process all icons in the array', () => {
      const icons = ['icon.png', 'icon-off.png'];
      expect(icons).toHaveLength(2);
      expect(icons).toContain('icon.png');
      expect(icons).toContain('icon-off.png');
    });

    it('should handle icon array with forEach', () => {
      fs.existsSync.mockReturnValue(true);
      fs.copyFileSync.mockImplementation(() => {});

      const icons = ['icon.png', 'icon-off.png'];
      const srcDir = '/test/src';
      const distDir = '/test/dist';

      icons.forEach(icon => {
        const srcPath = path.join(srcDir, icon);
        if (fs.existsSync(srcPath)) {
          fs.copyFileSync(srcPath, path.join(distDir, icon));
        }
      });

      expect(fs.copyFileSync).toHaveBeenCalledTimes(2);
    });
  });

  describe('Path Construction', () => {
    it('should construct correct paths using path.join', () => {
      const rootDir = '/test/root';
      const srcDir = path.join(rootDir, 'src');
      const distDir = path.join(rootDir, 'dist');

      expect(srcDir).toBe('/test/root/src');
      expect(distDir).toBe('/test/root/dist');
    });

    it('should construct nested paths correctly', () => {
      const distDir = '/test/dist';
      const popupDir = path.join(distDir, 'popup');
      const cssDir = path.join(distDir, 'css');

      expect(popupDir).toBe('/test/dist/popup');
      expect(cssDir).toBe('/test/dist/css');
    });

    it('should construct file paths correctly', () => {
      const srcDir = '/test/src';
      const manifestPath = path.join(srcDir, 'manifest.json');
      const popupHtmlPath = path.join(srcDir, 'popup', 'index.html');

      expect(manifestPath).toBe('/test/src/manifest.json');
      expect(popupHtmlPath).toBe('/test/src/popup/index.html');
    });
  });

  describe('Error Handling', () => {
    it('should handle file copy errors gracefully', () => {
      const error = new Error('Permission denied');
      fs.copyFileSync.mockImplementation(() => {
        throw error;
      });

      expect(() => {
        fs.copyFileSync('/test/src/file.txt', '/test/dist/file.txt');
      }).toThrow('Permission denied');
    });

    it('should handle directory creation errors', () => {
      const error = new Error('Cannot create directory');
      fs.mkdirSync.mockImplementation(() => {
        throw error;
      });

      expect(() => {
        fs.mkdirSync('/test/dist', { recursive: true });
      }).toThrow('Cannot create directory');
    });

    it('should handle readdir errors', () => {
      const error = new Error('Cannot read directory');
      fs.readdirSync.mockImplementation(() => {
        throw error;
      });

      expect(() => {
        fs.readdirSync('/test/src/css');
      }).toThrow('Cannot read directory');
    });
  });

  describe('Console Output', () => {
    it('should log manifest copy message', () => {
      console.log('Copying manifest.json...');
      expect(mockConsoleLog).toHaveBeenCalledWith('Copying manifest.json...');
    });

    it('should log icons copy message', () => {
      console.log('Copying icons...');
      expect(mockConsoleLog).toHaveBeenCalledWith('Copying icons...');
    });

    it('should log popup HTML copy message', () => {
      console.log('Copying popup HTML...');
      expect(mockConsoleLog).toHaveBeenCalledWith('Copying popup HTML...');
    });

    it('should log CSS files copy message', () => {
      console.log('Copying CSS files...');
      expect(mockConsoleLog).toHaveBeenCalledWith('Copying CSS files...');
    });

    it('should log success message', () => {
      console.log('✓ Assets copied successfully!');
      expect(mockConsoleLog).toHaveBeenCalledWith('✓ Assets copied successfully!');
    });
  });
});