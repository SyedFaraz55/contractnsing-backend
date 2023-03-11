const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  role:{
    type:String,
    default:0 //root
  },
  emailVerified: {
    type:Boolean,
    default:false
  }
});



const User = mongoose.model("cns.admin", userSchema);
exports.User = User;
