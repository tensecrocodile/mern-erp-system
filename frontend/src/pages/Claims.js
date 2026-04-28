import { useState, useEffect } from 'react';
import { submitClaim, getMyClaims } from '../services/claimsApi';

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

const CLAIM_TYPES = [
  { value: 'travel',        label: 'Travel' },
  { value: 'food',          label: 'Food & Meals' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'other',         label: 'Other' },
];

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

const EMPTY_FORM = { type: 'travel', amount: '', date: '', description: '' };

const Claims = () => {
  const [claims, setClaims]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [success, setSuccess]     = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [dateError, setDateError] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getMyClaims();
        setClaims(result.data?.claims || []);
      } catch (err) {
        setError(err?.message || 'Unable to fetch claims.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Auto-dismiss success after 4s
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 4000);
    return () => clearTimeout(t);
  }, [success]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'date') {
      setDateError(value < TODAY ? 'Select today or a future date.' : null);
    }
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const amount = Number(form.amount);
    if (!amount || amount <= 0) { setError('Enter a valid claim amount.'); return; }
    if (!form.date)             { setError('Select a date.'); return; }
    if (form.date < TODAY)      { setError('You can only submit claims for today or future dates.'); return; }
    if (!form.description.trim()) { setError('Add a description.'); return; }

    setSubmitting(true);
    try {
      const result = await submitClaim({
        type: form.type,
        amount,
        date: form.date,
        description: form.description,
        attachments: [],
      });
      setSuccess('Claim submitted successfully! It\'s now awaiting manager review.');
      setClaims((c) => [(result.data?.claim || result.data || result), ...c]);
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
          <h1 className="page-title">Claims</h1>
          <p className="page-description">Submit expense reimbursements and track their status.</p>
        </div>
        <div className="page-header-meta">
          <span className="tag tag-secondary">{claims.length} total</span>
        </div>
      </div>

      {/* Form */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">New Claim</h2>
          <p className="card-subtitle">All claims require manager approval before reimbursement.</p>
        </div>

        {error   && <div className="alert alert-error"   role="alert">{error}</div>}
        {success && <div className="alert alert-success" role="status">{success}</div>}

        <form className="claim-form" onSubmit={handleSubmit}>
          <div className="form-row-2">
            <label className="form-label">
              Claim Type
              <select name="type" className="form-input" value={form.type} onChange={handleChange}>
                {CLAIM_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>

            <label className="form-label">
              Amount (₹)
              <input
                name="amount"
                type="number"
                step="1"
                min="1"
                className="form-input"
                value={form.amount}
                onChange={handleChange}
                placeholder="e.g. 1500"
                required
              />
            </label>
          </div>

          <label className="form-label">
            Expense Date
            <input
              name="date"
              type="date"
              className={`form-input${dateError ? ' form-input--error' : ''}`}
              value={form.date}
              onChange={handleChange}
              min={TODAY}
              required
            />
            {dateError ? (
              <span className="form-hint form-hint--error">{dateError}</span>
            ) : (
              <span className="form-hint">Only today or future dates are accepted.</span>
            )}
          </label>

          <label className="form-label">
            Description
            <textarea
              name="description"
              className="form-input"
              rows="3"
              value={form.description}
              onChange={handleChange}
              placeholder="Describe the expense — e.g. Taxi to client site, meal during branch visit…"
              required
            />
          </label>

          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={submitting || !!dateError}>
              {submitting ? 'Submitting…' : 'Submit Claim'}
            </button>
          </div>
        </form>
      </div>

      {/* History */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Claim History</h2>
        </div>

        {loading && (
          <div className="skeleton-list">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton-item" />)}
          </div>
        )}

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
              <div key={claim._id || claim.date} className="list-item">
                <div className="list-row">
                  <div className="list-item-main">
                    <span className="list-title">{claim.type?.charAt(0).toUpperCase() + claim.type?.slice(1)}</span>
                    <span className="list-meta">{new Date(claim.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <span className={`tag ${STATUS_TAG[claim.status] || 'tag-pending'}`}>
                    {STATUS_LABEL[claim.status] || claim.status || 'Pending'}
                  </span>
                </div>
                {claim.description && (
                  <p className="list-desc">{claim.description}</p>
                )}
                <div className="list-row">
                  <span className="claim-amount">{formatCurrency(claim.amount)}</span>
                  {claim.reviewComment && (
                    <span className="list-meta" style={{ fontStyle: 'italic' }}>"{claim.reviewComment}"</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Claims;
