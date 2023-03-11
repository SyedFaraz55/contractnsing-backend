const express = require("express");
const auth = require("../middleware/auth");
const multer = require("multer");
const { Admin } = require("../Schema/Admin");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { Product } = require("../Schema/ProductSchema");
const upload = multer({ dest: "uploads/" });
const { uploadFile } = require("../s3");
const _ = require("lodash");
const { Category } = require("../Schema/Categories");
const { Orders } = require("../Schema/OrderSchema");
const { Extra } = require("../Schema/Extra");
const { Enquiry } = require("../Schema/Enquiry");
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(
  "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"
);
router.post("/add-user", async (req, res) => {
  let admin = await Admin.findOne({ user: req.body.user });
  if (admin)
    return res.status(400).json({ ok: false, message: "User already exits" });

  admin = new Admin(req.body);
  const salt = await bcrypt.genSalt(10);
  admin.password = await bcrypt.hash(admin.password, salt);
  await admin.save();

  const token = admin.generateAuthToken();
  const result = _.pick(admin, ["_id", "user"]);
  return res.header("x-auth-token", token).send({ ...result, ok: true });
});
router.get("/orders", async (req, res) => {
  const orders = await Orders.find({}).where({ orderStatus: { $in: [1, 2] } });
  res.json(orders);
});
router.get("/get-info", async (req, res) => {
  const products = await Product.find().count();
  const orders = await Orders.find({}).where({ orderStatus: { $in: [1, 2] } });
  return res.json({ count: products, total: orders });
});
router.post("/login", async (req, res) => {
  let admin = await Admin.findOne({ user: req.body.user });

  if (!admin)
    return res
      .status(200)
      .json({ ok: false, message: "Invalid user or password" });

  const validPassword = await bcrypt.compare(req.body.password, admin.password);
  if (!validPassword)
    return res
      .status(200)
      .json({ ok: false, message: "Invalid user or password" });

  const token = admin.generateAuthToken();

  return res.json({ ok: true, token, user: admin });
});

router.post("/update-extra", async (req, res) => {
  const result = await Extra.updateOne({id:req.body.id},{
    $set:req.body
  })
  if(result.modifiedCount > 0) {
    return res.status(200).json({ok:true,message:"Settings updated"})
  } else {
    return res.status(200).json({ok:false,message:"Failed to update settings"})
  }
});

router.get("/extra", async (req, res) => {
  const result = await Extra.find({});
  return res.status(200).json({ ok: true, result });
});


router.post("/enquiry", async (req, res) => {
  


  const enquiry = new Enquiry(req.body);
  await enquiry.save();

  const msg = {
    to: "mohi@flivv.com", // Change to your recipient
    from: "syedmohi04@gmail.com", // Change to your verified sender
    subject: "Enquiry From Natmarts.com",
    text: `
    Name: ${req.body.name}
    Contact: ${req.body.contact}
    Email: ${req.body.email}
    Message: ${req.body.message}
    `,
  };
  sgMail
    .send(msg)
    .then(() => {
      console.log("Email sent");
      return res.json({
        ok: true,
        message: "Thanks for contacting us. Our team will contact you shortly.",
      });
    })
    .catch((error) => {
      console.error(error);
      return res.status(200).json({ ok: false });
    });

  
});

router.get("/enquries", async (req, res) => {
  const data = await Enquiry.find({});
  return res.json({
    ok: true,
    data,
  });
});

router.post("/add-product", async (req, res) => {
  console.log(req.body);

  const products = new Product(req.body);
  await products.save();

  return res.json({ ok: true, message: "Product Created Successfull" });
});

router.post("/remove-product", async (req, res) => {
  const result = await Product.deleteOne({ _id: req.body.id });

  return res.json({ ok: true, message: "Product Deleted Successfull" });
});
router.post("/remove-enq", async (req, res) => {
   await Enquiry.deleteOne({ _id: req.body.id });

  return res.json({ ok: true, message: "Product Deleted Successfull" });
});
router.post("/remove-category", async (req, res) => {
  const result = await Category.deleteOne({ _id: req.body.id });

  return res.json({ ok: true, message: "Product Deleted Successfull" });
});
router.post("/add-category", async (req, res) => {
  console.log(req.body)
  const category = new Category(req.body);
  await category.save();

  return res.json({ message: "Category Created Successfull", ok: true });
});

router.get("/get-category", async (req, res) => {
  const category = await Category.find({});
  return res.json({ data: category, ok: true });
});

router.post(
  "/upload-action-files",
  upload.array("file", 5),
  async (req, res) => {
    console.log(req.files);

    let rest = [];
    for (let i = 0; i < req.files?.length; i++) {
      try {
        const s = await uploadFile(req.files[i]);
        rest.push(s.Location);
      } catch (err) {
        return res.json({ ok: false });
      }
    }

    return res.json({ ok: true, data: rest });
  }
);

module.exports = router;
