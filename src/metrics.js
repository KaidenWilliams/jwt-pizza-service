// TODO

// a. HTTP requests by method/minute. Total Requests, Get Requests, Put Requests, Post Requests, Delete requests

// b. Active Users

// c. Authentication Attempts / minute (successful + failed)

// d. CPU and Memory Usage (will use os.... )

// e. Pizza revenue. i. Sold/Minute, ii. Creation Failures, iii. Revenue / Minute

// d. Latency i. Service Endpoint. ii. Pizza Creation

const config = require("./config.json");

class Metrics {
  constructor() {
    this.requests = {
      all: 0,
      get: 0,
      post: 0,
      put: 0,
      delete: 0,
    };

    this.startMetricsTimer();
  }

  requestTracker(req) {
    const method = req.method.toLowerCase();

    this.requests.all++;
    if (this.requests[method !== undefined]) {
      this.requests[method]++;
    }
  }

  startMetricsTimer() {
    const timer = setInterval(() => {
      this.sendEveryRequest();
    }, 10000);
    timer.unref();
  }

  sendEveryRequest() {
    for (const method in this.requests) {
      this.sendMetricToGrafana("request", method, "total", this.requests[method]);
    }
  }

  sendMetricToGrafana(metricPrefix, httpMethod, metricName, metricValue) {
    const metric = `${metricPrefix},source=${config.source},method=${httpMethod} ${metricName}=${metricValue}`;

    fetch(`${config.url}`, {
      method: "post",
      body: metric,
      headers: { Authorization: `Bearer ${config.userId}:${config.apiKey}` },
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
