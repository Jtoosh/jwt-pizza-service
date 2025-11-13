
const config =  {
    testEnvironment: 'node',
    collectCoverage: true,
    coveragePathIgnorePatterns: [
      "src/metrics.js", // Exclude a specific file
    ],
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