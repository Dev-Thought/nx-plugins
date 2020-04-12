module.exports = {
  name: 'nx-deploy-it',
  preset: '../../jest.config.js',
  transform: {
    '^.+\\.[tj]sx?$': 'ts-jest'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'html'],
  coverageDirectory: '../../coverage/libs/nx-deploy-it',
  coverageThreshold: {
    global: {
      statements: 76,
      branches: 53,
      lines: 75,
      functions: 76
    }
  }
};
