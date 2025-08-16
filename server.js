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

// Enhanced Pos Malaysia Tracking Endpoint
app.get('/track', async (req, res) => {
  const { number } = req.query;
  const startTime = Date.now();

  // Validate tracking number format (Pos Malaysia format)
  if (!number || !/^[A-Za-z]{2}\d{9}[A-Za-z]{2}$/.test(number)) {
    return res.status(400).json({
      error: 'Format nombor tracking tidak valid',
      contoh_valid: 'ENE083992448MY',
      pola: '2 huruf + 9 digit + 2 huruf'
    });
  }

  try {
    // Try multiple possible carrier codes for Pos Malaysia
    const carriers = [
      'pos-malaysia', 
      'poslaju',
      'my-post',
      'malaysia-post'
    ];

    let lastError = null;
    
    for (const carrier of carriers) {
      try {
        const response = await axios.get('https://api.trackmage.com/v1/shipments/track', {
          params: { number, carrier },
          headers: {
            'Authorization': `Bearer ${process.env.TRACKMAGE_API_KEY}`,
            'Accept': 'application/json'
          },
          timeout: 3000
        });

        if (response.data && !response.data.error) {
          const processingTime = Date.now() - startTime;
          return res.json({
            success: true,
            trackingNumber: number,
            carrier: 'Pos Malaysia',
            status: response.data.status || 'Dalam proses',
            events: response.data.events || [],
            processingTime: `${processingTime}ms`,
            carrierUsed: carrier
          });
        }
      } catch (err) {
        lastError = err;
        continue;
      }
    }

    throw lastError || new Error('Semua percubaan carrier gagal');

  } catch (error) {
    const errorDetails = {
      status: error.response?.status || 500,
      message: 'Gagal mendapatkan maklumat tracking',
      details: {
        apiError: error.response?.data || error.message,
        suggestion: 'Sila pastikan nombor tracking betul atau cuba lagi nanti'
      },
      timestamp: new Date().toISOString()
    };

    // Special handling for 404 errors
    if (error.response?.status === 404) {
      errorDetails.message = 'Nombor tracking tidak ditemui dalam sistem';
      errorDetails.suggestion = 'Pastikan nombor betul atau bungkusan sudah didaftarkan';
    }

    res.status(errorDetails.status).json({
      error: true,
      ...errorDetails
    });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
  console.log(`Contoh endpoint: http://localhost:${PORT}/track?number=ENE083992448MY`);
});