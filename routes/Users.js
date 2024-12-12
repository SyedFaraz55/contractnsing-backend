require("dotenv").config();
const express = require("express");
const auth = require("../middleware/auth");
const router = express.Router();
const _ = require("lodash");
const sgMail = require("@sendgrid/mail");
const pdfInvoice = require("pdf-invoice");
const niceInvoice = require("nice-invoice");
const bcrypt = require("bcryptjs");
const { User, validate } = require("../Schema/UserSchema");
const axios = require("axios")
sgMail.setApiKey(
  "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"
);
const orderid = require('order-id')('key');

const { Orders, validateOrders } = require("../Schema/OrderSchema");
const jwt = require("jsonwebtoken");
const config = require("config");
const s3 = require("../s3");
const { Product } = require("../Schema/ProductSchema");
const { ProductReview } = require("../Schema/ProductReview");
const Razorpay = require("razorpay");
const shortid = require("shortid");
const nodemailer = require("nodemailer");
//Required package
var pdf = require("pdf-creator-node");
var fs = require("fs");
var path = require("path");
const { Deliveryapp } = require("../Schema/DeliveryAppSchema");
const { Category } = require("../Schema/Categories");
const { Cost } = require("../Schema/Cost");
const { result } = require("lodash");
// Read HTML Template
var html = fs.readFileSync(path.resolve(__dirname, "../template.html"), "utf8");

var razor = new Razorpay({
  key_id: "rzp_test_qxsRuZfigMmu3O",
  key_secret: "GyT6kJjJfDSt4b318RN56JTP",
});
// Helper function to generate tokens
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

router.get("/", auth, async (req, res) => {
  const results = await User.find();
  res.send(results);
});

router.get("/profile", auth, async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  res.send(user);
});

// router.post("/createUser", async (req, res) => {
//   const { error } = validate(req.body);

//   if (error)
//     return res
//       .status(400)
//       .json({ ok: false, message: error.details[0].message });
//   console.log(error);

//   let user = await User.findOne({ email: req.body.email });
//   if (user)
//     return res.status(400).json({ ok: false, message: "User already exits" });

//   user = new User(req.body);
//   const salt = await bcrypt.genSalt(10);
//   user.password = await bcrypt.hash(user.password, salt);
//   await user.save();

//   const token = user.generateAuthToken();
//   const result = _.pick(user, ["_id", "email", "username"]);
//   return res.header("x-auth-token", token).send(result);
// });

// User creation route
router.post("/register", async (req, res) => {
  const { error } = validate(req.body);

  if (error) {
    return res
      .status(400)
      .json({ ok: false, message: error.details[0].message });
  }

  let user = await User.findOne({ email: req.body.email });
  if (user) {
    return res
      .status(400)
      .json({ ok: false, message: "User already exists" });
  }

  user = new User(req.body);
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
  await user.save();

  return res.status(201).json({ ok: true, message: "User successfully created" });
});


router.post("/create-guest-order", async (req, res) => {
  // const {error} = validateOrders({...req.body.info,order:req.body.order})

  // if (error) return res.json({status:400,message:error.details[0].message});

  order = new Orders({ ...req.body});

  await order.save();

  return res.json({ ...req.body});
  // console.log({ ...req.body, userid: user._id })
});

router.post("/createOrder", auth, async (req, res) => {
  console.log('creating order ...')
  console.log(req.user)
  // const {error} = validateOrders({...req.body.info,order:req.body.order})
  const user = await User.findById(req.user._id).select("-password");
  // if (error) return res.json({status:400,message:error.details[0].message});

  console.log(req.body)

  order = new Orders({ ...req.body, userid: user._id || "" ,id: _.uniqueId(`#${Math.floor(Math.random() * _.uniqueId())}`)});

  await order.save();

  return res.json({ ...req.body, userid: user._id });
  // console.log({ ...req.body, userid: user._id })
});

router.post("/update", async (req, res) => {
  const query = { _id: req.body._id };
  console.log(query);

  const r = await Product.findOne({ _id: req.body._id });
  const updateDocument = {
    $set: req.body,
  };
  const result = await Product.updateOne(query, updateDocument);
  if (result.modifiedCount > 0) {
    return res.status(200).json({ ok: true, message: "Updated", result });
  } else {
    return res.status(200).json({ ok: false, message: "failed", result });
  }
  // console.log({ ...req.body, userid: user._id })
});

router.post("/update-status", async(req,res) => {
  try {
    await Product.updateOne({_id:req.body.id},{
      $set:{
        status:req.body.status
      }
    })
    return res.json({ok:true})
  }catch(error) {
    console.log(error)
    return res.json(error);
  }
})

