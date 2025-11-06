const os = require('os');
const config = require('./config.js');
const { randomUUID } = require('crypto');

const requests = {};
const latencyByEndpoint = new Map();
// const authAttempts = { success: 0, failure: 0 };

function recordLatency(endpoint, latencyMs) {
  // Define latency buckets in milliseconds
  const bounds = [50, 100, 250, 500, 1000, 2500, 5000];
  let aggregator = latencyByEndpoint.get(endpoint);
  if (!aggregator) {
    aggregator = { bounds, bucketCounts: new Array(bounds.length + 1).fill(0), count: 0, sum: 0 };
    latencyByEndpoint.set(endpoint, aggregator);
  }
  aggregator.count += 1;
  aggregator.sum += latencyMs;
  let idx = bounds.findIndex((b) => latencyMs <= b);
  if (idx === -1) idx = bounds.length; // overflow bucket
  aggregator.bucketCounts[idx] += 1;
}

// Middleware to track requests per endpoint
function requestTracker(req, res, next) {
  const requestID = randomUUID();
  req.requestID = requestID;

  const endpointStart = Date.now();
  res.on('finish', () => {
    const endpointEnd = Date.now();
    const latencyMs = endpointEnd - endpointStart;

    const endpoint = `[${req.method}] ${req.path}`;
    requests[endpoint] = (requests[endpoint] || 0) + 1;

    recordLatency(endpoint, latencyMs);
  });
  
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
    });

    metrics.push(createMetric('memory.usage', getMemoryUsagePercentage(), '%', 'gauge', 'asDouble', {}));
    metrics.push(createMetric('cpu.usage', getCpuUsagePercentage(), '%', 'gauge', 'asDouble', {}));

    for (const [endpoint, aggregator] of latencyByEndpoint.entries()) {
      metrics.push(createHistogramMetric('request.latency', 'ms', aggregator, { endpoint }));
      // reset for next interval
      latencyByEndpoint.set(endpoint, { bounds: aggregator.bounds, bucketCounts: new Array(aggregator.bounds.length + 1).fill(0), count: 0, sum: 0 });
    }

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

// Create proper OTLP histogram metric


function createHistogramMetric(metricName, metricUnit, aggregatorParam, attributes) {
  attributes = { ...attributes, source: config.metrics.source };
  const dataPoints = {
    timeUnixNano: Date.now() * 1_000_000,
    count: aggregatorParam.count,
    sum: aggregatorParam.sum,
    bucketCounts: aggregatorParam.bucketCounts,
    explicitBounds: aggregatorParam.bounds,
    attributes: Object.entries(attributes).map(([key, val]) => ({ key, value: { stringValue: String(val) } })),
  };
  return {
    name: metricName,
    unit: metricUnit,
    histogram: {
      aggregationTemporality: 'AGGREGATION_TEMPORALITY_DELTA',
      dataPoints: [dataPoints],
    },
  };
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
        throw new Error(`HTTP status: ${response.message}`);
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