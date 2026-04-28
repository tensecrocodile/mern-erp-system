import { useState, useEffect } from 'react';
import { applyLeave, getMyLeaves } from '../services/leavesApi';

const TODAY = new Date().toISOString().split('T')[0];

const STATUS_TAG = {
  approved:        'tag-approved',
  rejected:        'tag-rejected',
  pending_manager: 'tag-pending',
  pending_hr:      'tag-pending',
};

const STATUS_LABEL = {
  approved:        'Approved',
  rejected:        'Rejected',
  pending_manager: 'Awaiting Manager',
  pending_hr:      'Awaiting HR',
};

const LEAVE_TYPES = [
  { value: 'casual', label: 'Casual Leave' },
  { value: 'sick',   label: 'Sick Leave' },
  { value: 'earned', label: 'Earned Leave' },
  { value: 'other',  label: 'Other' },
];

function countDays(start, end) {
  if (!start || !end) return 0;
  const diff = (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24);
  return diff >= 0 ? diff + 1 : 0;
}

const EMPTY_FORM = { type: 'casual', startDate: '', endDate: '', reason: '' };

const Leaves = () => {
  const [leaves, setLeaves]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [success, setSuccess]       = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getMyLeaves();
        setLeaves(result.data?.leaves || result.data || []);
      } catch (err) {
        setError(err?.message || 'Unable to load leave history.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 4000);
    return () => clearTimeout(t);
  }, [success]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => {
      const next = { ...f, [name]: value };
      // Keep endDate >= startDate when startDate changes
      if (name === 'startDate' && next.endDate && next.endDate < value) {
        next.endDate = value;
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.startDate)                  { setError('Select a start date.'); return; }
    if (!form.endDate)                    { setError('Select an end date.'); return; }
    if (form.startDate < TODAY)           { setError('Start date must be today or later.'); return; }
    if (form.endDate < form.startDate)    { setError('End date cannot be before start date.'); return; }
    if (!form.reason.trim())              { setError('Please provide a reason.'); return; }

    setSubmitting(true);
    try {
      const result = await applyLeave({
        type:      form.type,
        startDate: form.startDate,
        endDate:   form.endDate,
        reason:    form.reason,
      });
      const days = countDays(form.startDate, form.endDate);
      setSuccess(`Leave request submitted for ${days} day${days !== 1 ? 's' : ''}. Awaiting manager approval.`);
      setLeaves((l) => [(result.data?.leave || result.data || result), ...l]);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err?.message || 'Unable to apply for leave.');
    } finally {
      setSubmitting(false);
    }
  };

  const days = countDays(form.startDate, form.endDate);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Leave Requests</h1>
          <p className="page-description">Apply for leave and track approval status.</p>
        </div>
        <span className="tag tag-secondary">{leaves.length} total</span>
      </div>

      {/* Form */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Apply for Leave</h2>
          <p className="card-subtitle">Requests require manager approval. Plan ahead — apply at least a day in advance.</p>
        </div>

        {error   && <div className="alert alert-error"   role="alert">{error}</div>}
        {success && <div className="alert alert-success" role="status">{success}</div>}

        <form className="claim-form" onSubmit={handleSubmit}>
          <label className="form-label">
            Leave Type
            <select name="type" className="form-input" value={form.type} onChange={handleChange}>
              {LEAVE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>

          <div className="form-row-2">
            <label className="form-label">
              Start Date
              <input
                name="startDate"
                type="date"
                className="form-input"
                value={form.startDate}
                onChange={handleChange}
                min={TODAY}
                required
              />
              <span className="form-hint">Today or later only.</span>
            </label>

            <label className="form-label">
              End Date
              <input
                name="endDate"
                type="date"
                className="form-input"
                value={form.endDate}
                onChange={handleChange}
                min={form.startDate || TODAY}
                required
              />
              {days > 0 && (
                <span className="form-hint form-hint--info">
                  {days} day{days !== 1 ? 's' : ''}
                </span>
              )}
            </label>
          </div>

          <label className="form-label">
            Reason
            <textarea
              name="reason"
              className="form-input"
              rows="3"
              value={form.reason}
              onChange={handleChange}
              placeholder="Briefly describe your reason for leave…"
              required
            />
          </label>

          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Apply for Leave'}
            </button>
          </div>
        </form>
      </div>

      {/* History */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Leave History</h2>
        </div>

        {loading && (
          <div className="skeleton-list">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton-item" />)}
          </div>
        )}

        {!loading && leaves.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🗓️</div>
            <div className="empty-state-title">No leave requests</div>
            <div className="empty-state-sub">Your leave history will appear here once you apply.</div>
          </div>
        )}

        {!loading && leaves.length > 0 && (
          <div className="list-grid">
            {leaves.map((leave) => {
              const d = countDays(leave.startDate, leave.endDate);
              return (
                <div key={leave._id || `${leave.startDate}-${leave.endDate}`} className="list-item">
                  <div className="list-row">
                    <div className="list-item-main">
                      <span className="list-title">
                        {LEAVE_TYPES.find((t) => t.value === leave.type)?.label || leave.type}
                      </span>
                      <span className="list-meta">
                        {new Date(leave.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        {' → '}
                        {new Date(leave.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' · '}
                        {d} day{d !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <span className={`tag ${STATUS_TAG[leave.status] || 'tag-pending'}`}>
                      {STATUS_LABEL[leave.status] || leave.status || 'Pending'}
                    </span>
                  </div>
                  {leave.reason && <p className="list-desc">{leave.reason}</p>}
                  {leave.reviewComment && (
                    <p className="list-desc" style={{ fontStyle: 'italic', color: 'var(--subtle)' }}>
                      Comment: "{leave.reviewComment}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaves;
