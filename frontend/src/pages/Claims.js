import { useState, useEffect } from 'react';
import { submitClaim, getMyClaims } from '../services/claimsApi';

const Claims = () => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [form, setForm] = useState({ type: 'travel', amount: '', date: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchClaims = async () => {
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
    };

    fetchClaims();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      setError('Enter a valid claim amount.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitClaim({
        type: form.type,
        amount,
        date: form.date,
        description: form.description,
        attachments: [],
      });

      setSuccess('Claim submitted successfully.');
      setClaims((current) => [(result.data?.claim || result.data || result), ...current]);
      setForm({ type: 'travel', amount: '', date: '', description: '' });
    } catch (err) {
      setError(err?.message || 'Unable to submit claim.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page page-form">
      <div className="page-header">
        <div>
          <h1 className="page-title">Claims</h1>
          <p className="page-description">Submit expenses and view your claim history.</p>
        </div>
      </div>

      <div className="card form-card">
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="form-label">
            Claim Type
            <select name="type" className="form-input" value={form.type} onChange={handleChange}>
              <option value="travel">Travel</option>
              <option value="food">Food</option>
              <option value="accommodation">Accommodation</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="form-label">
            Amount
            <input
              name="amount"
              type="number"
              step="0.01"
              className="form-input"
              value={form.amount}
              onChange={handleChange}
              placeholder="0.00"
              required
            />
          </label>
          <label className="form-label">
            Date
            <input
              name="date"
              type="date"
              className="form-input"
              value={form.date}
              onChange={handleChange}
              required
            />
          </label>
          <label className="form-label full-width">
            Description
            <textarea
              name="description"
              className="form-input"
              rows="4"
              value={form.description}
              onChange={handleChange}
              placeholder="Add details about the expense"
              required
            />
          </label>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Claim'}
          </button>
        </form>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card list-card">
        <h2 className="section-title">My Claims</h2>
        {loading ? (
          <div className="page-message">Loading claims...</div>
        ) : claims.length === 0 ? (
          <div className="page-message">No claims submitted yet.</div>
        ) : (
          <div className="list-grid">
            {claims.map((claim) => (
              <div key={claim._id || claim.id || claim.date} className="list-item">
                <div className="list-row">
                  <span>{claim.type}</span>
                  <span className={`tag ${{ approved: 'tag-approved', rejected: 'tag-rejected' }[claim.status] || 'tag-pending'}`}>
                    {claim.status || 'pending'}
                  </span>
                </div>
                <p>{claim.description}</p>
                <div className="list-row muted">
                  <span>{new Date(claim.date).toLocaleDateString()}</span>
                  <span>₹{claim.amount}</span>
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
