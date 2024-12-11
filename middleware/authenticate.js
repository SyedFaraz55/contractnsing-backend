const { JsonWebTokenError } = require("jsonwebtoken");

const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
  
    if (!token) return res.status(401).json({ message: "Access Denied" });
  
    try {
      const decoded = JsonWebTokenError.verify(token, process.env.ACCESS_TOKEN_SECRET);
      req.user = decoded; // Attach user info to request object
      next();
    } catch (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }
  };
  
  router.get("/protected", authenticate, (req, res) => {
    res.send("This is a protected route");
  });