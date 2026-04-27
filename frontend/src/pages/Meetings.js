import { useState, useEffect, useCallback } from 'react';
import { createMeeting, getMyMeetings } from '../services/meetingsApi';

const Meetings = () => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    clientName: '',
    purpose: '',
    notes: '',
    outcome: '',
    nextActionDate: '',
    tripId: '',
    lat: '',
    lng: '',
  });

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyMeetings();
      setMeetings(res.data?.meetings || []);
    } catch (err) {
      setError(err?.message || 'Unable to load meetings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        }));
        setLocating(false);
      },
      () => {
        setError('Unable to get location. Enter coordinates manually.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const lat = Number(form.lat);
    const lng = Number(form.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError('Valid location coordinates are required. Use GPS or enter manually.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createMeeting({
        clientName: form.clientName,
        purpose: form.purpose,
        notes: form.notes || undefined,
        outcome: form.outcome || undefined,
        nextActionDate: form.nextActionDate || undefined,
        tripId: form.tripId || undefined,
        location: { lat, lng },
      });
      setSuccess('Meeting logged successfully.');
      setMeetings((prev) => [res.data?.meeting || res.data, ...prev]);
      setForm({ clientName: '', purpose: '', notes: '', outcome: '', nextActionDate: '', tripId: '', lat: '', lng: '' });
    } catch (err) {
      setError(err?.message || 'Unable to log meeting.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Meetings</h1>
          <p className="page-description">Log client visits and field meetings.</p>
        </div>
      </div>

      <div className="card form-card">
        <h2 className="section-title">Log a Meeting</h2>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="form-label">
            Client Name
            <input
              name="clientName"
              type="text"
              className="form-input"
              value={form.clientName}
              onChange={handleChange}
              placeholder="ABC Corp"
              required
            />
          </label>
          <label className="form-label">
            Next Action Date
            <input
              name="nextActionDate"
              type="date"
              className="form-input"
              value={form.nextActionDate}
              onChange={handleChange}
            />
          </label>
          <label className="form-label full-width">
            Purpose
            <input
              name="purpose"
              type="text"
              className="form-input"
              value={form.purpose}
              onChange={handleChange}
              placeholder="Sales pitch, follow-up, demo…"
              required
            />
          </label>
          <label className="form-label full-width">
            Notes
            <textarea
              name="notes"
              className="form-input"
              rows="3"
              value={form.notes}
              onChange={handleChange}
              placeholder="Key discussion points…"
            />
          </label>
          <label className="form-label full-width">
            Outcome
            <textarea
              name="outcome"
              className="form-input"
              rows="3"
              value={form.outcome}
              onChange={handleChange}
              placeholder="What was agreed or achieved?"
            />
          </label>

          <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'flex-end' }}>
            <label className="form-label">
              Latitude
              <input
                name="lat"
                type="number"
                className="form-input"
                step="any"
                value={form.lat}
                onChange={handleChange}
                placeholder="28.6139"
                required
              />
            </label>
            <label className="form-label">
              Longitude
              <input
                name="lng"
                type="number"
                className="form-input"
                step="any"
                value={form.lng}
                onChange={handleChange}
                placeholder="77.2090"
                required
              />
            </label>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleGetLocation}
              disabled={locating}
              style={{ height: 40 }}
            >
              {locating ? 'Locating…' : '📍 Use GPS'}
            </button>
          </div>

          <label className="form-label full-width">
            Trip ID (optional)
            <input
              name="tripId"
              type="text"
              className="form-input"
              value={form.tripId}
              onChange={handleChange}
              placeholder="Linked trip ObjectId"
            />
          </label>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Log Meeting'}
          </button>
        </form>
      </div>

      <div className="card list-card">
        <h2 className="section-title">My Meetings</h2>
        {loading ? (
          <div className="page-message">Loading meetings…</div>
        ) : meetings.length === 0 ? (
          <div className="page-message">No meetings logged yet.</div>
        ) : (
          <div className="list-grid">
            {meetings.map((m) => (
              <div key={m._id} className="list-item">
                <div className="list-row">
                  <span className="list-title">{m.clientName}</span>
                  {m.nextActionDate && (
                    <span className="tag tag-primary">
                      Follow-up {new Date(m.nextActionDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="list-desc">{m.purpose}</p>
                {m.outcome && (
                  <p className="list-desc" style={{ color: '#475569' }}>
                    Outcome: {m.outcome}
                  </p>
                )}
                <div className="list-row muted">
                  <span>
                    {m.location?.address ||
                      `${Number(m.location?.lat).toFixed(4)}, ${Number(m.location?.lng).toFixed(4)}`}
                  </span>
                  <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Meetings;
