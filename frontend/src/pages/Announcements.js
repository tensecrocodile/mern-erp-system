import { useState, useEffect, useCallback } from 'react';
import {
  getAnnouncements,
  createAnnouncement,
  publishAnnouncement,
  deleteAnnouncement,
} from '../services/announcementsApi';

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All Employees' },
  { value: 'field', label: 'Field' },
  { value: 'office', label: 'Office' },
  { value: 'remote', label: 'Remote' },
];

const Announcements = () => {
  const role = localStorage.getItem('role');
  const isPrivileged = ['super_admin', 'admin', 'hr', 'manager'].includes(role);

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    body: '',
    targetAudience: 'all',
    attachmentUrl: '',
    scheduledFor: '',
    isDraft: false,
  });

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAnnouncements();
      setAnnouncements(res.data?.announcements || []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load announcements.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        body: form.body,
        targetAudience: form.targetAudience,
        isDraft: form.isDraft,
        attachmentUrl: form.attachmentUrl || undefined,
        scheduledFor: form.scheduledFor || undefined,
      };
      const res = await createAnnouncement(payload);
      const saved = res.data?.announcement;
      setAnnouncements((prev) => [saved, ...prev]);
      setSuccess(form.isDraft ? 'Draft saved.' : 'Announcement published to all recipients.');
      setForm({ title: '', body: '', targetAudience: 'all', attachmentUrl: '', scheduledFor: '', isDraft: false });
      setShowForm(false);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Unable to create announcement.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async (id) => {
    try {
      const res = await publishAnnouncement(id);
      const updated = res.data?.announcement;
      setAnnouncements((prev) => prev.map((a) => (a._id === id ? updated : a)));
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Unable to publish.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((a) => a._id !== id));
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Unable to delete.');
    }
  };

  const audienceLabel = (a) => AUDIENCE_OPTIONS.find((o) => o.value === a)?.label || a;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Announcements</h1>
          <p className="page-description">Company-wide messages and updates.</p>
        </div>
        {isPrivileged && (
          <button className="btn btn-primary" onClick={() => setShowForm((p) => !p)}>
            {showForm ? 'Cancel' : '+ New Announcement'}
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {isPrivileged && showForm && (
        <div className="card form-card">
          <h2 className="section-title">Create Announcement</h2>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="form-label full-width">
              Title
              <input
                name="title"
                type="text"
                className="form-input"
                value={form.title}
                onChange={handleChange}
                placeholder="Q1 Results, Holiday notice…"
                required
                maxLength={200}
              />
            </label>
            <label className="form-label full-width">
              Message
              <textarea
                name="body"
                className="form-input"
                rows="5"
                value={form.body}
                onChange={handleChange}
                placeholder="Full announcement text…"
                required
                maxLength={5000}
              />
            </label>
            <label className="form-label">
              Audience
              <select name="targetAudience" className="form-input" value={form.targetAudience} onChange={handleChange}>
                {AUDIENCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className="form-label">
              Schedule For (optional)
              <input
                name="scheduledFor"
                type="datetime-local"
                className="form-input"
                value={form.scheduledFor}
                onChange={handleChange}
              />
            </label>
            <label className="form-label full-width">
              Attachment URL (optional)
              <input
                name="attachmentUrl"
                type="url"
                className="form-input"
                value={form.attachmentUrl}
                onChange={handleChange}
                placeholder="https://..."
              />
            </label>
            <label className="form-label" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <input
                name="isDraft"
                type="checkbox"
                checked={form.isDraft}
                onChange={handleChange}
                style={{ width: 16, height: 16 }}
              />
              Save as draft (publish later)
            </label>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : form.isDraft ? 'Save Draft' : 'Publish Now'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="page-message">Loading announcements…</div>
      ) : announcements.length === 0 ? (
        <div className="card list-card">
          <div className="page-message">No announcements yet.</div>
        </div>
      ) : (
        <div className="card list-card">
          <div className="list-grid">
            {announcements.map((a) => (
              <div
                key={a._id}
                className="list-item"
                style={{
                  borderLeft: a.isDraft ? '3px solid #94a3b8' : a.publishedAt ? '3px solid #6366f1' : '3px solid #f59e0b',
                }}
              >
                <div className="list-row">
                  <span className="list-title">{a.title}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {a.isDraft && <span className="tag tag-pending">Draft</span>}
                    {!a.isDraft && !a.publishedAt && <span className="tag tag-optional">Scheduled</span>}
                    {a.publishedAt && <span className="tag tag-company">Published</span>}
                    <span className="tag tag-custom">{audienceLabel(a.targetAudience)}</span>
                  </div>
                </div>
                <p className="list-desc" style={{ margin: '8px 0', whiteSpace: 'pre-wrap' }}>{a.body}</p>
                <div className="list-row muted" style={{ marginTop: 6 }}>
                  <span>By {a.createdBy?.fullName || 'Admin'}</span>
                  <span>
                    {a.publishedAt
                      ? `Published ${new Date(a.publishedAt).toLocaleString()}`
                      : a.scheduledFor
                      ? `Scheduled for ${new Date(a.scheduledFor).toLocaleString()}`
                      : `Created ${new Date(a.createdAt).toLocaleString()}`}
                  </span>
                </div>
                {a.attachmentUrl && (
                  <a href={a.attachmentUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#6366f1' }}>
                    View Attachment
                  </a>
                )}
                {isPrivileged && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    {!a.publishedAt && (
                      <button
                        className="btn btn-primary"
                        style={{ padding: '4px 12px', fontSize: 12 }}
                        onClick={() => handlePublish(a._id)}
                      >
                        Publish Now
                      </button>
                    )}
                    {['super_admin', 'admin'].includes(role) && (
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 12px', fontSize: 12, color: '#ef4444', borderColor: '#fecaca' }}
                        onClick={() => handleDelete(a._id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Announcements;
