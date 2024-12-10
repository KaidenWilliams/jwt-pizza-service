const express = require("express");
const { authRouter, setAuthUser } = require("./routes/authRouter.js");
const orderRouter = require("./routes/orderRouter.js");
const franchiseRouter = require("./routes/franchiseRouter.js");
const version = require("./version.json");
const config = require("./config.js");
const metrics = require("./metrics.js");
const logger = require("./logger.js");

// HOPEFULLY WILL PREVENT THE CHASO INJECTION
function preventChaosInjection(req, res, next) {
  try {
    const decodedPath = decodeURIComponent(req.path);

    if (
      !/^\/[a-zA-Z0-9_\-\/\.]*$/.test(decodedPath) ||
      decodedPath.includes("%") ||
      decodedPath.includes("\0") ||
      decodedPath.length > 2000
    ) {
      logger.warn("Chaos Attempt Detected", {
        originalPath: req.path,
        decodedPath: decodedPath,
        method: req.method,
        sourceIP: req.ip,
        timestamp: new Date().toISOString(),
      });

      metrics.recordChaosIncident("url_encoding");

      return res.status(400).json({
        status: "rejected",
        reason: "Invalid request path",
        timestamp: new Date().toISOString(),
      });
    }

    next();
  } catch (error) {
    logger.error("Path Decoding Error", {
      error: error.message,
      path: req.path,
    });

    res.status(400).json({
      status: "error",
      message: "Invalid request path encoding",
    });
  }
}

app.use(preventChaosInjection);

app.use(
  express.json({
    limit: "10kb",
  })
);

// Logging Middleware
app.use(logger.httpLogger);

app.use(setAuthUser);

// Latency Middleware
app.use((req, res, next) => {
  const start = process.hrtime();

  res.on("finish", () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const duration = seconds * 1000 + nanoseconds / 1e6;

    metrics.recordLatency(req, res, duration);
  });

  next();
});

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  next();
});

// Metrics logging middlewar
app.use((req, res, next) => {
  metrics.logHTTPRequest(req);
  next();
});

const apiRouter = express.Router();
app.use("/api", apiRouter);
// Augment original Auth router middleware with metric middlware
apiRouter.use(
  "/auth",
  (req, res, next) => {
    // Captures original res.end to be called with corresponding args AFTER we log the Auth Request
    const originalEnd = res.end;
    res.end = function (...args) {
      metrics.logAuthRequest(res);
      metrics.logActiveUsers(req, res);
      originalEnd.apply(res, args);
    };

    next();
  },
  authRouter
);

apiRouter.use("/order", orderRouter);
apiRouter.use("/franchise", franchiseRouter);

apiRouter.use("/docs", (req, res) => {
  res.json({
    version: version.version,
    endpoints: [...authRouter.endpoints, ...orderRouter.endpoints, ...franchiseRouter.endpoints],
    config: { factory: config.factory.url, db: config.db.connection.host },
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "welcome to JWT Pizza",
    version: version.version,
  });
});

app.use("*", (req, res) => {
  res.status(404).json({
    message: "unknown endpoint",
  });
});

// Default error handler for all exceptions and errors
app.use((err, req, res, next) => {
  res.status(err.statusCode ?? 500).json({ message: err.message, stack: err.stack });
  next();
});

module.exports = app;
