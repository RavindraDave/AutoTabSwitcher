/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src/settings', '<rootDir>/src/__tests__/settings'],
  testMatch: [
    '**/__tests__/settings/**/*.test.ts',
    '**/__tests__/settings/**/*.test.tsx',
    '**/settings/**/*.test.ts',
    '**/settings/**/*.test.tsx'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '\\.module\\.css$': 'identity-obj-proxy',
    '\\.css$': '<rootDir>/src/__tests__/settings/__mocks__/styleMock.js',
  },
  collectCoverageFrom: [
    'src/settings/**/*.{ts,tsx}',
    '!src/settings/**/*.d.ts',
    '!src/__tests__/**',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage/settings',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/settings/setup.tsx'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        jsx: 'react-jsx',
      }
    }]
  }
};
