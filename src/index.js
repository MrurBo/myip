const express = require("express");
const pino = require("pino");
const pinoHttp = require("pino-http");
const rfs = require("rotating-file-stream");
const fs = require("fs");
const path = require("path");

const app = express();

const logDir = "/app/logs";

fs.mkdirSync(logDir, { recursive: true });

const stream = rfs.createStream("myip.log", {
  interval: "1d",
  path: logDir,
  maxFiles: 7
});

const logger = pino(
  {
    level: "info",
    timestamp: pino.stdTimeFunctions.isoTime
  },
  pino.multistream([
    { stream: process.stdout },
    { stream }
  ])
);

app.use(pinoHttp({ logger }));

app.set("trust proxy", 2);

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

app.use((req, res, next) => {
  const accept = req.headers.accept || "";
  const ua = req.headers["user-agent"] || "";

  const wantsJSON = accept.includes("application/json");
  const looksLikeBrowser = /Mozilla|Chrome|Safari|Firefox|Edge/.test(ua);

  req.isApiClient = wantsJSON || !looksLikeBrowser;

  next();
});

app.get("/", (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const safeIp = escapeHtml(ip);

  req.log.info({ ip, api: req.isApiClient });

  if (req.isApiClient) {
    return res.type("application/json").send(JSON.stringify({ ip }));
  }

  return res.send(`<h1>${safeIp}</h1>`);
});

app.listen(3000, "0.0.0.0", () => {
  logger.info("Server running on port 3000");
});