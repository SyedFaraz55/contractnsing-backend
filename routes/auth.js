const express = require("express");
const router = express.Router();
const _ = require("lodash");
const bcrypt = require("bcryptjs");
const Joi = require("joi");
const config = require("config");
const jwt = require("jsonwebtoken");
const { User, validate:CheckValidate } = require("../Schema/UserSchema");
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { _id: user._id, email: user.email },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "15m" } // Access Token expires in 15 minutes
  );

  const refreshToken = jwt.sign(
    { _id: user._id, email: user.email },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" } // Refresh Token expires in 7 days
  );

  return { accessToken, refreshToken };
};
router.post("/checkUser", async (req, res) => {
  console.log(req.body)
  const { error } = CheckValidate(req.body)

  if (error) return res.status(400).json({ ok: false, message: error.details[0].message });
  console.log(error)

  let user = await User.findOne({ email: req.body.email });
  if (user) return res.status(400).json({ ok: false, message: "User already exits" });


  return res.status(200).json({ok:true})

});
router.get("/", async (req, res) => {
  const results = await User.find();
  res.send(results);
});

// router.post("/login", async (req, res) => {
//   const { error } = validate(req.body);

//   if (error)
//     return res.json({ status: 400, message: error.details[0].message });

//   let user = await User.findOne({ email: req.body.email });

//   if (!user)
//     return res.json({ status: 400, message: "Invalid user or password" });

//   const validPassword = await bcrypt.compare(req.body.password, user.password);
//   if (!validPassword)
//     return res.json({ status: 400, message: "Invalid user or password" });

//   const token = user.generateAuthToken();

//   return res.send(token);
// });

// Login route
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res
      .status(400)
      .json({ ok: false, message: "Invalid email or password" });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res
      .status(400)
      .json({ ok: false, message: "Invalid email or password" });
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user);

  // Set refreshToken as httpOnly cookie
  res
    .cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })
    .json({ ok: true, accessToken });
});

// Refresh Token route
router.post("/refresh-token", async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken)
    return res.status(401).json({ message: "Unauthorized. Token missing." });

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decoded._id);
    if (!user) return res.status(401).json({ message: "User not found" });

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    res
      .cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      })
      .json({ accessToken });
  } catch (err) {
    return res.status(403).json({ message: "Invalid refresh token" });
  }
});

router.post("/loginWithGoogle", async (req, res) => {
  console.log(req.body);

  let user = await User.findOne({ email: req.body.email });

  if (!user)
    return res.send("")

  const token = user.generateAuthToken();
  return res.send(token);
});

const validate = (req) => {
  const schema = Joi.object({
    email: Joi.string().min(5).max(255).required(),
    password: Joi.string().min(5).max(255).required(),
  });

  return schema.validate(req);
};

module.exports = router;
