const express = require("express");
const { register, login } = require("../controllers/authContollers");
const passport = require("passport");

const router = express.Router();

router.post("/create", register);
router.post("/login", login);

router.get("/google-auth", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get(
  "/google-auth/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => res.redirect("/")
);

module.exports = router;
