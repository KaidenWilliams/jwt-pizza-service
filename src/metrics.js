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
  static instance = null;

  constructor() {
    if (Metrics.instance) {
      return Metrics.instance;
    }

    this.requests = {
      all: 0,
      get: 0,
      post: 0,
      put: 0,
      delete: 0,
    };

    Metrics.instance = this;
    this.startMetricsTimer();
  }

  startMetricsTimer() {
    const timer = setInterval(async () => {
      await this.sendAllMetrics();
    }, 10000);
    timer.unref();
  }

  async sendAllMetrics() {
    await this.sendHTTPMetrics();
    await this.sendCPUMetrics();
    await this.sendMemoryMetrics();
  }

  // a. HTTP Requests
  logHTTPRequest(req) {
    const method = req.method.toLowerCase();

    this.requests.all++;
    if (method in this.requests) {
      this.requests[method]++;
    }
  }

  async sendHTTPMetrics() {
    for (const method in this.requests) {
      await this.sendMetricToGrafana("request", method, "total", this.requests[method]);
      this.requests[method] = 0;
    }
  }

  // b. CPU and Memory
  async getCpuUsagePercentage() {
    const value = await new Promise((resolve) => {
      osUtils.cpuUsage((value) => {
        resolve(value);
      });
    });
    return (value * 100).toFixed(1);
  }

  async sendCPUMetrics() {
    const cpuUsage = await this.getCpuUsagePercentage();
    await this.sendMetricToGrafana("system", "cpu", "usage", cpuUsage);
  }

  getMemoryUsagePercentage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;
    return memoryUsage.toFixed(2);
  }

  async sendMemoryMetrics() {
    const memoryUsage = this.getMemoryUsagePercentage();
    await this.sendMetricToGrafana("system", "memory", "usage", memoryUsage);
  }

  // c. Authentication Attempts

  // Shared send Function
  async sendMetricToGrafana(metricPrefix, type, metricName, metricValue) {
    const metric = `${metricPrefix},source=${config.metrics.source},type=${type} ${metricName}=${metricValue}`;

    await fetch(`${config.metrics.url}`, {
      method: "post",
      body: metric,
      headers: { Authorization: `Bearer ${config.metrics.userId}:${config.metrics.apiKey}` },
    })
      .then((response) => {
        if (!response.ok) {
          console.error("Failed to push metrics data to Grafana");
        } else {
          console.log(`Pushed ${metric}`);
        }
      })
      .catch((error) => {
        console.error("Error pushing metrics:", error);
      });
  }
}

const metrics = new Metrics();
module.exports = metrics;
