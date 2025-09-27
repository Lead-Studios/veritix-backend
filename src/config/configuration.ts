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
  qr: {
    expirySeconds: parseInt(process.env.QR_EXPIRY_SECONDS || '30', 10),
    secret: process.env.QR_SECRET || process.env.JWT_SECRET,
  },
});
