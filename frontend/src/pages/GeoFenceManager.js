import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapContainer,
  TileLayer,
  Circle,
  Polygon,
  Marker,
  Popup,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './GeoFenceManager.css';
import {
  getGeofences,
  createGeofence,
  updateGeofence,
  deleteGeofence,
  assignGeofenceUsers,
} from '../services/geoFenceApi';
import { getEmployees } from '../services/usersApi';

// ── Constants ──────────────────────────────────────────────────
const ADMIN_ROLES = new Set(['super_admin', 'admin']);
const DEFAULT_CENTER = [28.6139, 77.209];
const DEFAULT_ZOOM = 12;
const FENCE_PALETTE = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444',
  '#a855f7', '#0ea5e9', '#ec4899', '#14b8a6',
];

function fenceColor(fence, index) {
  if (fence.color && fence.color !== '#6366f1') return fence.color;
  return FENCE_PALETTE[index % FENCE_PALETTE.length];
}

function polygonBounds(polygon) {
  return L.latLngBounds(polygon.map((p) => [p.lat, p.lng]));
}

function circleBounds(fence) {
  return L.circle([fence.center.latitude, fence.center.longitude], {
    radius: fence.radius,
  }).getBounds();
}

// ── Point marker icon ──────────────────────────────────────────
function dotIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="width:10px;height:10px;background:${color};border:2.5px solid #fff;border-radius:50%;box-shadow:0 0 0 2px ${color}66,0 2px 4px rgba(0,0,0,.3)"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
}

// ── Map controller ─────────────────────────────────────────────
const MapController = ({ drawMode, onMapClick, onMapDblClick, mapRef }) => {
  const map = useMap();

  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);

  useMapEvents({
    click: (e) => {
      if (drawMode) onMapClick(e.latlng);
    },
    dblclick: (e) => {
      if (drawMode === 'polygon') {
        e.originalEvent.preventDefault();
        onMapDblClick();
      }
    },
  });

  return null;
};

// ── Existing fence layer ───────────────────────────────────────
const FenceLayer = ({ fence, color, visible, onEdit, onDelete }) => {
  if (!visible) return null;

  const pathOptions = {
    color,
    fillColor: color,
    fillOpacity: 0.12,
    weight: 2.5,
  };

  const popup = (
    <Popup minWidth={180}>
      <div className="gfm-popup">
        <strong className="gfm-popup-name">{fence.name}</strong>
        <span className="gfm-popup-meta">
          {fence.type === 'circle'
            ? `Circle · ${fence.radius}m radius`
            : `Polygon · ${fence.polygon?.length || 0} points`}
        </span>
        <span
          className="gfm-popup-status"
          style={{ color: fence.isActive ? '#22c55e' : '#94a3b8' }}
        >
          {fence.isActive ? '● Active' : '○ Inactive'}
        </span>
        <div className="gfm-popup-actions">
          <button
            className="gfm-popup-btn gfm-popup-btn--edit"
            onClick={() => onEdit(fence)}
          >
            Edit
          </button>
          <button
            className="gfm-popup-btn gfm-popup-btn--delete"
            onClick={() => onDelete(fence._id)}
          >
            Delete
          </button>
        </div>
      </div>
    </Popup>
  );

  if (fence.type === 'polygon' && fence.polygon?.length >= 3) {
    return (
      <Polygon positions={fence.polygon.map((p) => [p.lat, p.lng])} pathOptions={pathOptions}>
        {popup}
      </Polygon>
    );
  }

  if (fence.center?.latitude != null) {
    return (
      <Circle
        center={[fence.center.latitude, fence.center.longitude]}
        radius={fence.radius}
        pathOptions={pathOptions}
      >
        {popup}
      </Circle>
    );
  }

  return null;
};

// ── Draft previews ─────────────────────────────────────────────
const DraftCircle = ({ center, radius }) =>
  center ? (
    <Circle
      center={[center.lat, center.lng]}
      radius={radius}
      pathOptions={{ color: '#6366f1', fillColor: '#6366f1', fillOpacity: 0.14, weight: 2, dashArray: '7,5' }}
    />
  ) : null;

const DraftPolygon = ({ points }) =>
  points.length >= 2 ? (
    <Polygon
      positions={points.map((p) => [p.lat, p.lng])}
      pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.14, weight: 2, dashArray: '7,5' }}
    />
  ) : null;

