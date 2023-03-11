const mongoose = require("mongoose");

const DeliverAppSchema = new mongoose.Schema({
  user: { type: String, required: true, unique:true},
  password: { type: String, required: true },
  
});

const Deliveryapp = new mongoose.model("deliveryapp", DeliverAppSchema);

exports.Deliveryapp = Deliveryapp;
