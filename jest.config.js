
const config =  {
    testEnvironment: 'node',
    collectCoverage: true,
    coverageReporters: ['json-summary', 'text'],
    coverageThreshold: {
        global: {
            lines: 75
        }
    },
};

if (!process.env.CI) {
    config.setupFilesAfterEnv = ['<rootDir>/jest.setup.js']
}

module.exports = config;