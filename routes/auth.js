const express = require("express");
const router = express.Router();
const _ = require("lodash");
const bcrypt = require("bcryptjs");
const Joi = require("joi");
const config = require("config");
const jwt = require("jsonwebtoken");
const { User, validate:CheckValidate } = require("../Schema/UserSchema");

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
  const { error } = validate(req.body);

  if (error)
    return res.status(400).json({ message: error.details[0].message });

  let user = await User.findOne({ email: req.body.email });
  if (!user)
    return res.status(400).json({ message: "Invalid email or password" });

  const validPassword = await bcrypt.compare(req.body.password, user.password);
  if (!validPassword)
    return res.status(400).json({ message: "Invalid email or password" });

  const { accessToken, refreshToken } = generateTokens(user);

  res
    .cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })
    .json({ accessToken });
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
