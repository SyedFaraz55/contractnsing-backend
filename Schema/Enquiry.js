const Joi = require("joi");
const jwt = require("jsonwebtoken");
const config = require("config");
const mongoose = require("mongoose");

const EnquirySchema = new mongoose.Schema({
  name: {
    type: String,
  },
  email: {
    type: String,
  },
  contact:{
    type:String
  },
  message:{
    type:String
  }
});


const Enquiry = mongoose.model("natmarts.enquiry", EnquirySchema);
exports.Enquiry = Enquiry;
