// TODO

// a. HTTP requests by method/minute. Total Requests, Get Requests, Put Requests, Post Requests, Delete requests

// b. Active Users

// c. Authentication Attempts / minute (successful + failed)

// d. CPU and Memory Usage (will use os.... )

// e. Pizza revenue. i. Sold/Minute, ii. Creation Failures, iii. Revenue / Minute

// d. Latency i. Service Endpoint. ii. Pizza Creation

const config = require("./config.js");

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

  requestTracker(req) {
    const method = req.method.toLowerCase();

    this.requests.all++;
    if (method in this.requests) {
      this.requests[method]++;
    }
  }

  startMetricsTimer() {
    const timer = setInterval(async () => {
      await this.sendEveryRequest();
    }, 10000);
    timer.unref();
  }

  async sendEveryRequest() {
    for (const method in this.requests) {
      await this.sendMetricToGrafana("request", method, "total", this.requests[method]);
      this.requests[method] = 0;
    }
  }

  async sendMetricToGrafana(metricPrefix, httpMethod, metricName, metricValue) {
    const metric = `${metricPrefix},source=${config.metrics.source},method=${httpMethod} ${metricName}=${metricValue}`;

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
