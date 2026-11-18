export default {
  projects: [
    {
      displayName: 'db',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/tests/data-layer/**/*.test.mjs'],
      moduleFileExtensions: ['js', 'mjs', 'json'],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
      clearMocks: true,
      transform: {},
    },
    {
      displayName: 'dom',
      testEnvironment: 'jest-environment-jsdom',
      testMatch: ['<rootDir>/src/tests/dom/**/*.test.tsx'],
      setupFiles: ['<rootDir>/jest.polyfills.js'],
    },
  ],
};
