import { useState, useEffect } from 'react';
import { getProfile, updateProfile } from '../services/profileApi';

const WORK_MODES = [
  { value: 'office', label: 'Office' },
  { value: 'field',  label: 'Field'  },
  { value: 'remote', label: 'Remote' },
];

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);
  const [profileSuccess, setProfileSuccess] = useState(null);
  const [pwError, setPwError] = useState(null);
  const [pwSuccess, setPwSuccess] = useState(null);
  const [form, setForm] = useState({ fullName: '', workMode: 'field' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const res = await getProfile();
        const u = res.data?.user || res.data;
        setUser(u);
        setForm({ fullName: u?.fullName || '', workMode: u?.workMode || 'field' });
      } catch (err) {
        setProfileError(err?.message || 'Unable to load profile.');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    setSavingProfile(true);
    try {
      const res = await updateProfile({ fullName: form.fullName, workMode: form.workMode });
      const updated = res.data?.user || res.data;
      setUser(updated);
      setProfileSuccess('Profile updated successfully.');
    } catch (err) {
      setProfileError(err?.message || 'Unable to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);
    setSavingPw(true);
    try {
      await updateProfile({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwSuccess('Password changed successfully.');
      setPwForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      setPwError(err?.message || 'Unable to change password.');
    } finally {
      setSavingPw(false);
    }
  };

  if (loading) return <div className="page-message" style={{ marginTop: 40 }}>Loading profile…</div>;

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Profile</h1>
          <p className="page-description">Manage your account details and security settings.</p>
        </div>
      </div>

      <div className="card form-card">
        <h2 className="section-title">Account</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b' }}>
              Email
            </div>
            <div style={{ marginTop: 4, fontSize: 14, color: '#0f172a' }}>{user?.email}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b' }}>
              Role
            </div>
            <div style={{ marginTop: 4 }}>
              <span className="tag tag-company">{user?.role}</span>
            </div>
          </div>
          {user?.employeeId && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b' }}>
                Employee ID
              </div>
              <div style={{ marginTop: 4, fontSize: 14, color: '#0f172a', fontWeight: 600 }}>
                {user.employeeId}
              </div>
            </div>
          )}
        </div>

        {profileError && <div className="alert alert-error" style={{ marginBottom: 14 }}>{profileError}</div>}
        {profileSuccess && <div className="alert alert-success" style={{ marginBottom: 14 }}>{profileSuccess}</div>}

        <form className="form-grid" onSubmit={handleProfileSave}>
          <label className="form-label">
            Full Name
            <input
              type="text"
              className="form-input"
              value={form.fullName}
              onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
              required
              minLength={2}
              maxLength={120}
            />
          </label>
          <label className="form-label">
            Work Mode
            <select
              className="form-input"
              value={form.workMode}
              onChange={(e) => setForm((p) => ({ ...p, workMode: e.target.value }))}
            >
              {WORK_MODES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </label>
          <button className="btn btn-primary" type="submit" disabled={savingProfile}>
            {savingProfile ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>

      <div className="card form-card">
        <h2 className="section-title">Change Password</h2>

        {pwError && <div className="alert alert-error" style={{ marginBottom: 14 }}>{pwError}</div>}
        {pwSuccess && <div className="alert alert-success" style={{ marginBottom: 14 }}>{pwSuccess}</div>}

        <form className="form-grid" onSubmit={handlePasswordSave}>
          <label className="form-label">
            Current Password
            <input
              type="password"
              className="form-input"
              value={pwForm.currentPassword}
              onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
              required
              autoComplete="current-password"
            />
          </label>
          <label className="form-label">
            New Password
            <input
              type="password"
              className="form-input"
              value={pwForm.newPassword}
              onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
              required
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              minLength={8}
            />
          </label>
          <button className="btn btn-primary" type="submit" disabled={savingPw}>
            {savingPw ? 'Updating…' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
