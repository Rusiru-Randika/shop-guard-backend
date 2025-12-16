const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse different content types
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());

// Store recent requests in memory (for viewing on dashboard)
const recentRequests = [];
const MAX_REQUESTS = 50;

function addRequest(req, data) {
  const entry = {
    id: Date.now(),
    time: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip || req.connection.remoteAddress,
    headers: req.headers,
    query: req.query,
    body: data
  };
  
  recentRequests.unshift(entry);
  if (recentRequests.length > MAX_REQUESTS) {
    recentRequests.pop();
  }
  
  console.log('\n========================================');
  console.log(`📨 ${req.method} ${req.path} from ${entry.ip}`);
  console.log(`   Time: ${entry.time}`);
  if (Object.keys(req.query).length > 0) {
    console.log(`   Query: ${JSON.stringify(req.query)}`);
  }
  if (data) {
    console.log(`   Body: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  }
  console.log('========================================\n');
  
  return entry;
}

// ============================================
// MAIN TEST ENDPOINTS (For SIM900)
// ============================================

// GET request - simplest test (SIM900 can use AT+HTTPACTION=0)
app.get('/test', (req, res) => {
  addRequest(req, null);
  res.send('OK - GET received from SIM900');
});

// GET with query parameters
app.get('/data', (req, res) => {
  addRequest(req, null);
  res.json({
    success: true,
    message: 'Data received',
    received: req.query,
    timestamp: new Date().toISOString()
  });
});

// POST request (SIM900 can use AT+HTTPACTION=1)
app.post('/data', (req, res) => {
  addRequest(req, req.body);
  res.json({
    success: true,
    message: 'POST data received',
    received: req.body,
    timestamp: new Date().toISOString()
  });
});

// Simple endpoint that just returns OK (minimal response for testing)
app.all('/ping', (req, res) => {
  addRequest(req, req.body);
  res.send('PONG');
});

// Device registration endpoint
app.post('/register', (req, res) => {
  addRequest(req, req.body);
  res.json({
    success: true,
    message: 'Device registered',
    deviceId: req.body.deviceId || 'unknown',
    timestamp: new Date().toISOString()
  });
});

// Alert endpoint
app.post('/alert', (req, res) => {
  addRequest(req, req.body);
  console.log('🚨 ALERT RECEIVED:', req.body);
  res.json({
    success: true,
    message: 'Alert logged',
    alertType: req.body.alertType || 'unknown'
  });
});

// Sensor data endpoint
app.post('/sensor', (req, res) => {
  addRequest(req, req.body);
  res.json({
    success: true,
    message: 'Sensor data received'
  });
});

// ============================================
// DASHBOARD (View received requests in browser)
// ============================================

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>SIM900 Test Server</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', system-ui, sans-serif; 
      background: #0d1117; 
      color: #c9d1d9; 
      padding: 20px;
      min-height: 100vh;
    }
    h1 { 
      color: #58a6ff; 
      margin-bottom: 10px;
      font-size: 1.5rem;
    }
    .status { 
      background: #238636; 
      color: white; 
      padding: 4px 12px; 
      border-radius: 20px; 
      font-size: 0.8rem;
      display: inline-block;
      margin-bottom: 20px;
    }
    .endpoints { 
      background: #161b22; 
      border: 1px solid #30363d; 
      border-radius: 8px; 
      padding: 20px; 
      margin-bottom: 20px;
    }
    .endpoints h2 { color: #8b949e; font-size: 0.9rem; margin-bottom: 15px; }
    .endpoint { 
      display: flex; 
      align-items: center; 
      gap: 10px; 
      margin: 8px 0;
      font-family: monospace;
    }
    .method { 
      padding: 2px 8px; 
      border-radius: 4px; 
      font-size: 0.75rem; 
      font-weight: bold;
      min-width: 50px;
      text-align: center;
    }
    .get { background: #238636; }
    .post { background: #1f6feb; }
    .all { background: #8957e5; }
    .path { color: #58a6ff; }
    .desc { color: #8b949e; font-size: 0.85rem; }
    .requests { 
      background: #161b22; 
      border: 1px solid #30363d; 
      border-radius: 8px; 
      padding: 20px;
    }
    .requests h2 { color: #8b949e; font-size: 0.9rem; margin-bottom: 15px; }
    .request { 
      background: #0d1117; 
      border: 1px solid #30363d; 
      border-radius: 6px; 
      padding: 12px; 
      margin: 10px 0;
    }
    .request-header { 
      display: flex; 
      justify-content: space-between; 
      margin-bottom: 8px;
    }
    .request-method { font-weight: bold; color: #58a6ff; }
    .request-time { color: #8b949e; font-size: 0.8rem; }
    .request-body { 
      background: #21262d; 
      padding: 8px; 
      border-radius: 4px; 
      font-family: monospace; 
      font-size: 0.85rem;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .empty { color: #8b949e; text-align: center; padding: 40px; }
    .refresh { 
      background: #238636; 
      color: white; 
      border: none; 
      padding: 8px 16px; 
      border-radius: 6px; 
      cursor: pointer;
      float: right;
    }
    .host { 
      color: #f0883e; 
      font-family: monospace; 
      font-size: 0.9rem;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <h1>🛡️ SIM900 Test Server</h1>
  <span class="status">● Online</span>
  <p class="host">Your server URL: Use this in your ESP32 code</p>
  
  <div class="endpoints">
    <h2>📡 AVAILABLE ENDPOINTS</h2>
    <div class="endpoint"><span class="method get">GET</span><span class="path">/test</span><span class="desc">Simple test - returns "OK"</span></div>
    <div class="endpoint"><span class="method get">GET</span><span class="path">/data?key=value</span><span class="desc">Test with query params</span></div>
    <div class="endpoint"><span class="method post">POST</span><span class="path">/data</span><span class="desc">POST JSON/form data</span></div>
    <div class="endpoint"><span class="method all">ALL</span><span class="path">/ping</span><span class="desc">Returns "PONG"</span></div>
    <div class="endpoint"><span class="method post">POST</span><span class="path">/register</span><span class="desc">Device registration</span></div>
    <div class="endpoint"><span class="method post">POST</span><span class="path">/alert</span><span class="desc">Alert notifications</span></div>
    <div class="endpoint"><span class="method post">POST</span><span class="path">/sensor</span><span class="desc">Sensor data</span></div>
  </div>

  <div class="requests">
    <button class="refresh" onclick="location.reload()">↻ Refresh</button>
    <h2>📨 RECENT REQUESTS (${recentRequests.length})</h2>
    ${recentRequests.length === 0 ? 
      '<div class="empty">No requests received yet.<br>Send a request from your SIM900 to see it here!</div>' :
      recentRequests.map(r => `
        <div class="request">
          <div class="request-header">
            <span class="request-method">${r.method} ${r.path}</span>
            <span class="request-time">${r.time}</span>
          </div>
          ${r.body ? `<div class="request-body">${typeof r.body === 'string' ? r.body : JSON.stringify(r.body, null, 2)}</div>` : ''}
        </div>
      `).join('')
    }
  </div>
  
  <script>setTimeout(() => location.reload(), 10000);</script>
</body>
</html>
  `);
});

// Catch-all for any other requests
app.all('*', (req, res) => {
  addRequest(req, req.body);
  res.json({
    success: true,
    message: 'Request received',
    method: req.method,
    path: req.path
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║     🛡️  SIM900 GPRS Test Server Running      ║');
  console.log('╠═══════════════════════════════════════════════╣');
  console.log(`║  Port: ${PORT}                                    ║`);
  console.log('║  Endpoints:                                   ║');
  console.log('║    GET  /test     - Simple test               ║');
  console.log('║    GET  /data     - With query params         ║');
  console.log('║    POST /data     - POST data                 ║');
  console.log('║    ALL  /ping     - Returns PONG              ║');
  console.log('║    POST /register - Device registration       ║');
  console.log('║    POST /alert    - Alert notifications       ║');
  console.log('║    POST /sensor   - Sensor data               ║');
  console.log('╚═══════════════════════════════════════════════╝');
  console.log('');
  console.log('Waiting for requests from SIM900...\n');
});
