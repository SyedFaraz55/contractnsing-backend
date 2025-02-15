require("dotenv").config();
const bodyParser = require("body-parser");
const config = require("config");
const express = require("express");
const { default: mongoose } = require("mongoose");
const morgan = require("morgan");
const cors  = require('cors')


const allowedOrigins = [
  "http://localhost:3000",  // Local development
  "https://www.phonebay.ae" // Production domain
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: "GET,POST,PUT,DELETE",
  allowedHeaders: "Content-Type,Authorization"
}));

const app = express();

if (!config.get("jwtPrivateKey")) {
  console.error("FATAL ERROR: jwtPrivateKey is not defined");
  process.exit(1);
}

app.use("/uploads",express.static("uploads"))
app.use(morgan("tiny"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

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
