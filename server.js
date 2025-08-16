require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, '.')));
app.use(express.json());

// TrackMage Proxy Endpoint
app.get('/track', async (req, res) => {
  try {
    const { number, carrier } = req.query;
    
    if (!number || !carrier) {
      return res.status(400).json({ 
        error: 'Missing tracking number or carrier' 
      });
    }

    const response = await axios.get('https://api.trackmage.com/v1/shipments/track', {
      params: { number, carrier },
      headers: {
        'Authorization': `Bearer ${process.env.TRACKMAGE_API_KEY}`,
        'Accept': 'application/json'
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Tracking error:', error.message);
    
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || 
                   error.response?.data?.error || 
                   'Failed to track shipment';
    
    res.status(status).json({ 
      error: message,
      details: error.response?.data || error.message 
    });
  }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});