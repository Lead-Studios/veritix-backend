export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    url: process.env.DB_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
  },
  stellar: {
    keys: process.env.STELLAR_KEYS,
  },
});
