require('dotenv').config();

const getCorsConfig = () => {
  const baseConfig = {
    origin: [process.env.FRONTEND_URL]
      .filter(Boolean)
      .flatMap((url) => url.split(',')),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Requested-With',
      'Cache-Control',
    ],
  };

  return baseConfig;
};

module.exports = getCorsConfig();
