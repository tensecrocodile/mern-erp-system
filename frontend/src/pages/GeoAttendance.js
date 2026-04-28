import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { calculateDistance, isUserInsideGeoFence } from '../utils/geo';
import { checkIn, checkOut } from '../services/attendanceApi';
import { getMyGeofences } from '../services/geoFenceApi';
import './GeoAttendance.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const SELFIE_PLACEHOLDER = 'https://placehold.co/400x400?text=Selfie+Unavailable';

const DEFAULT_MAP_CENTER = { lat: 20.5937, lng: 78.9629 }; // India centre fallback

const MapController = ({ position }) => {
  const map = useMap();

  if (position) {
    map.flyTo([position.lat, position.lng], 18, { duration: 1.25 });
  }

  return null;
};

const GeoAttendance = () => {
  const [fences, setFences] = useState([]);
  const [fencesLoading, setFencesLoading] = useState(true);
  const [fencesError, setFencesError] = useState(null);

  const [userLocation, setUserLocation] = useState(null);
  const [accuracy, setAccuracy] = useState(0);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [attendanceStatus, setAttendanceStatus] = useState(null);

  useEffect(() => {
    getMyGeofences()
      .then((res) => setFences(res.data?.geofences ?? []))
      .catch(() => setFencesError('Could not load your assigned geofence. Contact your admin.'))
      .finally(() => setFencesLoading(false));
  }, []);

  // Primary fence for map display (first circle fence, or first fence overall)
  const primaryFence = useMemo(() => {
    if (fences.length === 0) return null;
    return fences.find((f) => f.type === 'circle') ?? fences[0];
  }, [fences]);

  const mapCenter = useMemo(() => {
    if (primaryFence?.type === 'circle' && primaryFence.center?.latitude) {
      return { lat: primaryFence.center.latitude, lng: primaryFence.center.longitude };
    }
    return DEFAULT_MAP_CENTER;
  }, [primaryFence]);

  const locationStatus = useMemo(() => {
    if (!userLocation || !primaryFence) return null;

    if (primaryFence.type === 'circle' && primaryFence.center?.latitude) {
      const fenceCenter = {
        lat: primaryFence.center.latitude,
        lng: primaryFence.center.longitude,
      };
      const distance = Math.round(calculateDistance(userLocation, fenceCenter));
      const inside = isUserInsideGeoFence(userLocation, fenceCenter, primaryFence.radius);
      return { distance, isInside: inside };
    }

    // Polygon fences — distance not calculable on frontend; backend enforces on check-in
    return { distance: null, isInside: null };
  }, [userLocation, primaryFence]);

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
    if (primaryFence?.type === 'circle' && !locationStatus?.isInside) {
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
      if (err?.message?.includes('already have an active')) {
        setAttendanceStatus('in');
      }
      setError(err?.message || 'Check-in failed. Please try again.');
    } finally {
      setLoadingAction(false);
    }
  }, [locationStatus, userLocation, accuracy, primaryFence]);

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

  const isCheckedIn = attendanceStatus === 'in';

  const statusLabel = locationStatus
    ? locationStatus.isInside === null
      ? 'Location captured'
      : locationStatus.isInside ? 'Inside Area ✅' : 'Outside Area ❌'
    : 'Get location to continue';

  const statusClass = locationStatus
    ? locationStatus.isInside === null
      ? 'status-polygon'
      : locationStatus.isInside ? 'inside' : 'outside'
    : 'status-empty';

  const canCheckIn = userLocation && (locationStatus?.isInside !== false);

  if (fencesLoading) {
    return (
      <div className="page page-geo">
        <div className="page-header">
          <h1 className="page-title">Geo Attendance</h1>
        </div>
        <div className="card geo-status-card">
          <div className="status-badge status-empty">Loading your geofence…</div>
        </div>
      </div>
    );
  }

  if (fencesError || fences.length === 0) {
    return (
      <div className="page page-geo">
        <div className="page-header">
          <h1 className="page-title">Geo Attendance</h1>
        </div>
        <div className="card geo-status-card">
          <div className="status-badge outside">
            {fencesError || 'No geofence assigned. Please contact your administrator.'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page page-geo">
      <div className="page-header">
        <div>
          <h1 className="page-title">Geo Attendance</h1>
          <p className="page-description">
            {primaryFence ? `Zone: ${primaryFence.name}` : 'Check your location and record your attendance.'}
          </p>
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
            {locationStatus.distance !== null && (
              <div className="stat-row">
                <span>Distance</span>
                <strong>{locationStatus.distance}m</strong>
              </div>
            )}
            <div className="stat-row">
              <span>Accuracy</span>
              <strong>±{accuracy}m</strong>
            </div>
            {primaryFence?.type === 'circle' && (
              <div className="stat-row">
                <span>Radius</span>
                <strong>{primaryFence.radius}m</strong>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="geo-map-wrapper">
        <MapContainer
          center={[mapCenter.lat, mapCenter.lng]}
          zoom={16}
          scrollWheelZoom={false}
          className="geo-map"
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
          {fences.map((fence) =>
            fence.type === 'circle' && fence.center?.latitude ? (
              <Circle
                key={fence._id}
                center={[fence.center.latitude, fence.center.longitude]}
                radius={fence.radius}
                pathOptions={{
                  color: fence.color || '#6366f1',
                  fillColor: fence.color || '#6366f1',
                  fillOpacity: 0.15,
                  weight: 2,
                }}
              >
                <Popup>{fence.name}</Popup>
              </Circle>
            ) : null
          )}
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
            className={`btn ${canCheckIn ? 'btn-success' : 'btn-disabled'}`}
            type="button"
            onClick={handleCheckIn}
            disabled={!canCheckIn || loadingAction}
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
