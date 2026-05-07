const express = require("express");
const pino = require("pino");
const pinoHttp = require("pino-http");
const rfs = require("rotating-file-stream");
const fs = require("fs");

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

app.set("trust proxy", true);

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getClientIp = (req) => {
  const cfIp = req.headers["cf-connecting-ip"];
  if (cfIp) return cfIp.trim();

  const xff = req.headers["x-forwarded-for"];
  if (xff) return xff.split(",")[0].trim();

  return req.socket.remoteAddress || "unknown";
};

app.use((req, res, next) => {
  const accept = req.headers.accept || "";
  const ua = req.headers["user-agent"] || "";

  const wantsJSON = accept.includes("application/json");
  const looksLikeBrowser = /Mozilla|Chrome|Safari|Firefox|Edge/.test(ua);

  req.isApiClient = wantsJSON || !looksLikeBrowser;

  next();
});

app.get("/", (req, res) => {
  const ip = getClientIp(req);
  const safeIp = escapeHtml(ip);

  req.log.info({ ip, api: req.isApiClient });

  const footer = `
    <div class="footer">
      Logs of IP addresses are stored for up to 7 days for security and debugging purposes.
      <a href="/privacy">Privacy Policy</a> ·
      <a href="https://github.com/MrurBo" target="_blank">Contact</a>
    </div>
  `;

  if (req.isApiClient) {
    return res.type("application/json").send(JSON.stringify({ ip }));
  }

  return res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            margin: 0;
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            font-family: sans-serif;
          }
          .footer {
            position: fixed;
            bottom: 10px;
            left: 10px;
            font-size: 12px;
            opacity: 0.7;
          }
        </style>
      </head>
      <body>
        <h1>${safeIp}</h1>
        ${footer}
      </body>
    </html>
  `);
});

app.get("/privacy", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Privacy Policy</title>
      </head>
      <body style="font-family: sans-serif; max-width: 700px; margin: 40px auto;">
        <h1>Privacy Policy</h1>

        <p>This service logs IP addresses for security and debugging purposes.</p>

        <p>IP addresses are stored for up to 7 days and then automatically deleted.</p>

        <p>No data is sold, shared, or used for advertising.</p>

        <p>Contact: <a href="https://github.com/MrurBo" target="_blank">GitHub</a></p>
      </body>
    </html>
  `);
});

app.listen(3000, "0.0.0.0", () => {
  logger.info("Server running on port 3000");
});