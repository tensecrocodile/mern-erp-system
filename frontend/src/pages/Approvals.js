import { useState, useEffect, useCallback } from 'react';
import { getApprovals, reviewClaim, reviewLeave } from '../services/approvalsApi';

const ReviewRow = ({ label, onApprove, onReject, disabled }) => (
  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
    <button
      className="btn btn-success"
      style={{ padding: '5px 16px', fontSize: 12 }}
      onClick={onApprove}
      disabled={disabled}
    >
      Approve
    </button>
    <button
      className="btn"
      style={{ padding: '5px 16px', fontSize: 12, background: '#fee2e2', color: '#991b1b', border: 'none' }}
      onClick={onReject}
      disabled={disabled}
    >
      Reject
    </button>
    {label && <span style={{ fontSize: 12, color: '#64748b', alignSelf: 'center' }}>{label}</span>}
  </div>
);

const Approvals = () => {
  const [data, setData] = useState({ pendingClaims: [], pendingLeaves: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewing, setReviewing] = useState(null);

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getApprovals();
      setData(res.data || { pendingClaims: [], pendingLeaves: [] });
    } catch (err) {
      setError(err?.message || 'Unable to load approvals.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchApprovals(); }, [fetchApprovals]);

  const handleClaimReview = async (id, status) => {
    setReviewing(id);
    try {
      await reviewClaim(id, status);
      setData((prev) => ({
        ...prev,
        pendingClaims: prev.pendingClaims.filter((c) => c._id !== id),
      }));
    } catch (err) {
      setError(err?.message || 'Review failed.');
    } finally {
      setReviewing(null);
    }
  };

  const handleLeaveReview = async (id, status) => {
    setReviewing(id);
    try {
      await reviewLeave(id, status);
      setData((prev) => ({
        ...prev,
        pendingLeaves: prev.pendingLeaves.filter((l) => l._id !== id),
      }));
    } catch (err) {
      setError(err?.message || 'Review failed.');
    } finally {
      setReviewing(null);
    }
  };

  const totalPending = data.pendingClaims.length + data.pendingLeaves.length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Approvals</h1>
          <p className="page-description">Review pending claims and leave requests.</p>
        </div>
        {totalPending > 0 && (
          <span className="tag tag-pending">{totalPending} pending</span>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && <div className="page-message">Loading approvals…</div>}

      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
          <div className="card list-card">
            <h2 className="section-title">
              Claims{' '}
              <span className="tag tag-pending" style={{ marginLeft: 6 }}>
                {data.pendingClaims.length}
              </span>
            </h2>
            {data.pendingClaims.length === 0 ? (
              <div className="page-message">No pending claims. ✓</div>
            ) : (
              <div className="list-grid">
                {data.pendingClaims.map((claim) => (
                  <div key={claim._id} className="list-item">
                    <div className="list-row">
                      <span className="list-title">{claim.userId?.fullName || '—'}</span>
                      <span className="tag tag-primary">{claim.type}</span>
                    </div>
                    <p className="list-desc">{claim.description}</p>
                    <div className="list-row muted">
                      <span>₹{claim.amount}</span>
                      <span>{new Date(claim.date).toLocaleDateString()}</span>
                    </div>
                    <ReviewRow
                      onApprove={() => handleClaimReview(claim._id, 'approved')}
                      onReject={() => handleClaimReview(claim._id, 'rejected')}
                      disabled={reviewing === claim._id}
                      label={reviewing === claim._id ? 'Saving…' : null}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card list-card">
            <h2 className="section-title">
              Leaves{' '}
              <span className="tag tag-pending" style={{ marginLeft: 6 }}>
                {data.pendingLeaves.length}
              </span>
            </h2>
            {data.pendingLeaves.length === 0 ? (
              <div className="page-message">No pending leaves. ✓</div>
            ) : (
              <div className="list-grid">
                {data.pendingLeaves.map((leave) => (
                  <div key={leave._id} className="list-item">
                    <div className="list-row">
                      <span className="list-title">{leave.userId?.fullName || '—'}</span>
                      <span className="tag tag-primary">{leave.type}</span>
                    </div>
                    <p className="list-desc">{leave.reason}</p>
                    <div className="list-row muted">
                      <span>{new Date(leave.startDate).toLocaleDateString()}</span>
                      <span>→ {new Date(leave.endDate).toLocaleDateString()}</span>
                    </div>
                    <ReviewRow
                      onApprove={() => handleLeaveReview(leave._id, 'approved')}
                      onReject={() => handleLeaveReview(leave._id, 'rejected')}
                      disabled={reviewing === leave._id}
                      label={reviewing === leave._id ? 'Saving…' : null}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Approvals;
