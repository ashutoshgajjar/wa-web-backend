require('dotenv').config();

const getCorsConfig = () => {
  const environment = process.env.NODE_ENV;

  const configs = {
    dev: {
      origin: [process.env.FRONTEND_URL_DEV].filter(Boolean),
      credentials: true,
    },

    production: {
      origin: [process.env.FRONTEND_URL].filter(Boolean),
      credentials: true,
    },
  };

  const baseConfig = {
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

  return { ...baseConfig, ...configs[environment] };
};

module.exports = getCorsConfig();
