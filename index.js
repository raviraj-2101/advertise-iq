require("dotenv").config();
require("./config/db");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const corsOptionsDelegate = require("./middleware/cors");
const path = require('path')

app.use(express.static('upload'))
app.use("/upload", express.static(path.join(__dirname, 'upload')));

app.use(cors(corsOptionsDelegate));

app.use((req, res, next) => {
  if (req.originalUrl === '/api/customer/stripe/webhook') {
    next(); // Skip express.json() for the webhook route
  } else {
    express.json({
      limit: "1024mb",
    })(req, res, next); // Parse JSON for other routes
  }
});

app.use((req, res, next) => {
  if (req.originalUrl === '/api/customer/stripe/webhook') {
    next(); // Skip express.json() for the webhook route
  } else {
    bodyParser.json()(req, res, next); // Parse JSON for other routes
  }
});
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

const routes = require("./routes/index");
app.use("/api", routes);

const port = process.env.PORT || 5000;
app.listen(port, function () {
  console.log(`The web server has started on port ${port}`);
});