router.post("/update-category", async (req, res) => {
  const query = { _id: req.body._id };
  console.log(query);

  const r = await Category.findOne({ _id: req.body._id });
  const updateDocument = {
    $set: { name: req.body.name },
  };
  const result = await Category.updateOne(query, updateDocument);
  if (result.modifiedCount > 0) {
    return res.status(200).json({ ok: true, message: "Updated", result });
  } else {
    return res.status(200).json({ ok: false, message: "failed", result });
  }
  // console.log({ ...req.body, userid: user._id })
});

router.post("/request-cancellation", async (req, res) => {
  console.log(req.body.id);
  const result = await Orders.findOneAndUpdate(
    { _id: req.body.id },
    { $set: { orderStatus: 4 } }
  );

  return res
    .status(200)
    .json({ ok: true, message: "Request is in process.", result: result });
});

router.get("/s3url", async (req, res) => {
  const url = await s3.generateUploadURL();
  res.send({ url });
});
router.get("/health", async (req, res) => {
  return res.status(200).send("OK");
});
router.get("/products", async (req, res) => {
  const products = await Product.find({status:true}).limit(18)
  res.status(200).json(products);
});

router.get("/all-products", async (req, res) => {
  const products = await Product.find({})
  res.status(200).json(products);
});
router.get("/search", async (req, res) => {
  console.log(req.query, "search >> ");
  if (req.query.q) {
    const products = await Product.find({ $text: { $search: req.query.q } });
    return res.status(200).json({ results: products });
  }
});

router.get("/filter", async (req, res) => {
  console.log(req.query, "search >> ");
  if (req.query.q || req.query.price) {
    const categories = await Product.find({
      category: req.query.q,
      price: { $gte: req.query.price },
    });
    return res.status(200).json({ ok: true, results: categories });
  }
});

router.get("/orders", auth, async (req, res) => {
  const orders = await Orders.find({ userid: req.user._id }).sort({
    date: -1,
  });
  res.json(orders);
});

router.get("/all-orders", async (req, res) => {
  const results = await Orders.find({}).where({ orderStatus: { $in: [1, 2] } });
  if (results.length > 0) {
    return res.status(200).json({ ok: true, data: results });
  }

  return res.status(200).json({ ok: true, data: [], message: "No Results" });
});

router.get("/cancelled", async (req, res) => {
  const results = await Orders.find({}).where({ orderStatus: 4 });
  if (results.length > 0) {
    return res.status(200).json({ ok: true, data: results });
  }

  return res.status(200).json({ ok: true, data: [], message: "No Results" });
});

// router.get("/delete-address", auth, async (req, res) => {
//   const users = await User.find({ userid: req.user._id });
//   console.log(users);
//   res.json(users);
// });

router.post("/add-address", auth, async (req, res) => {
  const query = { _id: req.user._id };
  console.log(query);
  const updateDocument = {
    $set: { address: req.body },
  };
  const result = await User.updateOne(query, updateDocument);
  console.log(result);
  if (result.acknowledged) {
    return res
      .status(200)
      .json({ ok: true, message: "Address Added Successfully" });
  } else {
    return res
      .status(400)
      .json({ ok: false, message: "Failed to add address" });
  }
});

router.get("/product/:id", async (req, res) => {
  const product = await Product.findById(req.params.id);
  res.json(product);
});

router.post("/razorpay", async (req, res) => {
  const { amount, name, mobile } = req.body;
  const id = orderid.generate();
  console.log(id);
  const options = {
    amount: amount * 100,
    currency: "INR",
    receipt: id,
  };
  try {
    const response = await razor.orders.create(options);

    res.send({
      name,
      mobile,
      totalAmount: amount,

      amount: response.amount,
      currency: response.currency,
      receipt: response.receipt,
    });
  } catch (error) {
    return res.json({ok:false})
  }
});

router.get("/test", async (req, res) => {});

router.get("/pdf/:id", async (req, res) => {
  const order = await Orders.findOne({ _id: req.params.id });

  const invoiceDetail = {
    shipping: {
      name: order.info.firstname + " " + order.info.lastname,
      address: order.info.address,
      city: order.info.city,
      country: order.info.country,
      state: "Hyderabad",
      postal_code: order.info.code,
    },
    items: order?.order?.map((pr) => {
      return {
        item: pr.name,
        quantity: pr.quantity,
        price: pr.itemTotal,
        tax: "",
      };
    }),

    total: parseInt(order.cartTotal),
    order_number: req.params.id,
    header: {
      company_name: "Natmarts",
      company_address:
        "Pahadi Shareef, Airport Road, Hyderabad - 05, TS, India",
    },
    footer: {
      text: "Natmarts.com",
    },
    currency_symbol: "INR ",
    date: {
      billing_date: JSON.stringify(new Date(order.date)).slice(1, 11),
      due_date: "NULL",
    },
  };
const filenumber = orderid.generate();
  niceInvoice(
    invoiceDetail,
    path.join(__dirname, `../uploads/${filenumber}.pdf`)
  );
  //  res.download(path.join(__dirname,'../uploads/invoice.pdf'))
  try {
    const s33 = await s3.uploadFile({
      path: path.join(__dirname, `../uploads/${filenumber}.pdf`),
      filename: `${filenumber}`,
    });
    console.log(s33);
    return res.status(200).json({ ok: true, url: s33.Location });
  } catch (er) {
    return res.status(200).json({ ok: false, url: null });
  }
});

