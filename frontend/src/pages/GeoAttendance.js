import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { calculateDistance, isUserInsideGeoFence } from '../utils/geo';
import { checkIn, checkOut } from '../services/attendanceApi';
import './GeoAttendance.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const DEFAULT_GEO_FENCE = {
  lat: 28.6139,
  lng: 77.209,
  radius: 120,
};

const SELFIE_PLACEHOLDER = 'https://placehold.co/400x400?text=Selfie+Unavailable';

const MapController = ({ position }) => {
  const map = useMap();

  if (position) {
    map.flyTo([position.lat, position.lng], 18, { duration: 1.25 });
  }

  return null;
};

const GeoAttendance = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [accuracy, setAccuracy] = useState(0);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  // null = unknown, 'in' = checked in, 'out' = checked out / not checked in
  const [attendanceStatus, setAttendanceStatus] = useState(null);

  // Determine current attendance session from today's dashboard data
  useEffect(() => {
    // We only show the status once the user gets location — no pre-fetch needed
  }, []);

  const locationStatus = useMemo(() => {
    if (!userLocation) return null;
    const distance = Math.round(calculateDistance(userLocation, DEFAULT_GEO_FENCE));
    const inside = isUserInsideGeoFence(userLocation, DEFAULT_GEO_FENCE, DEFAULT_GEO_FENCE.radius);
    return { distance, isInside: inside };
  }, [userLocation]);

  const getLocationErrorMessage = useCallback((geoError) => {
    if (geoError.code === geoError.PERMISSION_DENIED) return 'Location permission denied. Allow location access in your browser.';
    if (geoError.code === geoError.POSITION_UNAVAILABLE) return 'Location unavailable. Make sure GPS is enabled.';
    if (geoError.code === geoError.TIMEOUT) return 'Location request timed out. Try again.';
    return `Unable to retrieve location: ${geoError.message}`;
  }, []);

  const handleGetLocation = useCallback(() => {
    setLoadingLocation(true);
    setError(null);
    setSuccess(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setAccuracy(Math.round(position.coords.accuracy || 0));
        setLoadingLocation(false);
      },
      (geoError) => {
        setError(getLocationErrorMessage(geoError));
        setLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [getLocationErrorMessage]);

  const handleCheckIn = useCallback(async () => {
    if (!locationStatus?.isInside) {
      setError('You must be inside the geo-fence area to check in.');
      return;
    }

    setLoadingAction(true);
    setError(null);
    setSuccess(null);

    try {
      await checkIn(
        { lat: userLocation.lat, lng: userLocation.lng, accuracy },
        SELFIE_PLACEHOLDER
      );
      setSuccess('Check-in successful!');
      setAttendanceStatus('in');
    } catch (err) {
      // 409 means already checked in — update UI to reflect actual state
      if (err?.message?.includes('already have an active')) {
        setAttendanceStatus('in');
      }
      setError(err?.message || 'Check-in failed. Please try again.');
    } finally {
      setLoadingAction(false);
    }
  }, [locationStatus, userLocation, accuracy]);

  const handleCheckOut = useCallback(async () => {
    if (!userLocation) {
      setError('Please get your location first.');
      return;
    }

    setLoadingAction(true);
    setError(null);
    setSuccess(null);

    try {
      await checkOut(
        { lat: userLocation.lat, lng: userLocation.lng, accuracy },
        SELFIE_PLACEHOLDER
      );
      setSuccess('Check-out successful! Have a great evening.');
      setAttendanceStatus('out');
    } catch (err) {
      setError(err?.message || 'Check-out failed. Please try again.');
    } finally {
      setLoadingAction(false);
    }
  }, [userLocation, accuracy]);

  const statusLabel = locationStatus
    ? locationStatus.isInside ? 'Inside Area ✅' : 'Outside Area ❌'
    : 'Get location to continue';
  const statusClass = locationStatus
    ? locationStatus.isInside ? 'inside' : 'outside'
    : 'status-empty';

  const isCheckedIn = attendanceStatus === 'in';

  return (
    <div className="page page-geo">
      <div className="page-header">
        <div>
          <h1 className="page-title">Geo Attendance</h1>
          <p className="page-description">Check your location and record your attendance.</p>
        </div>
        {attendanceStatus && (
          <span className={`tag ${isCheckedIn ? 'tag-optional' : 'tag-company'}`}>
            {isCheckedIn ? '🟢 Checked In' : '⚪ Checked Out'}
          </span>
        )}
      </div>

      <div className="card geo-status-card">
        <div className={`status-badge ${statusClass}`}>{statusLabel}</div>
        {locationStatus && (
          <div className="geo-stats">
            <div className="stat-row">
              <span>Distance</span>
              <strong>{locationStatus.distance}m</strong>
            </div>
            <div className="stat-row">
              <span>Accuracy</span>
              <strong>±{accuracy}m</strong>
            </div>
            <div className="stat-row">
              <span>Radius</span>
              <strong>{DEFAULT_GEO_FENCE.radius}m</strong>
            </div>
          </div>
        )}
      </div>

      <div className="geo-map-wrapper">
        <MapContainer
          center={[DEFAULT_GEO_FENCE.lat, DEFAULT_GEO_FENCE.lng]}
          zoom={16}
          scrollWheelZoom={false}
          className="geo-map"
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
          <Circle
            center={[DEFAULT_GEO_FENCE.lat, DEFAULT_GEO_FENCE.lng]}
            radius={DEFAULT_GEO_FENCE.radius}
            pathOptions={{
              color: locationStatus?.isInside ? '#22c55e' : '#ef4444',
              fillColor: locationStatus?.isInside ? '#22c55e' : '#ef4444',
              fillOpacity: 0.18,
              weight: 3,
            }}
          />
          {userLocation && (
            <>
              <Marker position={[userLocation.lat, userLocation.lng]}>
                <Popup>
                  <div className="popup">
                    <p className="popup-title">Your location</p>
                    <p>{userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}</p>
                    <p>Accuracy ±{accuracy}m</p>
                  </div>
                </Popup>
              </Marker>
              <MapController position={userLocation} />
            </>
          )}
        </MapContainer>
      </div>

      <div className="geo-actions">
        <button
          className="btn btn-primary"
          type="button"
          onClick={handleGetLocation}
          disabled={loadingLocation || loadingAction}
        >
          {loadingLocation ? 'Locating…' : 'Get Location'}
        </button>

        {(!attendanceStatus || attendanceStatus === 'out') && (
          <button
            className={`btn ${locationStatus?.isInside ? 'btn-success' : 'btn-disabled'}`}
            type="button"
            onClick={handleCheckIn}
            disabled={!locationStatus?.isInside || loadingAction}
          >
            {loadingAction ? 'Checking In…' : 'Check In'}
          </button>
        )}

        {attendanceStatus === 'in' && (
          <button
            className="btn btn-secondary"
            type="button"
            onClick={handleCheckOut}
            disabled={!userLocation || loadingAction}
          >
            {loadingAction ? 'Checking Out…' : 'Check Out'}
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
    </div>
  );
};

export default GeoAttendance;
