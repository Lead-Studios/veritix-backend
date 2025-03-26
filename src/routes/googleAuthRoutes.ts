
import express from "express";
const { googleAuth, googleAuthCallback } = require("../controllers/googleAuthController");
const router = express.Router();

// Route to initiate Google login.
router.get("/google-auth", googleAuth);

// Callback route after Google login.
router.get("/google-auth/callback", googleAuthCallback);

module.exports = router;
