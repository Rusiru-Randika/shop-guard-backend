// server.js - Backend Web Server to receive data from the GSM module

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const PORT = 3001; // Ensure this port is open on your firewall and accessible from the internet

// --- Middleware Configuration ---

// Use body-parser to parse JSON bodies from incoming requests
// limit: '10kb' prevents large, malicious payloads
app.use(bodyParser.json({ limit: '10kb' }));

// A simple in-memory store for device statuses (will be empty on server restart)
const registeredDevices = {};

// ===============================================
// 1. DEVICE REGISTRATION ROUTE (HTTP POST)
// Endpoint: /api/register
// Used by the ESP32 setup() function to check-in and get registered.
// ===============================================
app.post('/api/register', (req, res) => {
    const { deviceId, deviceType, version } = req.body;

    if (!deviceId) {
        return res.status(400).json({ error: 'Device ID is required for registration.' });
    }

    // Check if the device is already registered in our mock database
    if (registeredDevices[deviceId]) {
        console.log(`[Device] Device ${deviceId} checked in again.`);
        return res.status(200).json({ 
            message: 'Device already registered and paired.', 
            status: 'paired', 
            shopId: registeredDevices[deviceId].shopId 
        });
    }

    // New device registration logic:
    const newShopId = 'SHOP-' + Math.floor(Math.random() * 1000);
    registeredDevices[deviceId] = {
        deviceId,
        deviceType,
        version,
        shopId: newShopId,
        lastSeen: new Date().toISOString(),
        dataHistory: []
    };

    console.log(`[Device] NEW device registered: ${deviceId} -> Shop ID: ${newShopId}`);

    // Send HTTP 201 (Created) response back to the GPRS module
    res.status(201).json({ 
        message: 'Registration successful. Device paired.', 
        status: 'paired', 
        shopId: newShopId 
    });
});

// ===============================================
// 2. DATA AND ALERT ROUTE (HTTP POST)
// Endpoint: /api/data
// Used by the ESP32 sendSensorData() and sendAlertEvent() functions.
// ===============================================
app.post('/api/data', (req, res) => {
    const { deviceId, shopId, type, data, alertType, message } = req.body;

    if (!deviceId || !shopId) {
        return res.status(400).json({ error: 'Missing deviceId or shopId.' });
    }

    if (!registeredDevices[deviceId]) {
        return res.status(404).json({ error: 'Device not recognized. Please re-register.' });
    }

    // Update last seen time
    registeredDevices[deviceId].lastSeen = new Date().toISOString();

    if (type === 'sensor_data' && data) {
        // Handle incoming sensor readings
        registeredDevices[deviceId].dataHistory.push({
            timestamp: new Date().toISOString(),
            ...data
        });
        console.log(`[DATA] Received sensor data from ${shopId}: Smoke=${data.smoke}, Temp=${data.temperature}`);
    } 
    
    else if (type === 'alert' && alertType) {
        // Handle incoming alarms/alerts
        console.log(`\n======================================`);
        console.log(`!!! ALARM RECEIVED !!!`);
        console.log(`DEVICE: ${shopId} (${deviceId})`);
        console.log(`TYPE: ${alertType}`);
        console.log(`MESSAGE: ${message}`);
        console.log(`======================================\n`);
    }

    // Send HTTP 200 OK back to the GPRS module
    res.status(200).json({ status: 'Data received' });
});

// ===============================================
// 3. START THE SERVER
// ===============================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server running and listening on port ${PORT}`);
    console.log(`Device Registration endpoint: http://[YOUR-SERVER-IP]:${PORT}/api/register`);
    console.log(`Data Submission endpoint: http://[YOUR-SERVER-IP]:${PORT}/api/data`);
});