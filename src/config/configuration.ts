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
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    external: {
      enabled: process.env.LOG_EXTERNAL_ENABLED === 'true',
      provider: process.env.LOG_EXTERNAL_PROVIDER || 'generic',
      url: process.env.LOG_EXTERNAL_URL,
      token: process.env.LOG_EXTERNAL_TOKEN,
    },
  },
});
