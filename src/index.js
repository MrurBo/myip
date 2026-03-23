const express = require("express");

const app = express();
app.set("trust proxy", 3);

const getClientIp = (req) => {
  return (
    req.headers['cf-connecting-ip'] ||
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.socket.remoteAddress
  );
};

app.use((req, res, next) => {
  const accept = req.headers.accept || '';
  const ua = req.headers['user-agent'] || '';

  const wantsJSON = accept.includes('application/json');
  const looksLikeBrowser = /Mozilla|Chrome|Safari|Firefox|Edge/.test(ua);

  req.isApiClient = wantsJSON || !looksLikeBrowser;

  next();
});


app.get("/", (req, res) => {
  const ip = getClientIp(req);

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

app.listen(3000, "0.0.0.0", () => {});