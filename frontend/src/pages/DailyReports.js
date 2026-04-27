import { useState, useEffect, useCallback } from 'react';
import { submitDailyReport, getMyReports } from '../services/dailyReportsApi';

const EMPTY_PLANNED = { description: '', clientOrLocation: '', expectedTime: '' };
const EMPTY_ACTIVITY = { description: '', clientOrLocation: '', outcome: '' };

const DailyReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [workDate, setWorkDate] = useState(new Date().toISOString().slice(0, 10));
  const [plannedItems, setPlannedItems] = useState([{ ...EMPTY_PLANNED }]);
  const [activityItems, setActivityItems] = useState([{ ...EMPTY_ACTIVITY }]);
  const [notes, setNotes] = useState('');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyReports();
      setReports(res.data?.reports || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const updatePlanned = (i, field, val) =>
    setPlannedItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const updateActivity = (i, field, val) =>
    setActivityItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const addPlanned = () => setPlannedItems((p) => [...p, { ...EMPTY_PLANNED }]);
  const removePlanned = (i) => setPlannedItems((p) => p.filter((_, idx) => idx !== i));

  const addActivity = () => setActivityItems((p) => [...p, { ...EMPTY_ACTIVITY }]);
  const removeActivity = (i) => setActivityItems((p) => p.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const validPlanned = plannedItems.filter((p) => p.description.trim());
    const validActivity = activityItems.filter((a) => a.description.trim());

    if (validPlanned.length === 0 && validActivity.length === 0) {
      setError('Add at least one planned or activity item.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitDailyReport({
        workDate,
        plannedItems: validPlanned,
        activityItems: validActivity,
        notes,
      });
      setSuccess('Daily report submitted successfully.');
      const saved = res.data?.report;
      setReports((prev) => {
        const existing = prev.findIndex((r) => r.workDate?.slice(0, 10) === workDate);
        if (existing >= 0) {
          const next = [...prev];
          next[existing] = saved;
          return next;
        }
        return [saved, ...prev];
      });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Unable to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Daily Reports</h1>
          <p className="page-description">Submit your planned schedule and end-of-day activity report.</p>
        </div>
      </div>

      <div className="card form-card">
        <h2 className="section-title">Submit Report</h2>

        {error && <div className="alert alert-error" style={{ marginBottom: 14 }}>{error}</div>}
        {success && <div className="alert alert-success" style={{ marginBottom: 14 }}>{success}</div>}

        <form onSubmit={handleSubmit}>
          <label className="form-label" style={{ maxWidth: 240, marginBottom: 20 }}>
            Work Date
            <input
              type="date"
              className="form-input"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              required
            />
          </label>

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <h3 className="section-title" style={{ margin: 0 }}>Planned Schedule</h3>
              <button type="button" className="btn btn-secondary" style={{ padding: '3px 10px', fontSize: 12 }} onClick={addPlanned}>+ Add</button>
            </div>
            {plannedItems.map((item, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'flex-end' }}>
                <label className="form-label" style={{ margin: 0 }}>
                  {i === 0 && <span style={{ fontSize: 11, color: '#64748b' }}>Description</span>}
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Visit XYZ client"
                    value={item.description}
                    onChange={(e) => updatePlanned(i, 'description', e.target.value)}
                  />
                </label>
                <label className="form-label" style={{ margin: 0 }}>
                  {i === 0 && <span style={{ fontSize: 11, color: '#64748b' }}>Client / Location</span>}
                  <input
                    type="text"
                    className="form-input"
                    placeholder="ABC Corp, Mumbai"
                    value={item.clientOrLocation}
                    onChange={(e) => updatePlanned(i, 'clientOrLocation', e.target.value)}
                  />
                </label>
                <label className="form-label" style={{ margin: 0 }}>
                  {i === 0 && <span style={{ fontSize: 11, color: '#64748b' }}>Expected Time</span>}
                  <input
                    type="text"
                    className="form-input"
                    placeholder="10:00 AM"
                    value={item.expectedTime}
                    onChange={(e) => updatePlanned(i, 'expectedTime', e.target.value)}
                  />
                </label>
                {plannedItems.length > 1 && (
                  <button type="button" className="btn btn-secondary" style={{ padding: '6px 10px', height: 40, color: '#ef4444', borderColor: '#fecaca' }} onClick={() => removePlanned(i)}>✕</button>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <h3 className="section-title" style={{ margin: 0 }}>Activity Report</h3>
              <button type="button" className="btn btn-secondary" style={{ padding: '3px 10px', fontSize: 12 }} onClick={addActivity}>+ Add</button>
            </div>
            {activityItems.map((item, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr auto', gap: 8, marginBottom: 8, alignItems: 'flex-end' }}>
                <label className="form-label" style={{ margin: 0 }}>
                  {i === 0 && <span style={{ fontSize: 11, color: '#64748b' }}>Description</span>}
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Visited XYZ client"
                    value={item.description}
                    onChange={(e) => updateActivity(i, 'description', e.target.value)}
                  />
                </label>
                <label className="form-label" style={{ margin: 0 }}>
                  {i === 0 && <span style={{ fontSize: 11, color: '#64748b' }}>Client / Location</span>}
                  <input
                    type="text"
                    className="form-input"
                    placeholder="ABC Corp"
                    value={item.clientOrLocation}
                    onChange={(e) => updateActivity(i, 'clientOrLocation', e.target.value)}
                  />
                </label>
                <label className="form-label" style={{ margin: 0 }}>
                  {i === 0 && <span style={{ fontSize: 11, color: '#64748b' }}>Outcome</span>}
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Order placed"
                    value={item.outcome}
                    onChange={(e) => updateActivity(i, 'outcome', e.target.value)}
                  />
                </label>
                {activityItems.length > 1 && (
                  <button type="button" className="btn btn-secondary" style={{ padding: '6px 10px', height: 40, color: '#ef4444', borderColor: '#fecaca' }} onClick={() => removeActivity(i)}>✕</button>
                )}
              </div>
            ))}
          </div>

          <label className="form-label" style={{ marginBottom: 16 }}>
            Additional Notes
            <textarea
              className="form-input"
              rows="3"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional observations or remarks…"
            />
          </label>

          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Report'}
          </button>
        </form>
      </div>

      <div className="card list-card">
        <h2 className="section-title">My Reports</h2>
        {loading ? (
          <div className="page-message">Loading reports…</div>
        ) : reports.length === 0 ? (
          <div className="page-message">No reports submitted yet.</div>
        ) : (
          <div className="list-grid">
            {reports.map((r) => (
              <div key={r._id} className="list-item">
                <div className="list-row">
                  <span className="list-title">{new Date(r.workDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {r.plannedItems?.length || 0} planned · {r.activityItems?.length || 0} activities
                  </span>
                </div>
                {r.plannedItems?.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: 4 }}>Planned</div>
                    {r.plannedItems.map((p, i) => (
                      <div key={i} className="list-desc" style={{ margin: '2px 0' }}>
                        • {p.description}{p.clientOrLocation ? ` — ${p.clientOrLocation}` : ''}{p.expectedTime ? ` @ ${p.expectedTime}` : ''}
                      </div>
                    ))}
                  </div>
                )}
                {r.activityItems?.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: 4 }}>Activities</div>
                    {r.activityItems.map((a, i) => (
                      <div key={i} className="list-desc" style={{ margin: '2px 0' }}>
                        • {a.description}{a.clientOrLocation ? ` — ${a.clientOrLocation}` : ''}{a.outcome ? ` → ${a.outcome}` : ''}
                      </div>
                    ))}
                  </div>
                )}
                {r.notes && <p className="list-desc muted" style={{ marginTop: 6 }}>{r.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyReports;
