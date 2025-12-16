# SIM900 GPRS Test Backend

A simple test server to receive HTTP requests from your SIM900/ESP32 over GPRS.

## Quick Deploy to Render

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/sim900-backend.git
git push -u origin main
```

### 2. Deploy on Render.com

1. Go to [render.com](https://render.com) and sign up/login
2. Click **New** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `sim900-test-server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Click **Create Web Service**
6. Your URL will be: `https://sim900-test-server.onrender.com`

## Endpoints

| Method | Endpoint          | Description                |
| ------ | ----------------- | -------------------------- |
| GET    | `/test`           | Simple test - returns "OK" |
| GET    | `/data?key=value` | Test with query parameters |
| POST   | `/data`           | Send JSON/form data        |
| ALL    | `/ping`           | Returns "PONG"             |
| POST   | `/register`       | Device registration        |
| POST   | `/alert`          | Alert notifications        |
| POST   | `/sensor`         | Sensor data                |
| GET    | `/`               | Dashboard to view requests |

## ESP32 + SIM900 HTTP Example

Add this to your ESP32 code to send HTTP requests:

```cpp
// Send HTTP GET request using SIM900 AT commands
bool sendHTTPGet(const char* url) {
  Serial.println("--- Sending HTTP GET ---");

  // Initialize HTTP service
  sendATCommand("AT+HTTPINIT", 2000, "OK");

  // Set HTTP parameters
  String urlCmd = "AT+HTTPPARA=\"URL\",\"";
  urlCmd += url;
  urlCmd += "\"";
  sendATCommand(urlCmd.c_str(), 2000, "OK");

  // Execute GET request (action 0 = GET)
  SIM900Serial.println("AT+HTTPACTION=0");

  // Wait for response (format: +HTTPACTION: 0,200,<length>)
  unsigned long startTime = millis();
  String response = "";

  while (millis() - startTime < 30000) {
    response += readSerial();
    if (response.indexOf("+HTTPACTION:") != -1) {
      delay(500);
      response += readSerial();
      Serial.print("HTTP Response: ");
      Serial.println(response);

      // Read the actual response data
      SIM900Serial.println("AT+HTTPREAD");
      delay(1000);
      String data = readSerial();
      Serial.print("Data: ");
      Serial.println(data);

      sendATCommand("AT+HTTPTERM", 2000, "OK");
      return true;
    }
    delay(500);
  }

  sendATCommand("AT+HTTPTERM", 1000, "OK");
  return false;
}

// Send HTTP POST request
bool sendHTTPPost(const char* url, const char* data) {
  Serial.println("--- Sending HTTP POST ---");

  // Initialize HTTP service
  sendATCommand("AT+HTTPINIT", 2000, "OK");

  // Set URL
  String urlCmd = "AT+HTTPPARA=\"URL\",\"";
  urlCmd += url;
  urlCmd += "\"";
  sendATCommand(urlCmd.c_str(), 2000, "OK");

  // Set content type
  sendATCommand("AT+HTTPPARA=\"CONTENT\",\"application/json\"", 2000, "OK");

  // Set data length and timeout
  int dataLen = strlen(data);
  String dataCmd = "AT+HTTPDATA=";
  dataCmd += dataLen;
  dataCmd += ",10000";
  sendATCommand(dataCmd.c_str(), 2000, "DOWNLOAD");

  // Send the actual data
  SIM900Serial.print(data);
  delay(1000);

  // Execute POST request (action 1 = POST)
  SIM900Serial.println("AT+HTTPACTION=1");

  // Wait for response
  unsigned long startTime = millis();
  String response = "";

  while (millis() - startTime < 30000) {
    response += readSerial();
    if (response.indexOf("+HTTPACTION:") != -1) {
      delay(500);
      response += readSerial();
      Serial.print("POST Response: ");
      Serial.println(response);

      sendATCommand("AT+HTTPTERM", 2000, "OK");
      return response.indexOf(",200,") != -1;
    }
    delay(500);
  }

  sendATCommand("AT+HTTPTERM", 1000, "OK");
  return false;
}
```

### Usage in your code:

```cpp
// After GPRS is connected...
const char* YOUR_SERVER = "https://your-server.onrender.com";

// Test GET request
String testUrl = String(YOUR_SERVER) + "/test";
sendHTTPGet(testUrl.c_str());

// Send sensor data (POST)
String postUrl = String(YOUR_SERVER) + "/sensor";
String jsonData = "{\"deviceId\":\"ESP32_001\",\"temp\":25.5,\"smoke\":120}";
sendHTTPPost(postUrl.c_str(), jsonData.c_str());

// Send alert
String alertUrl = String(YOUR_SERVER) + "/alert";
String alertData = "{\"type\":\"FIRE\",\"message\":\"Fire detected!\"}";
sendHTTPPost(alertUrl.c_str(), alertData.c_str());
```

## Local Testing

```bash
npm install
npm start
```

Server runs on `http://localhost:3000`

Test with curl:

```bash
curl http://localhost:3000/test
curl http://localhost:3000/data?temp=25&smoke=100
curl -X POST http://localhost:3000/data -H "Content-Type: application/json" -d '{"test":"hello"}'
```
