const Joi = require("joi");
const jwt = require("jsonwebtoken");
const config = require("config");
const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  userid: { type: String, required: true, unique: false },
  info: {
    firstname: { type: String, required: true },
    lastname: { type: String, required: false },
    email: { type: String, required: true },
    mobile: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    code: { type: String, required: true },
    additional: { type: String, required: false },
    default: { type: Boolean, required: false },
    method: { type: String, required: true },
  },
  order: [],
  orderStatus:Number,
  cartTotal: { type: String, required: true },
});

OrderSchema.methods.generateAuthToken = function () {
  const token = jwt.sign({ _id: this._id }, config.get("jwtPrivateKey"));
  return token;
};

const validateOrder = (user) => {
  const schema = Joi.object({
    firstname: Joi.string().min(5).max(50).required(),
    lastname: Joi.string().min(5).max(255),
    town: Joi.string().max(255),
    code: Joi.string().min(4).max(255),
    additional: Joi.string().min(4).max(255),
    default: Joi.boolean(),
    email: Joi.string().min(5).max(255).required().email(),
    address: Joi.string().min(5).max(255).required(),
    mobile: Joi.string().min(5).max(10).required(),
    country: Joi.string().min(5).max(10).required(),
    city: Joi.string().min(5).max(10).required(),
    method: Joi.string().required(),
    order: Joi.array().required(),
  });

  return schema.validate(user);
};

const Orders = mongoose.model("orders", OrderSchema);
exports.Orders = Orders;
exports.validateOrders = validateOrder;
