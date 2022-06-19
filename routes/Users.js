require("dotenv").config();
const express = require("express");
const auth = require("../middleware/auth");
const router = express.Router();
const _ = require("lodash");
const bcrypt = require("bcrypt");
const { User, validate } = require("../Schema/UserSchema");
const { Orders, validateOrders } = require("../Schema/OrderSchema");
const jwt = require("jsonwebtoken");
const config = require("config");
const s3 = require("../s3");
const { Product } = require("../Schema/ProductSchema");
const { ProductReview } = require("../Schema/ProductReview");
const Razorpay = require("razorpay");
const shortid = require("shortid");

//Required package
var pdf = require("pdf-creator-node");
var fs = require("fs");
var path = require("path");
// Read HTML Template
var html = fs.readFileSync(path.resolve(__dirname, "../template.html"), "utf8");

var razor = new Razorpay({
  key_id: "rzp_test_qxsRuZfigMmu3O",
  key_secret: "GyT6kJjJfDSt4b318RN56JTP",
});

router.get("/", auth, async (req, res) => {
  const results = await User.find();
  res.send(results);
});

router.get("/profile", auth, async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  res.send(user);
});

router.post("/createUser", async (req, res) => {
  const { error } = validate(req.body);

  if (error)
    return res.json({ status: 400, message: error.details[0].message });

  let user = await User.findOne({ email: req.body.email });
  if (user) return res.json({ status: 400, message: "User already exits" });

  user = new User(req.body);
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
  await user.save();

  const token = user.generateAuthToken();
  const result = _.pick(user, ["_id", "email", "username"]);
  return res.header("x-auth-token", token).send(result);
});

router.post("/createOrder", auth, async (req, res) => {
  // const {error} = validateOrders({...req.body.info,order:req.body.order})
  const user = await User.findById(req.user._id).select("-password");
  // if (error) return res.json({status:400,message:error.details[0].message});


  order = new Orders({ ...req.body, userid: user._id });

  await order.save();

  return res.json({ ...req.body, userid: user._id });
});

router.get("/s3url", async (req, res) => {
  const url = await s3.generateUploadURL();
  res.send({ url });
});

router.get("/products", async (req, res) => {
  const products = await Product.find({});
  res.json(products);
});

router.get("/orders", auth, async (req, res) => {
  const orders = await Orders.find({ userid: req.user._id });
  res.json(orders);
});

router.get("/product/:id", async (req, res) => {
  console.log(req.params);
  const product = await Product.findById(req.params.id);
  res.json(product);
});

router.post("/razorpay", async (req, res) => {
  const { amount, name, mobile } = req.body;
  const options = {
    amount: amount * 100,
    currency: "INR",
    receipt: shortid.generate(),
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
    console.log(error);
  }
});

router.post("/pdf",async (req, res) => {
  const orders = await Orders.find({ order: { $elemMatch: { id: req.body.id } } })
  var options = {
    format: "A3",
    orientation: "portrait",
    border: "10mm",
    header: {
      height: "45mm",
      contents: '<div style="text-align: center;">Author: Shyam Hajare</div>',
    },
    footer: {
      height: "28mm",
      contents: {
        first: "Cover page",
        2: "Second page", // Any page number is working. 1-based index
        default:
          '<span style="color: #444;">{{page}}</span>/<span>{{pages}}</span>', // fallback value
        last: "Last Page",
      },
    },
  };
  
 

    pdf
      .create({
        html: html,
        data: {
          data: orders,
        },
        path: "./output.pdf",
        type: "",
      }, options)
      .then((resp) => {
        res.json(resp);
      })
      .catch((error) => {
        res.json(error);
      });
  
});
router.post('/post-review',auth,async (req,res)=> {
  const user = await User.findById(req.user._id).select("-password");
  const result = {id: user._id,name:user.username,...req.body}

  const review = await ProductReview(result)
  await review.save()

  res.json(result)
})

router.get("/get-reviews/:id",async(req,res)=> {
  
  const results = await ProductReview.find({ id:req.params.id});
  res.json(results)
})

router.post('/update-address',auth,async(req,res)=> {
  
  const user = await User.findOneAndUpdate({_id:req.user._id},{$set:{defaultAddress:req.body}})
  await user.save();

  res.json({ok:true})
});

router.post('/update-billing',auth,async(req,res)=> {
  console.log(req.body)
  const user = await User.findOneAndUpdate({_id:req.user._id},{$set:{defaultAddress:{formValues:req.body}}})
  await user.save();

  res.json({ok:true})
});




router.post("/update-profile",auth, async (req,res)=> {
  console.log(req.body)

  const user = await User.findOneAndUpdate({_id:req.user._id},{$set:{username:req.body.username, mobile:req.body.mobile}})
  await user.save();

  res.json({ok:true})
})





router.post("/change-password",auth, async(req,res)=> {
  const user = await User.findById(req.user._id);

  const validPassword = await bcrypt.compare(req.body.password, user.password);
  if (!validPassword) return res.json({status:400,message:"Incorrect passsword", ok:false});

  const salt = await bcrypt.genSalt(10);
  let np = await bcrypt.hash(req.body.newPassword, salt);
  
  User.updateOne({email:user.email},{$set:{password:np}}).then(() => res.json({ok:true, message:"Password Changed Successfully"}) )
  .catch(() => res.json({ok:false,message:"Error while changing password"}))
  
})

module.exports = router;
