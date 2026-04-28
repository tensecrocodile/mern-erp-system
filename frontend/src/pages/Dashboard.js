import { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getAdminDashboard, getMyDashboard, getLiveTracking } from '../services/dashboardApi';

const OFFICE = { lat: 28.6139, lng: 77.209 };
const FENCE_RADIUS = 120;
const ACTIVE_MS = 30_000;
const IDLE_MS = 300_000;

function markerAgeMs(lastUpdatedAt) {
  return Date.now() - new Date(lastUpdatedAt).getTime();
}

function markerColor(lastUpdatedAt) {
  const ms = markerAgeMs(lastUpdatedAt);
  if (ms < ACTIVE_MS) return '#22c55e';
  if (ms < IDLE_MS) return '#f59e0b';
  return '#ef4444';
}

function markerStatus(lastUpdatedAt) {
  const ms = markerAgeMs(lastUpdatedAt);
  if (ms < ACTIVE_MS) return 'Active';
  if (ms < IDLE_MS) return 'Idle';
  return 'Offline';
}

function makeIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="width:13px;height:13px;background:${color};border:2.5px solid #fff;border-radius:50%;box-shadow:0 0 0 2.5px ${color}55,0 2px 6px rgba(0,0,0,.3)"></div>`,
    iconSize: [13, 13],
    iconAnchor: [6, 6],
    popupAnchor: [0, -10],
  });
}

const LiveMap = ({ markers }) => {
  const icons = useMemo(
    () =>
      markers.reduce((acc, m) => {
        acc[m.tripId] = makeIcon(markerColor(m.lastUpdatedAt));
        return acc;
      }, {}),
    [markers]
  );

  return (
    <MapContainer
      center={[OFFICE.lat, OFFICE.lng]}
      zoom={15}
      scrollWheelZoom={false}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      <Circle
        center={[OFFICE.lat, OFFICE.lng]}
        radius={FENCE_RADIUS}
        pathOptions={{
          color: '#6366f1',
          fillColor: '#6366f1',
          fillOpacity: 0.1,
          weight: 2,
          dashArray: '6,4',
        }}
      />
      {markers.map((emp) => (
        <Marker
          key={emp.tripId}
          position={[emp.lat, emp.lng]}
          icon={icons[emp.tripId]}
        >
          <Popup>
            <div style={{ fontSize: 13, minWidth: 148, lineHeight: 1.5 }}>
              <strong style={{ display: 'block', marginBottom: 3, fontSize: 14 }}>{emp.name}</strong>
              <span style={{ color: markerColor(emp.lastUpdatedAt), fontWeight: 700 }}>
                ● {markerStatus(emp.lastUpdatedAt)}
              </span>
              <br />
              <span style={{ color: '#64748b', fontSize: 11.5 }}>
                Last update: {new Date(emp.lastUpdatedAt).toLocaleTimeString()}
              </span>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

const PRIVILEGED_ROLES = new Set(['super_admin', 'admin', 'manager', 'hr']);

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liveMarkers, setLiveMarkers] = useState([]);
  const prevMarkersRef = useRef(null);
  const intervalRef = useRef(null);
  const role = localStorage.getItem('role') || 'employee';
  const isAdmin = PRIVILEGED_ROLES.has(role);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = isAdmin ? await getAdminDashboard() : await getMyDashboard();
        setData(result.data || result);
      } catch (err) {
        setError(err?.message || 'Unable to load dashboard.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;

    const fetchLive = async () => {
      try {
        const res = await getLiveTracking();
        const fresh = res.data?.logs ?? [];
        const serialized = JSON.stringify(fresh);
        if (serialized !== prevMarkersRef.current) {
          prevMarkersRef.current = serialized;
          setLiveMarkers(fresh);
        }
      } catch {
        // silent — live feed failure must not break the dashboard
      }
    };

    fetchLive();
    intervalRef.current = setInterval(fetchLive, 5_000);
    return () => clearInterval(intervalRef.current);
  }, [isAdmin]);

  return (
    <div className="page page-dashboard">
      <div className="page-header">
        <div>
          <h1 className="page-title">{isAdmin ? 'Admin Dashboard' : 'My Dashboard'}</h1>
          <p className="page-description">
            {isAdmin
              ? 'Overview of employees, attendance, claims and active field trips.'
              : 'Your attendance summary, claims and leave balance.'}
          </p>
        </div>
      </div>

      {loading && <div className="page-message">Loading dashboard…</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {data && isAdmin && (
        <div className="grid cards-grid">
          <div className="card stat-card blue">
            <span className="stat-label">Total Employees</span>
            <span className="stat-value">{data.totalEmployees ?? 0}</span>
          </div>
          <div className="card stat-card green">
            <span className="stat-label">Present Today</span>
            <span className="stat-value">{data.presentToday ?? 0}</span>
          </div>
          <div className="card stat-card amber">
            <span className="stat-label">Pending Claims</span>
            <span className="stat-value">{data.pendingClaims ?? 0}</span>
          </div>
          <div className="card stat-card purple">
            <span className="stat-label">Active Trips</span>
            <span className="stat-value">{data.activeTrips ?? 0}</span>
          </div>
          <div className="card stat-card red">
            <span className="stat-label">Idle Employees</span>
            <span className="stat-value">{data.idleEmployees ?? 0}</span>
          </div>
        </div>
      )}

      {data && !isAdmin && (
        <div className="grid cards-grid">
          <div className="card stat-card sky">
            <span className="stat-label">Today's Status</span>
            <span className="stat-value" style={{ fontSize: '18px', letterSpacing: '-0.5px' }}>
              {data.attendanceToday?.status ?? 'Not checked in'}
            </span>
          </div>
          <div className="card stat-card green">
            <span className="stat-label">Hours Worked Today</span>
            <span className="stat-value">
              {data.totalHoursWorkedToday
                ? `${data.totalHoursWorkedToday.hours}h ${data.totalHoursWorkedToday.minutes}m`
                : '0h 0m'}
            </span>
          </div>
          <div className="card stat-card amber">
            <span className="stat-label">Pending Claims</span>
            <span className="stat-value">{data.pendingClaims ?? 0}</span>
          </div>
          <div className="card stat-card purple">
            <span className="stat-label">Leave Balance</span>
            <span className="stat-value">
              {data.leaveBalance ? `${data.leaveBalance.remaining}/${data.leaveBalance.total}` : '—'}
            </span>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>Live Field Map</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
                {liveMarkers.length === 0
                  ? 'No active field trips right now'
                  : `${liveMarkers.length} active trip${liveMarkers.length > 1 ? 's' : ''} · updates every 5s`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#475569' }}>
              <span>🟢 Active</span>
              <span>🟠 Idle</span>
              <span>🔴 Offline</span>
            </div>
          </div>
          <div style={{ height: 400 }}>
            <LiveMap markers={liveMarkers} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