// ── Save / Edit modal ──────────────────────────────────────────
const FenceModal = ({ pending, onSave, onClose, saving }) => {
  const isEdit = !!pending.editFence;
  const fenceType = isEdit ? pending.editFence.type : pending.type;

  const [name, setName] = useState(isEdit ? pending.editFence.name : '');
  const [radius, setRadius] = useState(
    isEdit && fenceType === 'circle' ? pending.editFence.radius : 200
  );
  const [color, setColor] = useState(isEdit ? (pending.editFence.color || '#6366f1') : '#6366f1');
  const [description, setDescription] = useState(isEdit ? (pending.editFence.description || '') : '');
  const [isActive, setIsActive] = useState(isEdit ? pending.editFence.isActive : true);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), radius: Number(radius), color, description: description.trim(), isActive });
  };

  return (
    <div className="gfm-overlay" onClick={onClose}>
      <div className="gfm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gfm-modal-header">
          <div>
            <h3 className="gfm-modal-title">
              {isEdit ? 'Edit Geofence' : `New ${fenceType === 'circle' ? 'Circle' : 'Polygon'} Fence`}
            </h3>
            <span className="tag tag-secondary" style={{ fontSize: 10 }}>
              {fenceType}
            </span>
          </div>
          <button className="gfm-modal-close" onClick={onClose} type="button" aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="gfm-modal-form">
          <label className="form-label">
            Fence Name *
            <input
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. HQ Office Zone"
              maxLength={120}
              required
              autoFocus
            />
          </label>

          {fenceType === 'circle' && (
            <label className="form-label">
              Radius — <strong>{radius}m</strong>
              <input
                type="range"
                min={50}
                max={5000}
                step={50}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                style={{ width: '100%', marginTop: 6 }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
                <span>50m</span>
                <span>5000m</span>
              </div>
            </label>
          )}

          <label className="form-label">
            Description
            <textarea
              className="form-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes about this fence"
              maxLength={300}
            />
          </label>

          <label className="form-label">
            Fence Color
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={{ width: 40, height: 36, padding: 2, border: '1.5px solid #e2e8f0', borderRadius: 6, cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {FENCE_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: c,
                      border: color === c ? '2px solid #0f172a' : '2px solid transparent',
                      cursor: 'pointer',
                    }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
          </label>

          {isEdit && (
            <label className="form-label" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Active
            </label>
          )}

          <div className="gfm-modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || !name.trim()}
            >
              {saving ? 'Saving…' : isEdit ? 'Update Fence' : 'Create Fence'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Assign Users modal ─────────────────────────────────────────
const AssignModal = ({ fence, onClose, onSaved }) => {
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected]   = useState(new Set());
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState(null);

  useEffect(() => {
    // Pre-select already-assigned users
    const preSelected = new Set((fence.assignedTo || []).map((u) => u._id || u));
    setSelected(preSelected);

    getEmployees()
      .then((res) => setEmployees(res.data?.users || []))
      .catch(() => setError('Failed to load employees.'))
      .finally(() => setLoading(false));
  }, [fence]);

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await assignGeofenceUsers(fence._id, [...selected]);
      onSaved(res.data?.geofence);
    } catch (err) {
      setError(err?.message || 'Assignment failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="gfm-overlay" onClick={onClose}>
      <div className="gfm-modal gfm-modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="gfm-modal-header">
          <div>
            <h3 className="gfm-modal-title">Assign Employees</h3>
            <span className="tag tag-secondary" style={{ fontSize: 10 }}>{fence.name}</span>
          </div>
          <button className="gfm-modal-close" onClick={onClose} type="button" aria-label="Close">×</button>
        </div>

        {error && <div className="alert alert-error" style={{ margin: '0 0 12px' }}>{error}</div>}

        {loading ? (
          <div className="skeleton-list" style={{ padding: '4px 0' }}>
            {[1, 2, 3].map((i) => <div key={i} className="skeleton-item" style={{ height: 46 }} />)}
          </div>
        ) : employees.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
            No employees found. Create employees from the HR panel first.
          </p>
        ) : (
          <ul className="assign-user-list">
            {employees.map((emp) => {
              const checked = selected.has(emp._id);
              return (
                <li
                  key={emp._id}
                  className={`assign-user-item${checked ? ' assign-user-item--checked' : ''}`}
                  onClick={() => toggle(emp._id)}
                >
                  <div className="assign-user-avatar">{emp.fullName?.[0]?.toUpperCase() ?? '?'}</div>
                  <div className="assign-user-info">
                    <span className="assign-user-name">{emp.fullName}</span>
                    <span className="assign-user-meta">{emp.email} · {emp.role}</span>
                  </div>
                  <input
                    type="checkbox"
                    readOnly
                    checked={checked}
                    className="assign-user-check"
                  />
                </li>
              );
            })}
          </ul>
        )}

        <div className="gfm-modal-actions" style={{ marginTop: 14 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            {selected.size} selected
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" type="button" onClick={onClose}>Cancel</button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
            >
              {saving ? 'Saving…' : 'Save Assignment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main page ──────────────────────────────────────────────────
const GeoFenceManager = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem('role');
  const mapRef = useRef(null);

  // Guard: admin only
  useEffect(() => {
    if (!ADMIN_ROLES.has(role)) navigate('/dashboard', { replace: true });
  }, [role, navigate]);

  const [fences, setFences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hiddenIds, setHiddenIds] = useState(new Set());

  // Drawing
  const [drawMode, setDrawMode] = useState(null); // null | 'circle' | 'polygon'
  const [draftCircleCenter, setDraftCircleCenter] = useState(null);
  const [draftPolygon, setDraftPolygon] = useState([]);

  // Edit modal
  const [pending, setPending] = useState(null);
  const [saving, setSaving] = useState(false);

  // Assign users modal
  const [assigningFence, setAssigningFence] = useState(null);

  // Fetch fences
  useEffect(() => {
    getGeofences()
      .then((res) => setFences(res.data?.geofences || []))
      .catch((err) => setError(err?.message || 'Failed to load geofences.'))
      .finally(() => setLoading(false));
  }, []);

  // Drawing controls
  const startDraw = useCallback((mode) => {
    setDrawMode((prev) => (prev === mode ? null : mode));
    setDraftCircleCenter(null);
    setDraftPolygon([]);
  }, []);

  const cancelDraw = useCallback(() => {
    setDrawMode(null);
    setDraftCircleCenter(null);
    setDraftPolygon([]);
  }, []);

  const handleMapClick = useCallback(
    (latlng) => {
      if (drawMode === 'circle') {
        setDraftCircleCenter({ lat: latlng.lat, lng: latlng.lng });
        setDrawMode(null);
        setPending({ type: 'circle', center: { lat: latlng.lat, lng: latlng.lng } });
      } else if (drawMode === 'polygon') {
        setDraftPolygon((prev) => [...prev, { lat: latlng.lat, lng: latlng.lng }]);
      }
    },
    [drawMode]
  );

  const handleMapDblClick = useCallback(() => {
    if (drawMode === 'polygon' && draftPolygon.length >= 3) {
      setPending({ type: 'polygon', points: [...draftPolygon] });
      setDrawMode(null);
      setDraftPolygon([]);
    }
  }, [drawMode, draftPolygon]);

  const closePolygon = useCallback(() => {
    if (draftPolygon.length >= 3) {
      setPending({ type: 'polygon', points: [...draftPolygon] });
      setDrawMode(null);
      setDraftPolygon([]);
    }
  }, [draftPolygon]);

  const undoLastPoint = useCallback(() => {
    setDraftPolygon((prev) => prev.slice(0, -1));
  }, []);

  // Save / update fence
  const handleSave = useCallback(
    async ({ name, radius, color, description, isActive }) => {
      setSaving(true);
      try {
        if (pending.editFence) {
          const payload = { name, color, description, isActive };
          if (pending.editFence.type === 'circle') payload.radius = radius;
          const res = await updateGeofence(pending.editFence._id, payload);
          const updated = res.data?.geofence;
          setFences((prev) => prev.map((f) => (f._id === updated._id ? updated : f)));
        } else if (pending.type === 'circle') {
          const res = await createGeofence({
            type: 'circle',
            name,
            color,
            description,
            center: { latitude: pending.center.lat, longitude: pending.center.lng },
            radius,
          });
          setFences((prev) => [res.data?.geofence, ...prev]);
        } else if (pending.type === 'polygon') {
          const res = await createGeofence({
            type: 'polygon',
            name,
            color,
            description,
            polygon: pending.points,
          });
          setFences((prev) => [res.data?.geofence, ...prev]);
        }
        setPending(null);
        setDraftCircleCenter(null);
      } catch (err) {
        setError(err?.message || 'Save failed.');
      } finally {
        setSaving(false);
      }
    },
    [pending]
  );

  const handleEdit = useCallback((fence) => {
    setPending({ type: fence.type, editFence: fence });
  }, []);

  const handleDelete = useCallback(async (fenceId) => {
    if (!window.confirm('Permanently delete this geofence?')) return;
    try {
      await deleteGeofence(fenceId);
      setFences((prev) => prev.filter((f) => f._id !== fenceId));
    } catch (err) {
      setError(err?.message || 'Delete failed.');
    }
  }, []);

  const toggleVisibility = useCallback((fenceId) => {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      next.has(fenceId) ? next.delete(fenceId) : next.add(fenceId);
      return next;
    });
  }, []);

  const zoomToFence = useCallback((fence) => {
    const map = mapRef.current;
    if (!map) return;
    try {
      if (fence.type === 'circle' && fence.center?.latitude != null) {
        map.flyToBounds(circleBounds(fence).pad(0.3), { duration: 0.9 });
      } else if (fence.type === 'polygon' && fence.polygon?.length >= 3) {
        map.flyToBounds(polygonBounds(fence.polygon).pad(0.3), { duration: 0.9 });
      }
    } catch {
      // ignore invalid bounds
    }
  }, []);

  const handleModalClose = useCallback(() => {
    setPending(null);
    setDraftCircleCenter(null);
  }, []);

  const handleAssignSaved = useCallback((updatedFence) => {
    if (updatedFence) {
      setFences((prev) => prev.map((f) => (f._id === updatedFence._id ? updatedFence : f)));
    }
    setAssigningFence(null);
  }, []);

  if (!ADMIN_ROLES.has(role)) return null;

  const isDrawing = drawMode !== null;

  return (
    <div className="gfm-shell">
      {/* ── Left sidebar ── */}
      <aside className="gfm-panel">
        <div className="gfm-panel-header">
          <span className="gfm-panel-title">Geofences</span>
          <span className="tag tag-secondary">{fences.length}</span>
        </div>

        {error && (
          <div className="alert alert-error gfm-alert">
            {error}
            <button
              type="button"
              onClick={() => setError(null)}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 16, lineHeight: 1 }}
            >
              ×
            </button>
          </div>
        )}

        {loading ? (
          <p className="gfm-empty">Loading…</p>
        ) : fences.length === 0 ? (
          <p className="gfm-empty">
            No fences yet.
            <br />
            <span style={{ fontSize: 11, color: '#94a3b8' }}>Use the drawing tools above the map.</span>
          </p>
        ) : (
          <ul className="gfm-list">
            {fences.map((fence, index) => {
              const color = fenceColor(fence, index);
              const hidden = hiddenIds.has(fence._id);
              return (
                <li key={fence._id} className={`gfm-list-item${hidden ? ' gfm-list-item--hidden' : ''}`}>
                  <div className="gfm-list-item-top">
                    <span className="gfm-dot" style={{ background: color }} />
                    <div className="gfm-list-item-info">
                      <span className="gfm-list-item-name">{fence.name}</span>
                      <span className="gfm-list-item-sub">
                        {fence.type === 'circle'
                          ? `● Circle · ${fence.radius}m`
                          : `◈ Polygon · ${fence.polygon?.length || 0} pts`}
                      </span>
                    </div>
                    <span
                      className="gfm-list-item-status"
                      style={{ color: fence.isActive ? '#22c55e' : '#94a3b8' }}
                    >
                      {fence.isActive ? '●' : '○'}
                    </span>
                  </div>
                  <div className="gfm-list-item-actions">
                    <button
                      type="button"
                      className="gfm-action-btn"
                      title="Zoom to fence"
                      onClick={() => zoomToFence(fence)}
                    >
                      ⊕
                    </button>
                    <button
                      type="button"
                      className="gfm-action-btn"
                      title={hidden ? 'Show on map' : 'Hide on map'}
                      onClick={() => toggleVisibility(fence._id)}
                      style={{ opacity: hidden ? 0.35 : 1 }}
                    >
                      ◎
                    </button>
                    <button
                      type="button"
                      className="gfm-action-btn"
                      title="Assign employees"
                      onClick={() => setAssigningFence(fence)}
                    >
                      ◉
                    </button>
                    <button
                      type="button"
                      className="gfm-action-btn"
                      title="Edit"
                      onClick={() => handleEdit(fence)}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="gfm-action-btn gfm-action-btn--danger"
                      title="Delete"
                      onClick={() => handleDelete(fence._id)}
                    >
                      ⊗
                    </button>
                  </div>
                  {(fence.assignedTo?.length > 0) && (
                    <div className="gfm-assigned-badge">
                      {fence.assignedTo.length} assigned
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* ── Map area ── */}
      <div className="gfm-map-area">
        {/* ── Toolbar ── */}
        <div className="gfm-toolbar">
          <div className="gfm-toolbar-left">
            <button
              type="button"
              className={`btn gfm-tool-btn${drawMode === 'circle' ? ' gfm-tool-btn--active' : ''}`}
              onClick={() => startDraw('circle')}
            >
              <span>◉</span> Circle
            </button>
            <button
              type="button"
              className={`btn gfm-tool-btn${drawMode === 'polygon' ? ' gfm-tool-btn--active' : ''}`}
              onClick={() => startDraw('polygon')}
            >
              <span>◈</span> Polygon
            </button>

            {drawMode === 'polygon' && draftPolygon.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary gfm-tool-sm"
                onClick={undoLastPoint}
                title="Remove last point"
              >
                ↩ Undo
              </button>
            )}
            {drawMode === 'polygon' && draftPolygon.length >= 3 && (
              <button
                type="button"
                className="btn btn-success gfm-tool-sm"
                onClick={closePolygon}
              >
                ✓ Finish ({draftPolygon.length} pts)
              </button>
            )}
            {isDrawing && (
              <button type="button" className="btn btn-secondary gfm-tool-sm" onClick={cancelDraw}>
                ✕ Cancel
              </button>
            )}
          </div>

          {isDrawing && (
            <div className="gfm-hint">
              {drawMode === 'circle' && '☞ Click anywhere on the map to place the fence center'}
              {drawMode === 'polygon' &&
                (draftPolygon.length < 3
                  ? `☞ Click to add points (${draftPolygon.length} so far — need ${3 - draftPolygon.length} more)`
                  : `☞ Double-click or press Finish to close the polygon (${draftPolygon.length} pts)`)}
            </div>
          )}
        </div>

        {/* ── Leaflet Map ── */}
        <div className={`gfm-map${isDrawing ? ' gfm-map--crosshair' : ''}`}>
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            scrollWheelZoom
            doubleClickZoom={false}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />

            <MapController
              drawMode={drawMode}
              onMapClick={handleMapClick}
              onMapDblClick={handleMapDblClick}
              mapRef={mapRef}
            />

            {/* Draft: circle preview */}
            {draftCircleCenter && pending?.type === 'circle' && (
              <DraftCircle center={draftCircleCenter} radius={200} />
            )}

            {/* Draft: polygon points + preview shape */}
            {draftPolygon.map((pt, i) => (
              <Marker
                key={i}
                position={[pt.lat, pt.lng]}
                icon={dotIcon(i === 0 ? '#ef4444' : '#f59e0b')}
              />
            ))}
            {draftPolygon.length >= 2 && (
              <DraftPolygon points={draftPolygon} />
            )}

            {/* Saved fences */}
            {fences.map((fence, index) => (
              <FenceLayer
                key={fence._id}
                fence={fence}
                color={fenceColor(fence, index)}
                visible={!hiddenIds.has(fence._id)}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </MapContainer>
        </div>
      </div>

      {/* ── Edit modal ── */}
      {pending && (
        <FenceModal
          pending={pending}
          onSave={handleSave}
          onClose={handleModalClose}
          saving={saving}
        />
      )}

      {/* ── Assign users modal ── */}
      {assigningFence && (
        <AssignModal
          fence={assigningFence}
          onClose={() => setAssigningFence(null)}
          onSaved={handleAssignSaved}
        />
      )}
    </div>
  );
};

export default GeoFenceManager;
