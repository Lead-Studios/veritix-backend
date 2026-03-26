export default () => ({
    storage: {
      provider: process.env.STORAGE_PROVIDER || 'local',
      s3: {
        bucket: process.env.S3_BUCKET,
        region: process.env.S3_REGION,
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      },
    },
  });