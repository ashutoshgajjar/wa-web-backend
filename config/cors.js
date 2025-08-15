require('dotenv').config();

const getCorsConfig = () => {
  const environment = process.env.NODE_ENV || 'development';

  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
  ];

  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
  }

  if (process.env.ALLOWED_ORIGINS) {
    const additionalOrigins = process.env.ALLOWED_ORIGINS.split(',').map(
      (url) => url.trim()
    );
    allowedOrigins.push(...additionalOrigins);
  }

  const baseConfig = {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (environment === 'development') {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin ${origin} not allowed`));
      }
    },
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
    optionsSuccessStatus: 200,
  };

  return baseConfig;
};

module.exports = getCorsConfig();
