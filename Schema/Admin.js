const Joi = require("joi");
const jwt = require("jsonwebtoken");
const config = require("config");
const mongoose = require("mongoose");

const AdminSchema = new mongoose.Schema({
  user: {
    type: String,
    required: true,
    minlength: 4,
    maxlength: 50,
  },
  password: {
    type: String,
    minlength: 8,
    maxlength: 1024,
    required: true,
  },
  role:{
    type:String
  }
});

AdminSchema.methods.generateAuthToken = function () {
  const token = jwt.sign({ _id: this._id }, config.get("jwtPrivateKey"));
  return token;
};


const Admin = mongoose.model("natmarts.admin", AdminSchema);
exports.Admin = Admin;
