const Minio = require('minio')
require('dotenv').config();

var client = new Minio.Client({
    endPoint: 'localhost',
    port: 9000,
    useSSL: false,
    accessKey: process.env.AWS_ACCESS_KEY_ID,
    secretKey: process.env.AWS_SECRET_ACCESS_KEY,
})

client.presignedPutObject(process.env.AWS_BUCKET_NAME, 'test-1.png', (err, url) => {
  if (err) throw err
  console.log('url', url);
});
