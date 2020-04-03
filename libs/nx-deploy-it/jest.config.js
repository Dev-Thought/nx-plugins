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
      branches: 59,
      functions: 85,
      lines: 83,
      statements: 83
    }
  }
};
