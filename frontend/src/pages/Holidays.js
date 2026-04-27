import { useState, useEffect } from 'react';
import { getHolidays } from '../services/holidaysApi';

const Holidays = () => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHolidays = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await getHolidays();
        setHolidays(result.data?.holidays || result.data || []);
      } catch (err) {
        setError(err?.message || 'Unable to load holidays.');
      } finally {
        setLoading(false);
      }
    };

    fetchHolidays();
  }, []);

  return (
    <div className="page page-list">
      <div className="page-header">
        <div>
          <h1 className="page-title">Holidays</h1>
          <p className="page-description">Upcoming company holidays and custom holiday events.</p>
        </div>
      </div>

      {loading && <div className="page-message">Loading holidays...</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && (
        <div className="card list-card">
          {holidays.length === 0 ? (
            <div className="page-message">No holiday records available.</div>
          ) : (
            <div className="list-grid">
              {holidays.map((holiday) => (
                <div key={holiday._id || holiday.name} className="list-item">
                  <div className="list-row">
                    <span className="list-title">{holiday.name}</span>
                    <span className={`tag ${{ company: 'tag-company', optional: 'tag-optional', custom: 'tag-custom' }[holiday.type] || 'tag-primary'}`}>
                      {holiday.type || 'holiday'}
                    </span>
                  </div>
                  <p>{new Date(holiday.date).toLocaleDateString()}</p>
                  <div className="list-row muted">
                    <span>{holiday.applicableTo === 'all' ? 'All employees' : 'Custom group'}</span>
                    <span>{holiday.scopeKey || 'Global'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Holidays;
