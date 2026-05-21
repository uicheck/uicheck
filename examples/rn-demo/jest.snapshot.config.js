module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)$': [
      'babel-jest',
      {
        presets: ['@react-native/babel-preset'],
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^@uicheck/rn$': '<rootDir>/../../packages/rn/src/index.ts',
    '^@uicheck/core$': '<rootDir>/../../packages/core/src/index.ts',
    '^@uicheck/core/(.*)$': '<rootDir>/../../packages/core/src/$1.ts',
    '^@babel/runtime/(.*)$': '<rootDir>/node_modules/@babel/runtime/$1',
  },
};
