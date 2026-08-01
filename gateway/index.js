const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.static('frontend'));

// Microservices Configuration
const SERVICES = {
  parser: process.env.PARSER_SERVICE_URL || 'http://localhost:5001',
  analytics: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:5002',
  recommendation: process.env.RECOMMENDATION_SERVICE_URL || 'http://localhost:5003'
};

// API Gateway Health & Topology Endpoint
app.get('/api/health', async (req, res) => {
  const healthResults = {
    gateway: { status: 'UP', port: PORT },
    services: {}
  };

  for (const [name, url] of Object.entries(SERVICES)) {
    try {
      const response = await fetch(`${url}/health`);
      if (response.ok) {
        healthResults.services[name] = await response.json();
      } else {
        healthResults.services[name] = { status: 'DOWN', code: response.status };
      }
    } catch (err) {
      healthResults.services[name] = { status: 'DOWN', error: err.message };
    }
  }

  res.json(healthResults);
});

// Proxy routes to Microservices
app.use('/api/parse', createProxyMiddleware({
  target: SERVICES.parser,
  pathRewrite: { '^/api/parse': '/parse-file' },
  changeOrigin: true
}));

app.use('/api/analytics', createProxyMiddleware({
  target: SERVICES.analytics,
  pathRewrite: { '^/api/analytics': '/analyze' },
  changeOrigin: true
}));

app.use('/api/recommendations', createProxyMiddleware({
  target: SERVICES.recommendation,
  pathRewrite: { '^/api/recommendations': '/recommendations' },
  changeOrigin: true
}));

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 [API Gateway] Microservices Router running on http://localhost:${PORT}`);
  console.log(`   ├── Parser Microservice         -> ${SERVICES.parser}`);
  console.log(`   ├── Analytics Microservice      -> ${SERVICES.analytics}`);
  console.log(`   └── Recommendation Microservice -> ${SERVICES.recommendation}`);
  console.log(`=======================================================`);
});
