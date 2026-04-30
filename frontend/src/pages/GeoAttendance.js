import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { calculateDistance, isUserInsideGeoFence } from '../utils/geo';
import { checkIn, checkOut, uploadSelfie } from '../services/attendanceApi';
import { getMyGeofences } from '../services/geoFenceApi';
import './GeoAttendance.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const DEFAULT_MAP_CENTER = { lat: 20.5937, lng: 78.9629 };

const MapController = ({ position }) => {
  const map = useMap();
  if (position) map.flyTo([position.lat, position.lng], 18, { duration: 1.25 });
  return null;
};

// ── Camera selfie capture ──────────────────────────────────────

const SelfieCapture = ({ onCapture, onCancel }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [captured, setCaptured] = useState(null);
  const [camError, setCamError] = useState(null);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: 400, height: 400 } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setReady(true);
        }
      })
      .catch(() => setCamError('Camera access denied. Enable camera permission and try again.'));

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width  = video.videoWidth  || 400;
    canvas.height = video.videoHeight || 400;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        setCaptured({ blob, preview: canvas.toDataURL('image/jpeg', 0.85) });
        streamRef.current?.getTracks().forEach((t) => t.stop());
      },
      'image/jpeg',
      0.85
    );
  };

  const handleRetake = () => {
    setCaptured(null);
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: 400, height: 400 } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setReady(true);
        }
      });
  };

  if (camError) {
    return (
      <div className="selfie-modal">
        <div className="selfie-box">
          <div className="alert alert-error">{camError}</div>
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="selfie-modal">
      <div className="selfie-box">
        <h3 className="selfie-title">Take Selfie</h3>

        {!captured ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="selfie-video"
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div className="selfie-actions">
              <button
                className="btn btn-primary"
                onClick={handleCapture}
                disabled={!ready}
              >
                {ready ? 'Capture' : 'Starting camera…'}
              </button>
              <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            <img src={captured.preview} alt="Selfie preview" className="selfie-preview" />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div className="selfie-actions">
              <button className="btn btn-success" onClick={() => onCapture(captured.blob)}>
                Use This Photo
              </button>
              <button className="btn btn-secondary" onClick={handleRetake}>Retake</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── Main page ──────────────────────────────────────────────────

const GeoAttendance = () => {
  const [fences, setFences]               = useState([]);
  const [fencesLoading, setFencesLoading] = useState(true);
  const [fencesError, setFencesError]     = useState(null);

  const [userLocation, setUserLocation]   = useState(null);
  const [accuracy, setAccuracy]           = useState(0);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError]                 = useState(null);
  const [success, setSuccess]             = useState(null);
  const [attendanceStatus, setAttendanceStatus] = useState(null);

  const [selfieMode, setSelfieMode]       = useState(null); // 'checkin' | 'checkout' | null

  useEffect(() => {
    getMyGeofences()
      .then((res) => setFences(res.data?.geofences ?? []))
      .catch(() => setFencesError('Could not load your assigned geofence. Contact your admin.'))
      .finally(() => setFencesLoading(false));
  }, []);

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
      const fenceCenter = { lat: primaryFence.center.latitude, lng: primaryFence.center.longitude };
      const distance = Math.round(calculateDistance(userLocation, fenceCenter));
      return { distance, isInside: isUserInsideGeoFence(userLocation, fenceCenter, primaryFence.radius) };
    }
    return { distance: null, isInside: null };
  }, [userLocation, primaryFence]);

  const getLocationErrorMessage = useCallback((geoError) => {
    if (geoError.code === geoError.PERMISSION_DENIED)    return 'Location permission denied. Allow location access in your browser.';
    if (geoError.code === geoError.POSITION_UNAVAILABLE) return 'Location unavailable. Make sure GPS is enabled.';
    if (geoError.code === geoError.TIMEOUT)              return 'Location request timed out. Try again.';
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
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setAccuracy(Math.round(pos.coords.accuracy || 0));
        setLoadingLocation(false);
      },
      (geoError) => {
        setError(getLocationErrorMessage(geoError));
        setLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [getLocationErrorMessage]);

  const handleSelfieCapture = useCallback(async (blob) => {
    setSelfieMode(null);
    setLoadingAction(true);
    setError(null);
    setSuccess(null);

    try {
      const selfieUrl = await uploadSelfie(blob);
      if (!selfieUrl) throw new Error('Selfie upload failed. Please try again.');

      if (selfieMode === 'checkin') {
        await checkIn({ lat: userLocation.lat, lng: userLocation.lng, accuracy }, selfieUrl);
        setSuccess('Check-in successful!');
        setAttendanceStatus('in');
      } else {
        await checkOut({ lat: userLocation.lat, lng: userLocation.lng, accuracy }, selfieUrl);
        setSuccess('Check-out successful! Have a great evening.');
        setAttendanceStatus('out');
      }
    } catch (err) {
      if (err?.message?.includes('already have an active')) setAttendanceStatus('in');
      setError(err?.message || 'Action failed. Please try again.');
    } finally {
      setLoadingAction(false);
    }
  }, [selfieMode, userLocation, accuracy]);

  const requestCheckIn = useCallback(() => {
    if (primaryFence?.type === 'circle' && !locationStatus?.isInside) {
      setError('You must be inside the geo-fence area to check in.');
      return;
    }
    setError(null);
    setSelfieMode('checkin');
  }, [locationStatus, primaryFence]);

  const requestCheckOut = useCallback(() => {
    if (!userLocation) { setError('Please get your location first.'); return; }
    setError(null);
    setSelfieMode('checkout');
  }, [userLocation]);

  const isCheckedIn  = attendanceStatus === 'in';
  const canCheckIn   = userLocation && locationStatus?.isInside !== false;

  const statusLabel = locationStatus
    ? locationStatus.isInside === null ? 'Location captured'
    : locationStatus.isInside ? 'Inside Area ✅' : 'Outside Area ❌'
    : 'Get location to continue';

  const statusClass = locationStatus
    ? locationStatus.isInside === null ? 'status-polygon'
    : locationStatus.isInside ? 'inside' : 'outside'
    : 'status-empty';

  if (fencesLoading) {
    return (
      <div className="page page-geo">
        <div className="page-header"><h1 className="page-title">Geo Attendance</h1></div>
        <div className="card geo-status-card">
          <div className="status-badge status-empty">Loading your geofence…</div>
        </div>
      </div>
    );
  }

  if (fencesError || fences.length === 0) {
    return (
      <div className="page page-geo">
        <div className="page-header"><h1 className="page-title">Geo Attendance</h1></div>
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
      {selfieMode && (
        <SelfieCapture
          onCapture={handleSelfieCapture}
          onCancel={() => setSelfieMode(null)}
        />
      )}

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
              <div className="stat-row"><span>Distance</span><strong>{locationStatus.distance}m</strong></div>
            )}
            <div className="stat-row"><span>Accuracy</span><strong>±{accuracy}m</strong></div>
            {primaryFence?.type === 'circle' && (
              <div className="stat-row"><span>Radius</span><strong>{primaryFence.radius}m</strong></div>
            )}
          </div>
        )}
      </div>

      <div className="geo-map-wrapper">
        <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={16} scrollWheelZoom={false} className="geo-map">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
          {fences.map((fence) =>
            fence.type === 'circle' && fence.center?.latitude ? (
              <Circle
                key={fence._id}
                center={[fence.center.latitude, fence.center.longitude]}
                radius={fence.radius}
                pathOptions={{ color: fence.color || '#6366f1', fillColor: fence.color || '#6366f1', fillOpacity: 0.15, weight: 2 }}
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
            onClick={requestCheckIn}
            disabled={!canCheckIn || loadingAction}
          >
            {loadingAction && selfieMode === 'checkin' ? 'Checking In…' : 'Check In'}
          </button>
        )}

        {attendanceStatus === 'in' && (
          <button
            className="btn btn-secondary"
            type="button"
            onClick={requestCheckOut}
            disabled={!userLocation || loadingAction}
          >
            {loadingAction && selfieMode === 'checkout' ? 'Checking Out…' : 'Check Out'}
          </button>
        )}
      </div>

      {error   && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
    </div>
  );
};

export default GeoAttendance;
