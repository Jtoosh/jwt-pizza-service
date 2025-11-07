const os = require("os");
const config = require("./config.js");
const { randomUUID } = require("crypto");

const requests = {};
const latencyByEndpoint = new Map();

let pizzaSuccesses = 0;
let pizzaRevenue = 0;
let pizzaFailures = 0;
const pizzaLatencyMs = [];

const authAttempts = { success: 0, failure: 0 };
let activeUserCount = 0;

function recordLatency(endpoint, latencyMs) {
  if (!latencyByEndpoint.has(endpoint)) {
    latencyByEndpoint.set(endpoint, [latencyMs]);
  }
  latencyByEndpoint.get(endpoint).push(latencyMs);
}

// Middleware to track requests per endpoint and latency per request
function requestTracker(req, res, next) {
  const requestID = randomUUID();
  req.requestID = requestID;

  const endpointStart = Date.now();
  res.on("finish", () => {
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

// Function for auth success/failure metrics
function recordAuthAttempt(isSuccess) {
  if (isSuccess) {
    authAttempts.success += 1;
    activeUserCount += 1;
  } else {
    authAttempts.failure += 1;
  }
}

function recordLogout() {
  if (activeUserCount > 0) {
    activeUserCount -= 1;
  }
}

// Function for pizza purchase metrics
function pizzaPurchaseMetrics(isSuccess, price, latencyMs, numberOfItems) {
  if (isSuccess) {
    pizzaSuccesses += numberOfItems;
    pizzaRevenue += price;
  } else if (!isSuccess) {
    pizzaFailures += 1;
  }
  pizzaLatencyMs.push(latencyMs);
}

// This will periodically send the collected metrics to Grafana
if (process.env.NODE_ENV !== "test") {
  setInterval(() => {
    const metrics = [];

    Object.keys(requests).forEach((endpoint) => {
      metrics.push(
        createMetric("requests", requests[endpoint], "1", "sum", "asInt", {
          endpoint,
        })
      );
    });

    metrics.push(
      createMetric(
        "memory.usage",
        getMemoryUsagePercentage(),
        "%",
        "gauge",
        "asDouble",
        {}
      )
    );
    metrics.push(
      createMetric(
        "cpu.usage",
        getCpuUsagePercentage(),
        "%",
        "gauge",
        "asDouble",
        {}
      )
    );

    latencyByEndpoint.forEach((latencies, endpoint) => {
      const sumLatency = latencies.reduce((a, b) => a + b, 0);
      const avgLatency = sumLatency / latencies.length;
      metrics.push(
        createMetric("latency.avg", avgLatency, "ms", "gauge", "asDouble", {
          endpoint,
        })
      );
      // Reset latencies after sending
      latencyByEndpoint.set(endpoint, []);
    });

    metrics.push(
      createMetric("pizza.successes", pizzaSuccesses, "1", "sum", "asInt", {})
    );
    metrics.push(
      createMetric("pizza.failures", pizzaFailures, "1", "sum", "asInt", {})
    );
    metrics.push(
      createMetric("pizza.revenue", pizzaRevenue, "USD", "sum", "asDouble", {})
    );
    if (pizzaLatencyMs.length > 0) {
      const sumPizzaLatency = pizzaLatencyMs.reduce((a, b) => a + b, 0);
      const avgPizzaLatency = sumPizzaLatency / pizzaLatencyMs.length;
      metrics.push(
        createMetric(
          "pizza.latency.avg",
          avgPizzaLatency,
          "ms",
          "gauge",
          "asDouble",
          {}
        )
      );
      // Reset pizza latencies after sending
      pizzaLatencyMs.length = 0;
    }

    metrics.push(
      createMetric(
        "auth.attempts.success",
        authAttempts.success,
        "1",
        "sum",
        "asInt",
        {}
      )
    );
    metrics.push(
      createMetric(
        "auth.attempts.failure",
        authAttempts.failure,
        "1",
        "sum",
        "asInt",
        {}
      )
    );
    metrics.push(
      createMetric("active.users", activeUserCount, "1", "gauge", "asInt", {})
    );

    sendMetricToGrafana(metrics);
  }, 10000);
}

//TODO: Abstract this into a separate class/module
function createMetric(
  metricName,
  metricValue,
  metricUnit,
  metricType,
  valueType,
  attributes
) {
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

  if (metricType === "sum") {
    metric[metricType].aggregationTemporality =
      "AGGREGATION_TEMPORALITY_CUMULATIVE";
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
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${config.metrics.apiKey}`,
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP status: ${response.message}`);
      }
    })
    .catch((error) => {
      console.error("Error pushing metrics:", error);
    });
}

module.exports = {
  requestTracker,
  getCpuUsagePercentage,
  getMemoryUsagePercentage,
  pizzaPurchaseMetrics,
  recordAuthAttempt,
  recordLogout,
};
