const Joi = require("joi");
const jwt = require("jsonwebtoken");
const config = require("config");
const mongoose = require("mongoose");

const ExtraSchema = new mongoose.Schema({
  shippingCost:{type:String},
  tax:{type:String},
  charges:[{}]
});


const Extra = mongoose.model("extra", ExtraSchema);
exports.Extra = Extra;
