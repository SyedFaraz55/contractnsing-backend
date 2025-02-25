require("dotenv").config();
const bodyParser = require("body-parser");
const config = require("config");
const express = require("express");
const { default: mongoose } = require("mongoose");
const morgan = require("morgan");
const cors  = require('cors')
const app = express();

if (!config.get("jwtPrivateKey")) {
  console.error("FATAL ERROR: jwtPrivateKey is not defined");
  process.exit(1);
}

app.use("/uploads",express.static("uploads"))
app.use(morgan("tiny"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors({
  origin: "https://www.phonebay.ae", // Replace with your frontend URL
  methods: "GET,POST,PUT,DELETE",
  allowedHeaders: "Content-Type,Authorization"
}));

const PORT = process.env.PORT || 8000;
const MONGOURI = process.env.mongoURI || config.get("mongoURI");

const userRoutes = require("./routes/Users");
const auth = require("./routes/auth");
const admin = require('./routes/admin')
const cns = require('./routes/cns')

mongoose
  .connect(MONGOURI, { useNewUrlParser: true })
  .then(() => console.log("connected"))
  .catch((err) => console.log(err));

app.use("/api/users", userRoutes);
app.use("/api/auth", auth);
app.use('/api/admin',admin)
app.use('/api/v1',cns)

app.listen(PORT, () => console.log(`server port ${PORT}`));