router.get("/get-reviews/:id", async (req, res) => {
  const results = await ProductReview.find({ id: req.params.id });
  res.json(results);
});

router.post("/update-address", auth, async (req, res) => {
  console.log(req.body);
  const user = await User.findOneAndUpdate(
    { _id: req.user._id },
    { $set: { defaultAddress: { formValues: req.body } } }
  );
  await user.save();

  res.json({ ok: true });
});

router.get("/delete-address", auth, async (req, res) => {
  const user = await User.findOneAndUpdate(
    { _id: req.user._id },
    { $set: { defaultAddress: {} } }
  );
  await user.save();

  res.json({ ok: true });
});

router.post("/shippingCost", async (req, res) => {
  const result = await Cost.findOne({ name: req.body.name });
  console.log(result, req.body);
  if (result) {
    return res.status(200).json({ ok: false, message: "State Already Exists" });
  }

  try {
    const re = new Cost(req.body);
    await re.save();
    return res.status(200).json({ ok: true, message: "Pricing Added" });
  } catch (err) {
    return res
      .status(200)
      .json({ ok: false, message: "failed to add product" });
  }
});

router.get("/get-shippingCost", async (req, res) => {
  const results = await Cost.find();
  return res.status(200).json({ ok: true, data: results });
});

router.delete("/delete-pricing/:id", async (req, res) => {
  const results = await Cost.deleteOne({ _id: req.params.id });
  return res.status(200).json({ ok: true, data: results });
});

router.post("/update-billing", auth, async (req, res) => {
  const userD = await User.findOne({ _id: req.user._id });
  const resss = { ...userD.defaultAddress.formValues, ...req.body };

  try {
    await User.updateOne(
      { _id: req.user._id },
      { $set: { defaultAddress: { formValues: resss } } }
    );
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(200).json({ ok: false });
  }
});

router.post("/update-profile", auth, async (req, res) => {
  console.log(req.body);

  const user = await User.findOneAndUpdate(
    { _id: req.user._id },
    { $set: { username: req.body.username, mobile: req.body.mobile } }
  );
  await user.save();

  res.json({ ok: true });
});

router.post("/change-password", async (req, res) => {
  console.log(req.body);
  const user = await User.findById({ _id: req.body.id });

  const salt = await bcrypt.genSalt(10);
  let np = await bcrypt.hash(req.body.password, salt);

  User.updateOne({ email: user.email }, { $set: { password: np } })
    .then(() =>
      res.json({ ok: true, message: "Password Changed Successfully" })
    )
    .catch(() =>
      res.json({ ok: false, message: "Error while changing password" })
    );

  return res.status(200);
});

router.post("/reset", async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user)
    return res.status(400).send({ ok: false, message: "User not found " });

  const msg = {
    to: "sdfahad729@gmail.com", // Change to your recipient
    from: "syedmohi04@gmail.com", // Change to your verified sender
    subject: "Sending with SendGrid is Fun",
    text: "and easy to do anywhere, even with Node.js",
    templateId: "d-42ad1dfe6e9c4e0f84633588614fb44c",
    dynamicTemplateData: {
      url: `http://localhost:3000/reset/${user._id}`,
    },
  };
  sgMail
    .send(msg)
    .then(() => {
      console.log("Email sent");
      return res.status(200).json({
        ok: true,
        message:
          "Thanks! If there's an account associated with this email, we'll send the password reset instructions immediately.",
      });
    })
    .catch((error) => {
      console.error(error);
      return res.status(200).json({ ok: false });
    });
});

router.post("/order", async (req, res) => {

  const msg = {
    to: "sdfahad729@gmail.com", // Change to your recipient
    from: "syedmohi04@gmail.com", // Change to your verified sender
    subject: "Sending with SendGrid is Fun",
    text: `Please download your order from here ${req.body.link}`
   
  };
  sgMail
    .send(msg)
    .then(() => {
      console.log("Email sent");
      return res.status(200).json({
        ok: true,
        message:
          "Email Sent.",
      });
    })
    .catch((error) => {
      console.error(error);
      return res.status(200).json({ ok: false });
    });
});

