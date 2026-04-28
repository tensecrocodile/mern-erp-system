import { useState, useEffect, useCallback } from 'react';
import { getMyLogs, getAttendanceSummary } from '../services/attendanceApi';

const TODAY_MONTH = new Date().toISOString().slice(0, 7); // "YYYY-MM"

const STATUS_TAG = {
  checked_in: 'tag-primary',
  full_day:   'tag-approved',
  half_day:   'tag-pending',
};

const STATUS_LABEL = {
  checked_in: 'In Progress',
  full_day:   'Full Day',
  half_day:   'Half Day',
};

function fmtTime(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleTimeString('en-IN', {
    hour:   '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function fmtDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('en-IN', {
    weekday: 'short',
    day:     'numeric',
    month:   'short',
  });
}

const SummaryCards = ({ summary, loading }) => {
  if (loading) {
    return (
      <div className="attendance-summary-row">
        {[1, 2, 3].map((i) => (
          <div key={i} className="attendance-summary-card skeleton-item" style={{ height: 96 }} />
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const cards = [
    { label: 'Present',  value: summary.present,  color: 'green',  dot: '#22c55e' },
    { label: 'Absent',   value: summary.absent,   color: 'red',    dot: '#ef4444' },
    { label: 'On Leave', value: summary.onLeave,  color: 'amber',  dot: '#f59e0b' },
  ];

  return (
    <div className="attendance-summary-row">
      {cards.map(({ label, value, color, dot }) => (
        <div key={label} className={`card stat-card ${color}`}>
          <span className="stat-label">
            <span style={{ color: dot, marginRight: 5 }}>●</span>
            {label}
          </span>
          <span className="stat-value">{value ?? 0}</span>
          <span className="stat-sub">of {summary.workingDays} working days</span>
        </div>
      ))}
    </div>
  );
};

const LogItem = ({ record }) => {
  const checkInTime  = record.checkIn?.time;
  const checkOutTime = record.checkOut?.time;
  const address      = record.checkIn?.location?.address;

  return (
    <div className="list-item attendance-log-item">
      <div className="list-row">
        <div className="list-item-main">
          <span className="list-title">{fmtDate(record.workDate)}</span>
          {address && (
            <span className="list-meta attendance-address">{address}</span>
          )}
        </div>
        <span className={`tag ${STATUS_TAG[record.status] || 'tag-secondary'}`}>
          {STATUS_LABEL[record.status] || record.status}
        </span>
      </div>

      <div className="attendance-times">
        <div className="attendance-time-item">
          <span className="attendance-time-label">Check In</span>
          <span className="attendance-time-value">{fmtTime(checkInTime)}</span>
        </div>
        <div className="attendance-time-divider">→</div>
        <div className="attendance-time-item">
          <span className="attendance-time-label">Check Out</span>
          <span className="attendance-time-value">{fmtTime(checkOutTime)}</span>
        </div>
        {record.workingHours && (
          <>
            <div className="attendance-time-divider">·</div>
            <div className="attendance-time-item">
              <span className="attendance-time-label">Hours</span>
              <span className="attendance-time-value attendance-hours">
                {record.workingHours}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const Attendance = () => {
  const [month, setMonth]           = useState(TODAY_MONTH);
  const [summary, setSummary]       = useState(null);
  const [logs, setLogs]             = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [logsLoading, setLogsLoading]       = useState(true);
  const [error, setError]           = useState(null);

  const fetchSummary = useCallback(async (m) => {
    setSummaryLoading(true);
    try {
      const res = await getAttendanceSummary(m);
      setSummary(res.data?.summary || null);
    } catch (err) {
      setError(err?.message || 'Unable to load summary.');
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLogsLoading(true);
      setError(null);
      try {
        const res = await getMyLogs(60);
        setLogs(res.data?.logs || []);
      } catch (err) {
        setError(err?.message || 'Unable to load attendance records.');
      } finally {
        setLogsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    setError(null);
    fetchSummary(month);
  }, [month, fetchSummary]);

  const filteredLogs = logs.filter((r) => {
    if (!r.workDate) return false;
    return new Date(r.workDate).toISOString().slice(0, 7) === month;
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="page-description">Monthly summary and daily check-in/out history.</p>
        </div>
        <div className="page-header-meta">
          <input
            type="month"
            className="form-input attendance-month-picker"
            value={month}
            max={TODAY_MONTH}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <SummaryCards summary={summary} loading={summaryLoading} />

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Daily Records</h2>
          <p className="card-subtitle">
            {filteredLogs.length} record{filteredLogs.length !== 1 ? 's' : ''} for{' '}
            {new Date(month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        {logsLoading && (
          <div className="skeleton-list">
            {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton-item" />)}
          </div>
        )}

        {!logsLoading && filteredLogs.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <div className="empty-state-title">No records this month</div>
            <div className="empty-state-sub">
              Attendance records will appear here after check-in.
            </div>
          </div>
        )}

        {!logsLoading && filteredLogs.length > 0 && (
          <div className="list-grid">
            {filteredLogs.map((record) => (
              <LogItem key={record._id} record={record} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Attendance;
