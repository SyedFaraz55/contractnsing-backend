const Joi = require("joi");
const jwt = require("jsonwebtoken");
const config = require("config");
const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  id: { type: String ,required:true,unique:false },
  name:{type:String,required:true},
  rating:{type:String,required:true},
  review:{type:String,required:true},
});

ProductSchema.methods.generateAuthToken = function () {
  const token = jwt.sign({ _id: this._id }, config.get("jwtPrivateKey"));
  return token;
};


const ProductReview = mongoose.model("reviews", ProductSchema);
exports.ProductReview = ProductReview;

