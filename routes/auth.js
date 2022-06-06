const express = require("express");
const router = express.Router();
const _ = require("lodash");
const bcrypt = require("bcrypt");
const Joi = require("joi");
const config = require("config");
const jwt = require("jsonwebtoken");
const { User } = require("../Schema/UserSchema");

router.get("/", async (req, res) => {
  const results = await User.find();
  res.send(results);
});

router.post("/login", async (req, res) => {
  const { error } = validate(req.body);

  if (error) return res.json({status:400,message:error.details[0].message});

  let user = await User.findOne({ email: req.body.email });
  if (!user) return res.json({status:400,message:"Invalid user or password"});

  const validPassword = await bcrypt.compare(req.body.password, user.password);
  if (!validPassword) return res.json({status:400,message:"Invalid user or password"});

  const token = user.generateAuthToken();

  return res.send(token);
});

router.post("/loginWithGoogle", async (req, res) => {
  console.log(req.body)

  let user = await User.findOne({ email: req.body.email });
  console.log(user)
  if (!user) return res.json({status:400,message:"Invalid user or password",ok:false});
  
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
