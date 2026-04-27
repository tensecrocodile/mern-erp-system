# Frontend - Geo-Attendance UI

React application for geofencing-based attendance check-in using leaflet maps.

## Installation

```bash
npm install
npm install react-leaflet leaflet axios
```

## Dependencies

- `react`: UI library
- `react-leaflet`: Map visualization
- `leaflet`: Mapping engine
- `axios`: HTTP client for API calls

## Features

- **Map Display**: Interactive map using OpenStreetMap via leaflet
- **Geolocation**: Get user's current GPS location
- **Geofence Visualization**: Shows circular fence area with dynamic coloring
- **Distance Calculation**: Haversine formula for accurate distance measurement
- **Status Display**: Shows if user is inside/outside geofence
- **Check-in Integration**: Sends location data to backend API
- **Error Handling**: User-friendly error and success messages

## Running

```bash
npm start
```

Runs on `http://localhost:3000`

## API Integration

### Endpoint: POST /api/v1/attendance/check-in

Required headers:
```
Authorization: Bearer <JWT_TOKEN>
```

Request body:
```json
{
  "checkInAt": "2026-04-25T10:30:00Z",
  "location": {
    "latitude": 28.6139,
    "longitude": 77.209,
    "accuracy": 10,
    "address": "Connaught Place, Delhi"
  },
  "selfieUrl": "https://example.com/selfie.jpg"
}
```

Response:
```json
{
  "success": true,
  "message": "Check-in successful",
  "data": {
    "attendance": { ... }
  }
}
```

## Configuration

Set `REACT_APP_API_URL` in `.env` to match your backend URL:
```
REACT_APP_API_URL=http://localhost:5000/api/v1
```

## Files

- `src/pages/GeoAttendance.js` - Main component
- `src/pages/GeoAttendance.css` - Styling
- `src/services/attendanceApi.js` - API service
- `src/utils/geo.js` - Distance calculation utilities
- `src/App.js` - App wrapper
- `public/index.html` - HTML template
