export default {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/tests/data-layer/**/*.test.mjs'],
  moduleFileExtensions: ['js', 'mjs', 'json'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  clearMocks: true,
};
