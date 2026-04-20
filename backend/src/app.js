const compression = require("compression");
const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const { reportRouter } = require("./routes/reportRoutes");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

app.use("/api", reportRouter);

app.use((req, res) => {
  res.status(404).json({ error: { message: "Route not found" } });
});

app.use(errorHandler);

module.exports = { app };
