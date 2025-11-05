const os = require('os');
const config = require('./config.js');

const requests = {};
// const authAttempts = { success: 0, failure: 0 };

// Middleware to track requests per endpoint
function requestTracker(req, res, next) {
  const endpoint = `[${req.method}] ${req.path}`;
  requests[endpoint] = (requests[endpoint] || 0) + 1;
  next();
}

//Middleware to get CPU and Memory usage
function getCpuUsagePercentage() {
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  return cpuUsage.toFixed(2) * 100;
}

function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  return memoryUsage.toFixed(2);
}

//TODO: Middleware for auth success/failure metrics, pass to authRouter.js in service.js
// function authMetrics(req, res, next) {
//   // Implementation goes here
//   next();
// }


//TODO: Middleware for pizza purchase metrics

// This will periodically send the collected metrics to Grafana
if (process.env.NODE_ENV !== 'test') {
    setInterval(() => {
    const metrics = [];
    Object.keys(requests).forEach((endpoint) => {
      metrics.push(createMetric('requests', requests[endpoint], '1', 'sum', 'asInt', { endpoint }));
      metrics.push(createMetric('memory.usage', getMemoryUsagePercentage(), '%', 'gauge', 'asDouble', {}));
      metrics.push(createMetric('cpu.usage', getCpuUsagePercentage(), '%', 'gauge', 'asDouble', {}));
    });

    sendMetricToGrafana(metrics);
  }, 10000);
}

//TODO: Abstract this into a separate class/module
function createMetric(metricName, metricValue, metricUnit, metricType, valueType, attributes) {
  attributes = { ...attributes, source: config.metrics.source };

  const metric = {
    name: metricName,
    unit: metricUnit,
    [metricType]: {
      dataPoints: [
        {
          [valueType]: metricValue,
          timeUnixNano: Date.now() * 1000000,
          attributes: [],
        },
      ],
    },
  };

  Object.keys(attributes).forEach((key) => {
    metric[metricType].dataPoints[0].attributes.push({
      key: key,
      value: { stringValue: attributes[key] },
    });
  });

  if (metricType === 'sum') {
    metric[metricType].aggregationTemporality = 'AGGREGATION_TEMPORALITY_CUMULATIVE';
    metric[metricType].isMonotonic = true;
  }

  return metric;
}

function sendMetricToGrafana(metrics) {
  const body = {
    resourceMetrics: [
      {
        scopeMetrics: [
          {
            metrics,
          },
        ],
      },
    ],
  };

  fetch(`${config.metrics.url}`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { Authorization: `Bearer ${config.metrics.apiKey}`, 'Content-Type': 'application/json' },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP status: ${response.status}`);
      }
    })
    .catch((error) => {
      console.error('Error pushing metrics:', error);
    });
}

module.exports = {
  requestTracker,
  getCpuUsagePercentage,
  getMemoryUsagePercentage,
};