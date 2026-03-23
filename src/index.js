const express = require("express");

const app = express();

app.get("/", (req, res) => {
  const ip = req.ip;

  if (req.isApiClient) {
    return res.send(ip);
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
        </style>
      </head>
      <body>
        <h1>${ip}</h1>
      </body>
    </html>
  `);
});

app.use((req, res, next) => {
  const accept = req.headers.accept || '';
  const ua = req.headers['user-agent'] || '';

  const wantsJSON = accept.includes('application/json');
  const looksLikeBrowser = /Mozilla|Chrome|Safari|Firefox|Edge/.test(ua);

  req.isApiClient = wantsJSON && !looksLikeBrowser;

  next();
});

app.listen(3000, "0.0.0.0", () => {});