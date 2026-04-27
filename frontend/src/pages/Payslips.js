import { useState, useEffect, useCallback } from 'react';
import { getMyPayslips } from '../services/payslipsApi';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const Payslips = () => {
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const fetchPayslips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyPayslips();
      setPayslips(res.data?.payslips || []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load payslips.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPayslips(); }, [fetchPayslips]);

  const toggle = (id) => setExpanded((prev) => (prev === id ? null : id));

  return (
    <div className="page" style={{ maxWidth: 800 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Payslips</h1>
          <p className="page-description">View your monthly salary statements.</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="page-message">Loading payslips…</div>
      ) : payslips.length === 0 ? (
        <div className="card list-card">
          <div className="page-message">No payslips available yet.</div>
        </div>
      ) : (
        <div className="card list-card">
          <div className="list-grid">
            {payslips.map((p) => (
              <div key={p._id} className="list-item">
                <div className="list-row" style={{ cursor: 'pointer' }} onClick={() => toggle(p._id)}>
                  <div>
                    <span className="list-title">{MONTH_NAMES[(p.month || 1) - 1]} {p.year}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span className="tag tag-company">Net ₹{Number(p.netPay).toLocaleString('en-IN')}</span>
                    <span className="muted" style={{ fontSize: 18 }}>{expanded === p._id ? '▲' : '▼'}</span>
                  </div>
                </div>

                {expanded === p._id && (
                  <div style={{ marginTop: 14 }}>
                    {p.components?.length > 0 && (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 12 }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ textAlign: 'left', padding: '4px 0', color: '#64748b', fontWeight: 600 }}>Component</th>
                            <th style={{ textAlign: 'right', padding: '4px 0', color: '#64748b', fontWeight: 600 }}>Type</th>
                            <th style={{ textAlign: 'right', padding: '4px 0', color: '#64748b', fontWeight: 600 }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {p.components.map((c, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '6px 0' }}>{c.label}</td>
                              <td style={{ textAlign: 'right', padding: '6px 0' }}>
                                <span className={`tag ${c.type === 'earning' ? 'tag-optional' : 'tag-pending'}`} style={{ fontSize: 10 }}>
                                  {c.type}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right', padding: '6px 0', fontWeight: c.type === 'deduction' ? 400 : 600, color: c.type === 'deduction' ? '#ef4444' : '#0f172a' }}>
                                {c.type === 'deduction' ? '− ' : ''}₹{Number(c.amount).toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ borderTop: '2px solid #e2e8f0' }}>
                            <td colSpan="2" style={{ padding: '8px 0', fontWeight: 700 }}>Gross Pay</td>
                            <td style={{ textAlign: 'right', padding: '8px 0', fontWeight: 700 }}>₹{Number(p.grossPay).toLocaleString('en-IN')}</td>
                          </tr>
                          <tr>
                            <td colSpan="2" style={{ padding: '4px 0', fontWeight: 700, color: '#6366f1' }}>Net Pay</td>
                            <td style={{ textAlign: 'right', padding: '4px 0', fontWeight: 700, color: '#6366f1' }}>₹{Number(p.netPay).toLocaleString('en-IN')}</td>
                          </tr>
                        </tfoot>
                      </table>
                    )}
                    {p.fileUrl && (
                      <a
                        href={p.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary"
                        style={{ display: 'inline-block', padding: '6px 16px', fontSize: 13, textDecoration: 'none' }}
                      >
                        Download PDF
                      </a>
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

export default Payslips;
