const express = require('express');
const cors = require('cors');
const { initDB } = require('./db');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const { startExpireJob } = require('./jobs/expireOrders');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

async function start() {
  let retries = 10;
  while (retries > 0) {
    try {
      await initDB();
      break;
    } catch (err) {
      retries--;
      console.log(`DB not ready, retrying... (${retries} attempts left)`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  startExpireJob();

  app.listen(PORT, () => {
    console.log(`🌼 蒲公英義賣後端服務啟動於 port ${PORT}`);
  });
}

start();
