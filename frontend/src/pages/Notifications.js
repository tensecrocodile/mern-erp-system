import { useState, useEffect, useCallback } from 'react';
import { getMyNotifications, markAsRead } from '../services/notificationsApi';

const TYPE_META = {
  claim:        { label: 'Claim',        cls: 'tag-company'   },
  leave:        { label: 'Leave',        cls: 'tag-optional'  },
  idle:         { label: 'Trip Idle',    cls: 'tag-pending'   },
  announcement: { label: 'Announcement', cls: 'tag-custom'    },
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyNotifications();
      setNotifications(res.data?.notifications || []);
    } catch (err) {
      setError(err?.message || 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const handleMarkRead = async (id) => {
    try {
      await markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch {
      // silent — non-critical action
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    await Promise.allSettled(unread.map((n) => markAsRead(n._id)));
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-description">Activity alerts and system messages.</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {unreadCount > 0 && (
            <span className="tag tag-pending">{unreadCount} unread</span>
          )}
          {unreadCount > 0 && (
            <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: 12 }} onClick={handleMarkAllRead}>
              Mark all read
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && <div className="page-message">Loading notifications…</div>}

      {!loading && (
        <div className="card list-card">
          {notifications.length === 0 ? (
            <div className="page-message">No notifications yet.</div>
          ) : (
            <div className="list-grid">
              {notifications.map((n) => {
                const meta = TYPE_META[n.type] || { label: n.type, cls: 'tag-secondary' };
                return (
                  <div
                    key={n._id}
                    className="list-item"
                    style={{
                      opacity: n.isRead ? 0.6 : 1,
                      borderLeft: n.isRead ? '1px solid #e2e8f0' : '3px solid #6366f1',
                    }}
                  >
                    <div className="list-row">
                      <span className={`tag ${meta.cls}`}>{meta.label}</span>
                      <span className="muted">{new Date(n.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="list-desc" style={{ margin: '6px 0' }}>{n.message}</p>
                    {!n.isRead && (
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 12px', fontSize: 12 }}
                        onClick={() => handleMarkRead(n._id)}
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Notifications;
