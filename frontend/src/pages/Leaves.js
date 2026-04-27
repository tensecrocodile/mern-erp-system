import { useState, useEffect } from 'react';
import { applyLeave, getMyLeaves } from '../services/leavesApi';

const Leaves = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [form, setForm] = useState({ type: 'casual', startDate: '', endDate: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchLeaves = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await getMyLeaves();
        setLeaves(result.data?.leaves || result.data || []);
      } catch (err) {
        setError(err?.message || 'Unable to load leaves.');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaves();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.startDate || !form.endDate || !form.reason.trim()) {
      setError('Please fill all leave fields.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await applyLeave({
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason,
      });

      setSuccess('Leave request submitted.');
      setLeaves((current) => [(result.data?.leave || result.data || result), ...current]);
      setForm({ type: 'casual', startDate: '', endDate: '', reason: '' });
    } catch (err) {
      setError(err?.message || 'Unable to apply for leave.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page page-form">
      <div className="page-header">
        <div>
          <h1 className="page-title">Leaves</h1>
          <p className="page-description">Request leave and review your leave history.</p>
        </div>
      </div>

      <div className="card form-card">
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="form-label">
            Leave Type
            <select name="type" className="form-input" value={form.type} onChange={handleChange}>
              <option value="casual">Casual</option>
              <option value="sick">Sick</option>
              <option value="earned">Earned</option>
            </select>
          </label>
          <label className="form-label">
            Start Date
            <input
              name="startDate"
              type="date"
              className="form-input"
              value={form.startDate}
              onChange={handleChange}
              required
            />
          </label>
          <label className="form-label">
            End Date
            <input
              name="endDate"
              type="date"
              className="form-input"
              value={form.endDate}
              onChange={handleChange}
              required
            />
          </label>
          <label className="form-label full-width">
            Reason
            <textarea
              name="reason"
              className="form-input"
              rows="4"
              value={form.reason}
              onChange={handleChange}
              placeholder="Describe the reason for leave"
              required
            />
          </label>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Apply Leave'}
          </button>
        </form>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card list-card">
        <h2 className="section-title">My Leaves</h2>
        {loading ? (
          <div className="page-message">Loading leave requests...</div>
        ) : leaves.length === 0 ? (
          <div className="page-message">No leave requests found.</div>
        ) : (
          <div className="list-grid">
            {leaves.map((leave) => (
              <div key={leave._id || `${leave.startDate}-${leave.endDate}`} className="list-item">
                <div className="list-row">
                  <span>{leave.type}</span>
                  <span className={`tag ${{ approved: 'tag-approved', rejected: 'tag-rejected' }[leave.status] || 'tag-pending'}`}>
                    {leave.status || 'pending'}
                  </span>
                </div>
                <p>{leave.reason}</p>
                <div className="list-row muted">
                  <span>{new Date(leave.startDate).toLocaleDateString()}</span>
                  <span>{new Date(leave.endDate).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaves;