router.post("/app-register", async (req, res) => {
  const hashPassword = await bcrypt.hash(req.body.password, 10);
  try {
    const newUser = new Deliveryapp({ ...req.body, password: hashPassword });
    await newUser.save();
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.log(err.message);
    return res.status(200).json({ ok: false });
  }
});

router.post("/app-login", async (req, res) => {
  const user = await Deliveryapp.findOne({ user: req.body.user });
  if (!user) return res.status(404).send("Invalid user or password");

  const hashPassword = await bcrypt.compare(req.body.password, user.password);

  if (hashPassword) {
    return res.status(200).json({ ok: true });
  }
});

router.post("/app-cancellation", async (req, res) => {
  try {
    const result = await Orders.findOneAndUpdate(
      { _id: req.body.id },
      { $set: { orderStatus: req.body.status } }
    );

    return res
      .status(200)
      .json({ ok: true, message: "Status Changed.", result: result });
  } catch (err) {
    return res.status(400).json({
      ok: true,
      message: "Server Error, Please try again",
      result: result,
    });
  }
});

router.get("/search-order/:id", async (req, res) => {
  try {
    const order = await Orders.findOne({ _id: req.params.id });
    return res.status(200).send(order);
  } catch (err) {
    return res.status(404).send("Invalid Order ID");
  }
});

router.post("/telr",async(req,res)=> {
  const options = {
    method: 'POST',
    url: 'https://secure.telr.com/gateway/order.json',
    headers: {accept: 'application/json', 'Content-Type': 'application/json'},
    data: {
      method: 'create',
      ref: "OrderRef",
      store: process.env.STORE_ID,
      authkey: process.env.AUTH_KEY,
      framed: 0,
      order: {
        cartid: req.body.order[0]._id,
        test: '1',
        amount: `${req.body.cartTotal}`,
        currency: 'AED',
        description:req.body.order[0].name, 
      },
      return: {
        authorised: `http://localhost:3000/verify`,
        declined: 'https://www.phonebay.ae/checkout',
        cancelled: 'https://www.phonebay.ae/checkout'
      }
    }
  };


  axios
  .request(options)
  .then(function (response) {
    return res.json({status:response.data, order:req.body})
  })
  .catch(function (error) {
   console.log(error,'error')
  });
})

router.post("/telr-status",async(req,res)=> {

  const options = {
    method: 'POST',
    url: 'https://secure.telr.com/gateway/order.json',
    headers: {accept: 'application/json', 'Content-Type': 'application/json'},
    data: {
      method: 'check',
      store: process.env.STORE_ID,
      authkey: process.env.AUTH_KEY,
      order: {ref: req.body.ref}
    }
  };
  
  axios
    .request(options)
    .then(function (response) {
      return res.json(response.data)
    })
    .catch(function (error) {
      // console.error(error);
    });
})

router.get("/track/:id", async(req,res) => {
  const order = await Orders.find({id: req.params.id})
  return res.json(order)
})


router.post("/product-search", async(req,res)=> {
  let filter = {}

  const priceMap = {
    "0":{},
    "1000":{price:{$lte:1000}},
    "2000":{price:{$lte:2000, $gte:1000}},
    "3000":{price:{$lte:3000, $gte:2000}},
    "4000":{price:{$lte:4000, $gte:3000}},
  }
  if(req.body.query['price']>0) {
    filter['price'] = req.body.query['price']
  }
  if(req.body.query.condition) {
    filter['type'] = {$in:req.body.query?.condition?.split(",")}
  }

  if(req.body.query.color) {
    filter['color'] = {$in:req.body.query?.color?.split(",")}
  }

  if(req.body.query.storage) {
    const products = await Product.find({
      $or: req.body.query?.storage?.split(',').map((storageName) => ({
        storages: { $elemMatch: { name: { $regex: storageName, $options: 'i' }  } }
      }))
    });
    return res.json(products) 
  }

  if(req.body.query.brand) {

    if(!req.body.query?.brand?.includes(",")) {
      console.log(req.body.query?.brand)

      const products = await Product.find({ name: { $regex: req.body.query?.brand, $options: 'i' }  }) 
      console.log('result')
      return res.json(products) 
    } else {
    //   const products = await Product.find({
    //   $or: req.body.query?.brand?.split(',').map((brandName) => ({
    //     name: { $regex: brandName, $options: 'i' }  
    //   }))
    // }); 
    // return res.json(products) 
    }

  
  }

  const query = filter.price ? priceMap[filter.price] : filter;
  const products = await Product.find(query);
  return res.json(products)
})

router.post("")

module.exports = router;
