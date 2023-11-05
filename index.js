const express = require("express");
const cors = require("cors");
const logger = require("morgan");
const chalk = require("chalk");
const Bard = require("./lib/bard");
const os = require("os");
const app = express();
const PORT = process.env.PORT || 8022 || 8888 || 1923;
const speed = require("performance-now");
const nou = require("node-os-utils");

app.set("json spaces", 2);
app.set("trust proxy", true);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("x-powered-by", "RizzyFuzz Backend");
  next();
});

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function runtime(seconds) {
  seconds = Number(seconds);
  var d = Math.floor(seconds / (3600 * 24));
  var h = Math.floor((seconds % (3600 * 24)) / 3600);
  var m = Math.floor((seconds % 3600) / 60);
  var s = Math.floor(seconds % 60);
  var dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
  var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
  var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
  var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
  return dDisplay + hDisplay + mDisplay + sDisplay;
}

async function checkBandwidth() {
  ind = 0;
  out = 0;

  for (let i of await require("node-os-utils").netstat.stats()) {
    ind += parseInt(i.inputBytes);
    out += parseInt(i.outputBytes);
  }

  return {
    download: await format(ind),
    upload: await format(out),
  };
}

function status(code) {
  if (code > 400 && code < 499) return chalk.yellow(code);
  if (code > 500 && code < 599) return chalk.red(code);
  if (code > 299 && code < 399) return chalk.cyan(code);
  if (code > 199) return chalk.green(code);
  return chalk.yellow(code);
}

app.use(
  logger(function (tokens, req, res) {
    return (
      "[ ✨ ] " +
      [
        req.ip,
        tokens.method(req, res),
        tokens.url(req, res),
        status(tokens.status(req, res)),
        tokens["response-time"](req, res) + " ms",
        formatBytes(
          isNaN(tokens.res(req, res, "content-length"))
            ? 0
            : tokens.res(req, res, "content-length"),
        ),
      ].join(" | ")
    );
  }),
);

app.use((req, res, next) => {
  const REVERSE_PROXY = eval(true);
  const ALLOW = ["bard.rizzy.eu.org"];
  if (REVERSE_PROXY && !ALLOW.includes(req.get("host")))
    return res
      .status(403)
      .send(`<center><h1>Sorry, Access Denied</h1></center>`);
  next();
});

app.use(function (err, req, res, next) {
  console.error(err.stack);
  res.status(500).json({
    content: "Something broke!",
    status: 500,
    creator: "RizzyFuzz",
  });
});

app.post("/api/onstage", cors(), async (req, res) => {
  const { ask } = req.body;
  if (!ask) {
    return res.status(400).json({
      content: "Bad Request: No Query Ask Provided",
      status: 400,
      creator: "RizzyFuzz",
    });
  }

  const bard = new Bard();
  try {
    await bard.configure(
      1,
      "cgi0zjh5k1ckIk7VU6CZ9PaXwmZOXYz1mdI6Jg7zSuBk6QTCVHWEVsXbZGmowJHmQ4Epiw.",
    );
    const response = await bard.question(ask);
    if (!response.status)
      res.json({
        content: response.content,
        status: 500,
        creator: "RizzyFuzz",
      });
    res.json({ content: response.content, status: 200, creator: "RizzyFuzz" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      content: "Internal Server Error!",
      status: 500,
      creator: "RizzyFuzz",
    });
  }
});

app.all("/api/onstage", (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({
      content: "Method not allowed",
      status: 405,
      creator: "RizzyFuzz",
    });
  }
});

app.get("/", function (req, res) {
  res.status(200).json({
    status: 200,
    creator: "RizzyFuzz",
    msg: "Server API ON!",
  });
});

app.all("/status", async (req, res, next) => {
  const timestamp = speed();
  const latensi = speed() - timestamp;
  var { totalGb, usedGb, freeGb } = await nou.drive.info();
  var { download, upload } = await checkBandwidth();

  if (req.query.format && req.query.format == "json")
    return res.send({
      ping: new Date() - ping,
      core: core.length,
      status: "on",
    });
  res.status(200).send(`
<html>
<head>
<title>Stats Server Bard AI</title>
</head>
<body>
<center><b><h1>Stats Servers</h1></b></center>
<hr>
<center>
Arch : ${os.arch()}
<br>
Status : Normal 🟢
<br>
Hostname : RizzyFuzz Backend
<br>
Response Server : ${latensi.toFixed(4)} s
<br>
Download : ${download}
<br>
Upload : ${upload}
<br>
Total Storage : ${totalGb} GB
<br>
Used Storage : ${usedGb} GB
<br>
Free Storage : ${freeGb} GB
<br>
CPU : ${os.cpus()[0].model}${
    os.cpus().length > 1 ? " (" + os.cpus().length + "x)" : ""
  }
<br>
Release : ${os.release()}
<br>
Platform : ${os.platform()}
<br>
Memory RAM :  ${formatBytes(os.totalmem() - os.freemem())} / ${formatBytes(
    os.totalmem(),
  )}
<br>
Runtime Server : ${runtime(os.uptime())}
</hr>
</center>
</body>
</html>
`);
});

app.use((req, res, next) =>
  res.status(404).send(`<html>
<head><title>404 Not Found</title></head>
<body>
<center><h1>404 Not Found</h1></center>
<hr><center>nginx/1.18.0 (Ubuntu)</center>
</body>
</html>`),
);

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});

module.exports = app;
