import passport  from "passport";
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

// Configure Passport to use Google OAuth
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/user/google-auth/callback", // Callback URL after Google login
    },
    async (accessToken, refreshToken, profile, done) => {
      // Check if the user already exists in the database
      const user = await User.findOne({ googleId: profile.id });

      if (user) {
        return done(null, user); // Existing user, continue
      }

      // If the user doesn't exist, create a new one
      const newUser = await User.create({
        name: profile.displayName,
        email: profile.emails[0].value,
        googleId: profile.id,
      });

      return done(null, newUser);
    }
  )
);
