const Joi = require("joi");
const jwt = require("jsonwebtoken");
const config = require("config");
const mongoose = require("mongoose");

const CostSchema = new mongoose.Schema({
  name:{
    type:String
  },
  pricing:{
    type:String
  }
});


const Cost = mongoose.model("shippingCost", CostSchema);
exports.Cost = Cost;
