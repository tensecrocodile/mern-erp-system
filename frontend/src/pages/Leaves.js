import { useState, useEffect, useCallback } from 'react';
import { applyLeave, getMyLeaves, getAllLeaves, reviewLeave } from '../services/leavesApi';
import { useRole, isEmployeeRole } from '../components/common/RoleGuard';

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
  { value: 'sick',   label: 'Sick Leave'   },
  { value: 'earned', label: 'Earned Leave' },
  { value: 'other',  label: 'Other'        },
];

const FILTERS = [
  { key: 'all',             label: 'All'             },
  { key: 'pending_manager', label: 'Pending Manager' },
  { key: 'pending_hr',      label: 'Pending HR'      },
  { key: 'approved',        label: 'Approved'        },
  { key: 'rejected',        label: 'Rejected'        },
];

const leaveLabel = (type) => LEAVE_TYPES.find((t) => t.value === type)?.label || type;

function countDays(start, end) {
  if (!start || !end) return 0;
  const diff = (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24);
  return diff >= 0 ? diff + 1 : 0;
}

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const formatTime = (d) =>
  new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// ── Approval timeline ──────────────────────────────────────────

const ApprovalTimeline = ({ history }) => {
  if (!history || history.length === 0) return null;
  return (
    <div className="approval-timeline">
      {history.map((step, i) => (
        <div key={step._id || i} className={`timeline-step timeline-step--${step.action}`}>
          <div className="timeline-dot" />
          <div className="timeline-body">
            <span className="timeline-label">
              {step.role.charAt(0).toUpperCase() + step.role.slice(1)}{' '}
              <strong>{step.action}</strong>
            </span>
            {step.by?.fullName && (
              <span className="timeline-meta">by {step.by.fullName}</span>
            )}
            <span className="timeline-meta">{formatTime(step.timestamp)}</span>
            {step.comment && (
              <span className="timeline-comment">"{step.comment}"</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Review action bar ──────────────────────────────────────────

const ReviewActions = ({ onApprove, onReject, busy }) => {
  const [comment, setComment] = useState('');
  return (
    <div className="review-actions review-actions--col">
      <input
        className="form-input review-comment-input"
        placeholder="Comment (optional, max 500 chars)…"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={500}
        disabled={busy}
      />
      <div className="review-action-btns">
        <button className="btn btn-success btn-sm" onClick={() => onApprove(comment)} disabled={busy}>
          Approve
        </button>
        <button className="btn btn-danger btn-sm" onClick={() => onReject(comment)} disabled={busy}>
          Reject
        </button>
        {busy && <span className="list-meta">Saving…</span>}
      </div>
    </div>
  );
};

// ── Employee view ──────────────────────────────────────────────

const EMPTY_FORM = { type: 'casual', startDate: '', endDate: '', reason: '' };

const EmployeeLeaves = () => {
  const [leaves, setLeaves]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [success, setSuccess]       = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await getMyLeaves();
        setLeaves(res.data?.leaves || res.data || []);
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
      if (name === 'startDate' && next.endDate && next.endDate < value) next.endDate = value;
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!form.startDate)               { setError('Select a start date.'); return; }
    if (!form.endDate)                 { setError('Select an end date.'); return; }
    if (form.startDate < TODAY)        { setError('Start date must be today or later.'); return; }
    if (form.endDate < form.startDate) { setError('End date cannot be before start date.'); return; }
    if (!form.reason.trim())           { setError('Please provide a reason.'); return; }

    setSubmitting(true);
    try {
      const res = await applyLeave({ type: form.type, startDate: form.startDate, endDate: form.endDate, reason: form.reason });
      const days = countDays(form.startDate, form.endDate);
      setSuccess(`Leave request submitted for ${days} day${days !== 1 ? 's' : ''}. Awaiting manager approval.`);
      setLeaves((l) => [(res.data?.leave || res.data || res), ...l]);
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

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Apply for Leave</h2>
          <p className="card-subtitle">Requests go through manager then HR approval.</p>
        </div>
        {error   && <div className="alert alert-error"   role="alert">{error}</div>}
        {success && <div className="alert alert-success" role="status">{success}</div>}

        <form className="claim-form" onSubmit={handleSubmit}>
          <label className="form-label">
            Leave Type
            <select name="type" className="form-input" value={form.type} onChange={handleChange}>
              {LEAVE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <div className="form-row-2">
            <label className="form-label">
              Start Date
              <input name="startDate" type="date" className="form-input"
                value={form.startDate} onChange={handleChange} min={TODAY} required />
              <span className="form-hint">Today or later only.</span>
            </label>
            <label className="form-label">
              End Date
              <input name="endDate" type="date" className="form-input"
                value={form.endDate} onChange={handleChange} min={form.startDate || TODAY} required />
              {days > 0 && <span className="form-hint form-hint--info">{days} day{days !== 1 ? 's' : ''}</span>}
            </label>
          </div>
          <label className="form-label">
            Reason
            <textarea name="reason" className="form-input" rows="3"
              value={form.reason} onChange={handleChange}
              placeholder="Briefly describe your reason for leave…" required />
          </label>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Apply for Leave'}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-header"><h2 className="card-title">Leave History</h2></div>
        {loading && <div className="skeleton-list">{[1,2,3].map((i) => <div key={i} className="skeleton-item" />)}</div>}
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
                <div key={leave._id} className="list-item">
                  <div className="list-row">
                    <div className="list-item-main">
                      <span className="list-title">{leaveLabel(leave.type)}</span>
                      <span className="list-meta">
                        {formatDate(leave.startDate)} → {formatDate(leave.endDate)}
                        {' · '}{d} day{d !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <span className={`tag ${STATUS_TAG[leave.status] || 'tag-pending'}`}>
                      {STATUS_LABEL[leave.status] || 'Pending'}
                    </span>
                  </div>
                  {leave.reason && <p className="list-desc">{leave.reason}</p>}
                  <ApprovalTimeline history={leave.approvalHistory} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Management review view ─────────────────────────────────────

const ManagementLeaves = () => {
  const role = useRole();
  const [leaves, setLeaves]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [reviewing, setReviewing] = useState(null);
  const [filter, setFilter]       = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAllLeaves();
      setLeaves(res.data?.leaves || res.data || []);
    } catch (err) {
      setError(err?.message || 'Unable to load leave requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleReview = async (id, action, comment = '') => {
    setReviewing(id);
    setError(null);
    try {
      const res = await reviewLeave(id, action, comment);
      const updated = res?.data?.leave;
      setLeaves((prev) => prev.map((l) => l._id === id ? (updated || l) : l));
    } catch (err) {
      setError(err?.message || 'Review action failed.');
    } finally {
      setReviewing(null);
    }
  };

  const canReview = (leave) =>
    (role === 'manager' && leave.status === 'pending_manager') ||
    (role === 'hr'      && leave.status === 'pending_hr');

  const countFor = (key) => {
    if (key === 'all') return leaves.length;
    return leaves.filter((l) => l.status === key).length;
  };

  const visible = filter === 'all' ? leaves : leaves.filter((l) => l.status === filter);

  const pendingCount = leaves.filter(
    (l) => l.status === 'pending_manager' || l.status === 'pending_hr'
  ).length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Leave Requests</h1>
          <p className="page-description">Review and action leave requests submitted by employees.</p>
        </div>
        {pendingCount > 0 && <span className="tag tag-pending">{pendingCount} pending</span>}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="card-header">
          <div className="rbac-filter-row">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label} ({countFor(f.key)})
              </button>
            ))}
          </div>
        </div>

        {loading && <div className="skeleton-list">{[1,2,3].map((i) => <div key={i} className="skeleton-item" />)}</div>}

        {!loading && visible.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">✓</div>
            <div className="empty-state-title">Nothing here</div>
            <div className="empty-state-sub">No leave requests match the selected filter.</div>
          </div>
        )}

        {!loading && visible.length > 0 && (
          <div className="list-grid">
            {visible.map((leave) => {
              const d = countDays(leave.startDate, leave.endDate);
              return (
                <div key={leave._id} className="list-item">
                  <div className="list-row">
                    <div className="list-item-main">
                      <span className="list-title">{leave.userId?.fullName || 'Employee'}</span>
                      <span className="list-meta">
                        {leaveLabel(leave.type)} · {d} day{d !== 1 ? 's' : ''} ·{' '}
                        {formatDate(leave.startDate)} → {formatDate(leave.endDate)}
                      </span>
                    </div>
                    <span className={`tag ${STATUS_TAG[leave.status] || 'tag-pending'}`}>
                      {STATUS_LABEL[leave.status] || leave.status}
                    </span>
                  </div>
                  {leave.reason && <p className="list-desc">{leave.reason}</p>}

                  <ApprovalTimeline history={leave.approvalHistory} />

                  {canReview(leave) && (
                    <ReviewActions
                      onApprove={(comment) => handleReview(leave._id, 'approve', comment)}
                      onReject={(comment)  => handleReview(leave._id, 'reject',  comment)}
                      busy={reviewing === leave._id}
                    />
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

// ── Root export ────────────────────────────────────────────────

const Leaves = () => {
  const role = useRole();
  return isEmployeeRole(role) ? <EmployeeLeaves /> : <ManagementLeaves />;
};

export default Leaves;
