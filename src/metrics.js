// TODO

// a. HTTP requests by method/minute. Total Requests, Get Requests, Put Requests, Post Requests, Delete requests

// b. Active Users

// c. Authentication Attempts / minute (successful + failed)

// d. CPU and Memory Usage (will use os.... )

// e. Pizza revenue. i. Sold/Minute, ii. Creation Failures, iii. Revenue / Minute

// d. Latency i. Service Endpoint. ii. Pizza Creation

const config = require("./config.js");
const os = require("os");
const osUtils = require("os-utils");

class Metrics {
  INTERVAL = 10000;

  static instance = null;

  constructor() {
    if (Metrics.instance) {
      return Metrics.instance;
    }

    Metrics.instance = this;
    this.startMetricsTimer();
  }

  startMetricsTimer() {
    const timer = setInterval(async () => {
      await this.sendAll();
    }, this.INTERVAL);
    timer.unref();
  }

  async sendAll() {
    const builder = new MetricBuilder();
    this.makeHTTPMetrics(builder);
    this.makeAuthMetrics(builder);
    this.makeActiveUserMetrics(builder);
    // Couldn't get CPU stuff to work synchronously
    await this.makeCPUMetrics(builder);
    this.makeMemoryMetrics(builder);
    this.makeLatencyMetrics(builder);
    this.makePizzaMetrics(builder);
    await this.sendMetricsToGrafana(builder.metrics);
    console.log();
  }

  // Shared send Function
  async sendMetricsToGrafana(metricList) {
    for (const metric of metricList) {
      await fetch(`${config.metrics.url}`, {
        method: "post",
        body: metric,
        headers: { Authorization: `Bearer ${config.metrics.userId}:${config.metrics.apiKey}` },
      })
        .then((response) => {
          if (!response.ok) {
            console.log(
              `Failed to push metrics data to Grafana. Status: ${response.status} - ${response.statusText}`
            );
          } else {
            console.log(`Pushed ${metric}`);
          }
        })
        .catch((error) => {
          console.error("Error pushing metrics:", error);
        });
    }
  }

  // a. HTTP Requests
  requests = {
    all: 0,
    get: 0,
    post: 0,
    put: 0,
    delete: 0,
  };

  logHTTPRequest(req) {
    const method = req.method.toLowerCase();

    this.requests.all++;
    if (method in this.requests) {
      this.requests[method]++;
    }
  }

  makeHTTPMetrics(builder) {
    for (const method in this.requests) {
      builder.addMetric("request", method, "total", this.requests[method]);
      this.requests[method] = 0;
    }
  }

  // b. Auth successes / failures and C. Current active users
  authRequests = {
    success: 0,
    failure: 0,
  };

  logAuthRequest(res) {
    if (res.statusCode === 200) {
      this.authRequests["success"]++;
    } else if (res.statusCode >= 400) {
      this.authRequests["failure"]++;
    }
  }

  makeAuthMetrics(builder) {
    for (const status in this.authRequests) {
      builder.addMetric("auth", status, "total", this.authRequests[status]);
      this.authRequests[status] = 0;
    }
  }

  // c. Active users
  activeUserCount = 0;

  // horrible way to do it, couldn't think of better one though
  logActiveUsers(req, res) {
    if (res.statusCode !== 200) return;

    if (this.isRegisterRequest(req) || this.isLoginRequest(req)) {
      this.activeUserCount++;
    } else if (this.isLogoutRequest(req)) {
      this.activeUserCount--;
    }
  }

  isRegisterRequest(req) {
    return req.method.toLowerCase() === "post" && req.path === "/";
  }
  isLoginRequest(req) {
    return req.method.toLowerCase() === "put" && req.path === "/";
  }
  isLogoutRequest(req) {
    return req.method.toLowerCase() === "delete" && req.path === "/";
  }

  makeActiveUserMetrics(builder) {
    builder.addMetric("user", "active", "total", this.activeUserCount);
  }

  // d. CPU and Memory
  async getCpuUsagePercentage() {
    const value = await new Promise((resolve) => {
      osUtils.cpuUsage((value) => {
        resolve(value);
      });
    });
    return (value * 100).toFixed(1);
  }

  async makeCPUMetrics(builder) {
    const cpuUsage = await this.getCpuUsagePercentage();
    builder.addMetric("system", "cpu", "usage", cpuUsage);
  }

  getMemoryUsagePercentage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;
    return memoryUsage.toFixed(2);
  }

  makeMemoryMetrics(builder) {
    const memoryUsage = this.getMemoryUsagePercentage();
    builder.addMetric("system", "memory", "usage", memoryUsage);
  }

  // e. Latency (service endpoint, pizza creation)

  latencyArr = [];
  pizzaCreationLatencyArr = [];

  recordLatency(req, res, duration) {
    this.latencyArr.push(duration);

    if (this.isCreatePizzaRequest(req)) {
      this.pizzaCreationLatencyArr.push(duration);

      this.calculatePizzaMetrics(res);
    }
  }

  isCreatePizzaRequest(req) {
    return req.method.toLowerCase() === "post" && req.originalUrl === "/api/order";
  }

  makeLatencyMetrics(builder) {
    if (this.latencyArr.length > 0) {
      const allAverageLatency = (
        this.latencyArr.reduce((sum, value) => sum + value, 0) / this.latencyArr.length
      ).toFixed(1);

      builder.addMetric("latency", "all", "average", allAverageLatency);

      this.latencyArr = [];
    }

    if (this.pizzaCreationLatencyArr.length > 0) {
      const pizzaAverageLatency = (
        this.pizzaCreationLatencyArr.reduce((sum, value) => sum + value, 0) /
        this.pizzaCreationLatencyArr.length
      ).toFixed(1);

      builder.addMetric("latency", "pizza", "average", pizzaAverageLatency);

      this.pizzaCreationLatencyArr = [];
    }
  }

  // f. Pizzas (Sold/minute, Creation failures, Revenue/minute)

  pizzaMetrics = {
    sold: 0,
    failed: 0,
    revenue: 0,
  };

  calculatePizzaMetrics(res) {
    if (res.statusCode === 200) {
      // Successful order
      this.pizzaMetrics.sold++;
      this.pizzaMetrics.revenue += calculateOrderTotal(res.order);
    } else {
      // Failed order
      this.pizzaMetrics.failed++;
    }
  }

  calculateOrderTotal(order) {
    return order.items.reduce((total, item) => total + item.price, 0);
  }

  makePizzaMetrics(builder) {
    builder.addMetric("pizza", "success", "transactions", this.pizzaMetrics.sold);
    this.pizzaMetrics.sold = 0;

    builder.addMetric("pizza", "failure", "transactions", this.pizzaMetrics.failed);
    this.pizzaMetrics.failed = 0;

    builder.addMetric("pizza", "total", "money", this.pizzaMetrics.revenue);
    this.pizzaMetrics.revenue = 0;
  }
}

class MetricBuilder {
  metrics = [];
  addMetric(metricPrefix, type, metricName, metricValue) {
    const metric = `${metricPrefix},source=${config.metrics.source},type=${type} ${metricName}=${metricValue}`;
    this.metrics.push(metric);
  }
}

const metrics = new Metrics();
module.exports = metrics;
