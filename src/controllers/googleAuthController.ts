import passport from "passport";
const User = require("../models/User");
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { generateToken} from "../payment/services/jwtServices"; 


passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/user/google-auth/callback",
    },
    async (profile, done) => {
      const user = await User.findOne({ googleId: profile.id });

      if (user) return done(null, user);

      const newUser = await User.create({
        name: profile.displayName,
        email: profile.emails[0].value,
        googleId: profile.id,
      });

      return done(null, newUser);
    }
  )
);

exports.googleAuthRedirect = (req, res) => {
  const token = generateToken(req.user);
  res.redirect(`/dashboard?token=${token}`);
};
