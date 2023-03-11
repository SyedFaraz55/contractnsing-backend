const express = require("express");
const { User } = require("../Schema/CNS/UserSchema");
const router = express.Router();
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(
    "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"
);


router.get("/", async (req, res) => {
    return res.send("ok")
})

router.post("/create-user", async (req, res) => {
    const usr = await User.findOne({ email: req.body.email });
    if (usr) {
        return res.json({ ok: false, message: "user already exits." })
    }
    try {
        const user = new User(req.body);
        user.save();

        const msg = {
            to: req.body.email, // Change to your recipient
            from: "syedmohi04@gmail.com", // Change to your verified sender
            subject: "ContractnSign Email Verification",
            text: "Please verify your email address",
            templateId: "d-42ad1dfe6e9c4e0f84633588614fb44c",
            dynamicTemplateData: {
                url: `http://localhost:3000/email-verify/${user._id}`,
            },
        };
        sgMail
            .send(msg)
            .then(() => {
                console.log("Email sent");
                return res.status(200).json({
                    ok: true,
                    message:
                        "Please check your email to activate your account.",
                });
            })
            .catch((error) => {
                console.error(error);
                return res.status(200).json({ ok: false });
            });
    } catch (err) {
        return res.status(200).json({ ok: false, message: "failed to create user" })
    }
})

router.post("/verify-email", async (req, res) => {
    console.log(req.body.id,'id')
    const usr = await User.updateOne({ _id: req.body.id }, {
        $set: {
            emailVerified: true
        }
    });
    if (usr.modifiedCount > 0) {
        return res.json({ ok: true, message: "Email Verified. Please continue to login" });
    } else {
        return res.json({ ok: false, message: "email cannot be verified" });
    }
})


router.post("/login", async (req, res) => {
    const user = await User.findOne({email:req.body.email});
    if(!user.emailVerified) {
        return res.json({ok:false,message:"Please verify Email address."})
    }

    if(user.password != req.body.password) {

        return res.json({ok:false,message:"Password is incorrect."})
    }

    return res.json({ok:true,user})
})


module.exports = router