require('dotenv').config()
const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
  // Get the token from the Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1]; // Extract token from "Bearer <token>"
  console.log(token)
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET); // Replace JWT_SECRET with your secret key
    req.user = decoded; // Attach decoded user payload to the request object
    next(); // Move to the next middleware or route handler
  } catch (error) {
    res.status(403).json({ message: "Invalid or expired token." });
  }
};

module.exports = auth;
