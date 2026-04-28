import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { getActiveTripsFeed } from '../services/tripsApi';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const REFRESH_INTERVAL_MS = 30_000;
const DEFAULT_CENTER = [20.5937, 78.9629];

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Math.round((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

const TripsLive = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const intervalRef = useRef(null);

  const fetchTrips = useCallback(async () => {
    try {
      const res = await getActiveTripsFeed();
      setTrips(res.data?.trips ?? []);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      setError(err?.message || 'Failed to load active trips.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
    intervalRef.current = setInterval(fetchTrips, REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [fetchTrips]);

  const mapCenter = trips.length > 0
    ? [trips[0].lat, trips[0].lng]
    : DEFAULT_CENTER;

  return (
    <div className="page page-trips-live">
      <div className="page-header">
        <div>
          <h1 className="page-title">Live Map</h1>
          <p className="page-description">
            {trips.length} active trip{trips.length !== 1 ? 's' : ''} ·{' '}
            {lastRefresh ? `Updated ${relativeTime(lastRefresh)}` : 'Loading…'}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={fetchTrips}
          disabled={loading}
        >
          ↻ Refresh
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="trips-live-layout">
        <div className="geo-map-wrapper">
          <MapContainer
            center={mapCenter}
            zoom={trips.length > 0 ? 12 : 5}
            scrollWheelZoom
            className="geo-map"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            {trips.map((trip) => (
              <Marker key={trip.tripId} position={[trip.lat, trip.lng]}>
                <Popup>
                  <div className="popup">
                    <p className="popup-title">{trip.name}</p>
                    <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                      {relativeTime(trip.lastUpdatedAt)}
                    </p>
                    <p style={{ fontSize: '0.75rem' }}>
                      {trip.lat.toFixed(4)}, {trip.lng.toFixed(4)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <div className="trips-live-sidebar">
          {loading && trips.length === 0 ? (
            <div className="skeleton-list">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton-item" />
              ))}
            </div>
          ) : trips.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">◈</div>
              <div className="empty-state-title">No active trips</div>
              <div className="empty-state-desc">Field employees will appear here when they start a trip.</div>
            </div>
          ) : (
            <ul className="list">
              {trips.map((trip) => (
                <li key={trip.tripId} className="list-item trips-live-item">
                  <div className="emp-avatar">
                    {trip.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="list-item-main">
                    <div className="list-item-title">{trip.name}</div>
                    <div className="list-meta">
                      {trip.lat.toFixed(4)}, {trip.lng.toFixed(4)} ·{' '}
                      {relativeTime(trip.lastUpdatedAt)}
                    </div>
                  </div>
                  <span className="tag tag-success">Active</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default TripsLive;
