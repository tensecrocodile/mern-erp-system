import { useState, useEffect, useCallback } from 'react';
import { submitClaim, getMyClaims, getAllClaims, reviewClaim } from '../services/claimsApi';
import { useRole, isEmployeeRole } from '../components/common/RoleGuard';

const TODAY = new Date().toISOString().split('T')[0];

const CLAIM_TYPES = [
  { value: 'travel',        label: 'Travel'        },
  { value: 'food',          label: 'Food & Meals'  },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'other',         label: 'Other'         },
];

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

const FILTERS = [
  { key: 'all',             label: 'All'             },
  { key: 'pending_manager', label: 'Pending Manager' },
  { key: 'pending_hr',      label: 'Pending HR'      },
  { key: 'approved',        label: 'Approved'        },
  { key: 'rejected',        label: 'Rejected'        },
];

const formatCurrency = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

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

// ── Review action bar (only shown to eligible reviewer) ────────

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

const EMPTY_FORM = { type: 'travel', amount: '', date: '', description: '' };

const EmployeeClaims = () => {
  const [claims, setClaims]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [success, setSuccess]       = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [dateError, setDateError]   = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getMyClaims();
        setClaims(res.data?.claims || []);
      } catch (err) {
        setError(err?.message || 'Unable to fetch claims.');
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
    if (name === 'date') setDateError(value < TODAY ? 'Select today or a future date.' : null);
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const amount = Number(form.amount);
    if (!amount || amount <= 0)    { setError('Enter a valid claim amount.'); return; }
    if (!form.date)                { setError('Select a date.'); return; }
    if (form.date < TODAY)         { setError('Only today or future dates are accepted.'); return; }
    if (!form.description.trim())  { setError('Add a description.'); return; }

    setSubmitting(true);
    try {
      const res = await submitClaim({ type: form.type, amount, date: form.date, description: form.description, attachments: [] });
      setSuccess("Claim submitted! It's now awaiting manager review.");
      setClaims((c) => [(res.data?.claim || res.data || res), ...c]);
      setForm(EMPTY_FORM);
      setDateError(null);
    } catch (err) {
      setError(err?.message || 'Unable to submit claim.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Claims</h1>
          <p className="page-description">Submit expense reimbursements and track their status.</p>
        </div>
        <span className="tag tag-secondary">{claims.length} total</span>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">New Claim</h2>
          <p className="card-subtitle">All claims require manager then HR approval before reimbursement.</p>
        </div>
        {error   && <div className="alert alert-error"   role="alert">{error}</div>}
        {success && <div className="alert alert-success" role="status">{success}</div>}

        <form className="claim-form" onSubmit={handleSubmit}>
          <div className="form-row-2">
            <label className="form-label">
              Claim Type
              <select name="type" className="form-input" value={form.type} onChange={handleChange}>
                {CLAIM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            <label className="form-label">
              Amount (₹)
              <input name="amount" type="number" step="1" min="1" className="form-input"
                value={form.amount} onChange={handleChange} placeholder="e.g. 1500" required />
            </label>
          </div>
          <label className="form-label">
            Expense Date
            <input name="date" type="date" min={TODAY} required
              className={`form-input${dateError ? ' form-input--error' : ''}`}
              value={form.date} onChange={handleChange} />
            {dateError
              ? <span className="form-hint form-hint--error">{dateError}</span>
              : <span className="form-hint">Only today or future dates are accepted.</span>}
          </label>
          <label className="form-label">
            Description
            <textarea name="description" className="form-input" rows="3"
              value={form.description} onChange={handleChange}
              placeholder="Describe the expense…" required />
          </label>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={submitting || !!dateError}>
              {submitting ? 'Submitting…' : 'Submit Claim'}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-header"><h2 className="card-title">Claim History</h2></div>
        {loading && <div className="skeleton-list">{[1,2,3].map((i) => <div key={i} className="skeleton-item" />)}</div>}
        {!loading && claims.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No claims yet</div>
            <div className="empty-state-sub">Submit your first expense claim above.</div>
          </div>
        )}
        {!loading && claims.length > 0 && (
          <div className="list-grid">
            {claims.map((claim) => (
              <div key={claim._id} className="list-item">
                <div className="list-row">
                  <div className="list-item-main">
                    <span className="list-title">{claim.type?.charAt(0).toUpperCase() + claim.type?.slice(1)}</span>
                    <span className="list-meta">{formatDate(claim.date)}</span>
                  </div>
                  <span className={`tag ${STATUS_TAG[claim.status] || 'tag-pending'}`}>
                    {STATUS_LABEL[claim.status] || 'Pending'}
                  </span>
                </div>
                {claim.description && <p className="list-desc">{claim.description}</p>}
                <div className="list-row">
                  <span className="claim-amount">{formatCurrency(claim.amount)}</span>
                </div>
                <ApprovalTimeline history={claim.approvalHistory} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Management review view ─────────────────────────────────────

const ManagementClaims = () => {
  const role = useRole();
  const [claims, setClaims]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [reviewing, setReviewing] = useState(null);
  const [filter, setFilter]       = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAllClaims();
      setClaims(res.data?.claims || []);
    } catch (err) {
      setError(err?.message || 'Unable to load claims.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleReview = async (id, action, comment = '') => {
    setReviewing(id);
    setError(null);
    try {
      const res = await reviewClaim(id, action, comment);
      const updated = res?.data?.claim;
      setClaims((prev) => prev.map((c) => c._id === id ? (updated || c) : c));
    } catch (err) {
      setError(err?.message || 'Review action failed.');
    } finally {
      setReviewing(null);
    }
  };

  const canReview = (claim) =>
    (role === 'manager' && claim.status === 'pending_manager') ||
    (role === 'hr'      && claim.status === 'pending_hr');

  const countFor = (key) => {
    if (key === 'all') return claims.length;
    return claims.filter((c) => c.status === key).length;
  };

  const visible = filter === 'all' ? claims : claims.filter((c) => c.status === filter);

  const pendingCount = claims.filter(
    (c) => c.status === 'pending_manager' || c.status === 'pending_hr'
  ).length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Claim Requests</h1>
          <p className="page-description">Review and action expense claims submitted by employees.</p>
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
            <div className="empty-state-sub">No claims match the selected filter.</div>
          </div>
        )}

        {!loading && visible.length > 0 && (
          <div className="list-grid">
            {visible.map((claim) => (
              <div key={claim._id} className="list-item">
                <div className="list-row">
                  <div className="list-item-main">
                    <span className="list-title">{claim.userId?.fullName || 'Employee'}</span>
                    <span className="list-meta">
                      {claim.type} · {formatDate(claim.date)}
                    </span>
                  </div>
                  <span className={`tag ${STATUS_TAG[claim.status] || 'tag-pending'}`}>
                    {STATUS_LABEL[claim.status] || claim.status}
                  </span>
                </div>
                {claim.description && <p className="list-desc">{claim.description}</p>}
                <div className="list-row">
                  <span className="claim-amount">{formatCurrency(claim.amount)}</span>
                </div>

                <ApprovalTimeline history={claim.approvalHistory} />

                {canReview(claim) && (
                  <ReviewActions
                    onApprove={(comment) => handleReview(claim._id, 'approve', comment)}
                    onReject={(comment)  => handleReview(claim._id, 'reject',  comment)}
                    busy={reviewing === claim._id}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Root export ────────────────────────────────────────────────

const Claims = () => {
  const role = useRole();
  return isEmployeeRole(role) ? <EmployeeClaims /> : <ManagementClaims />;
};

export default Claims;
