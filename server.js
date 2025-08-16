require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).send('Service Healthy');
});

// TrackMage Proxy Endpoint for Pos Malaysia
app.get('/track', async (req, res) => {
  try {
    const { number } = req.query;
    
    if (!number) {
      return res.status(400).json({ 
        error: 'Sila masukkan nombor tracking',
        contoh: 'ENE083992448MY'
      });
    }

    const response = await axios.get('https://api.trackmage.com/v1/shipments/track', {
      params: { 
        number,
        carrier: 'pos-malaysia'
      },
      headers: {
        'Authorization': `Bearer ${process.env.TRACKMAGE_API_KEY}`,
        'Accept': 'application/json'
      },
      timeout: 5000 // 5 seconds timeout
    });

    // Transform response for better formatting
    const transformedData = {
      trackingNumber: response.data.trackingNumber || number,
      status: response.data.status || 'Tiada maklumat',
      carrier: 'Pos Malaysia',
      events: response.data.events?.map(event => ({
        date: event.date,
        status: event.status,
        location: event.location || 'Lokasi tidak dinyatakan'
      })) || []
    };

    res.json(transformedData);
  } catch (error) {
    console.error('Tracking error:', error.message);
    
    let status = 500;
    let message = 'Gagal melacak bungkusan. Sila cuba lagi.';

    if (error.response) {
      status = error.response.status;
      message = error.response.data?.message || 
               error.response.data?.error || 
               message;
    } else if (error.request) {
      message = 'Tiada sambungan ke server TrackMage';
    }

    res.status(status).json({ 
      error: message,
      details: error.response?.data || error.message 
    });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
  console.log(`Endpoint tracking: http://localhost:${PORT}/track?number=ENE083992448MY`);
});