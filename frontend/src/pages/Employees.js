import { useState, useEffect, useCallback } from 'react';
import { getEmployees, createEmployee, setEmployeeStatus } from '../services/usersApi';

const ROLE_META = {
  super_admin: { label: 'Super Admin', cls: 'tag-danger' },
  admin:       { label: 'Admin',       cls: 'tag-primary' },
  hr:          { label: 'HR',          cls: 'tag-company' },
  manager:     { label: 'Manager',     cls: 'tag-optional' },
  employee:    { label: 'Employee',    cls: 'tag-secondary' },
};

const WORK_MODE_LABEL = { office: 'Office', field: 'Field', remote: 'Remote' };

const EMPTY_FORM = {
  fullName: '', email: '', password: '', employeeId: '',
  role: 'employee', workMode: 'field',
};

const ALLOWED_ROLES_TO_CREATE = [
  { value: 'employee', label: 'Employee' },
  { value: 'manager',  label: 'Manager'  },
  { value: 'hr',       label: 'HR'       },
  { value: 'admin',    label: 'Admin'    },
];

// ── Create Employee Form ───────────────────────────────────────
const CreateForm = ({ onCreated, onCancel }) => {
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState(null);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.fullName.trim()) { setError('Full name is required.'); return; }
    if (!form.email.trim())    { setError('Email is required.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }

    setSaving(true);
    try {
      const res = await createEmployee({
        fullName:   form.fullName.trim(),
        email:      form.email.trim(),
        password:   form.password,
        employeeId: form.employeeId.trim() || undefined,
        role:       form.role,
        workMode:   form.workMode,
      });
      onCreated(res.data?.user);
    } catch (err) {
      setError(err?.message || 'Failed to create employee.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">New Employee</h2>
        <p className="card-subtitle">Created employees can log in immediately.</p>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <form className="claim-form" onSubmit={handleSubmit}>
        <div className="form-row-2">
          <label className="form-label">
            Full Name *
            <input name="fullName" className="form-input" value={form.fullName}
              onChange={handleChange} placeholder="e.g. Priya Sharma" required />
          </label>
          <label className="form-label">
            Email *
            <input name="email" type="email" className="form-input" value={form.email}
              onChange={handleChange} placeholder="priya@company.com" required />
          </label>
        </div>

        <div className="form-row-2">
          <label className="form-label">
            Password *
            <input name="password" type="password" className="form-input" value={form.password}
              onChange={handleChange} placeholder="Min 8 characters" required />
          </label>
          <label className="form-label">
            Employee ID
            <input name="employeeId" className="form-input" value={form.employeeId}
              onChange={handleChange} placeholder="e.g. EMP-001 (optional)" />
          </label>
        </div>

        <div className="form-row-2">
          <label className="form-label">
            Role
            <select name="role" className="form-input" value={form.role} onChange={handleChange}>
              {ALLOWED_ROLES_TO_CREATE.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </label>
          <label className="form-label">
            Work Mode
            <select name="workMode" className="form-input" value={form.workMode} onChange={handleChange}>
              <option value="field">Field</option>
              <option value="office">Office</option>
              <option value="remote">Remote</option>
            </select>
          </label>
        </div>

        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Creating…' : 'Create Employee'}
          </button>
          <button className="btn btn-secondary" type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

// ── Employee row ───────────────────────────────────────────────
const EmployeeRow = ({ emp, onStatusChange }) => {
  const [toggling, setToggling] = useState(false);
  const meta = ROLE_META[emp.role] || { label: emp.role, cls: 'tag-secondary' };

  const handleToggle = async () => {
    setToggling(true);
    try {
      await onStatusChange(emp._id, !emp.isActive);
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="list-item emp-row">
      <div className="list-row">
        <div className="list-item-main">
          <div className="emp-name-row">
            <div className="emp-avatar">{emp.fullName?.[0]?.toUpperCase() ?? '?'}</div>
            <div>
              <span className="list-title">{emp.fullName}</span>
              <span className="list-meta">{emp.email}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span className={`tag ${meta.cls}`}>{meta.label}</span>
          <span className={`tag ${emp.isActive ? 'tag-approved' : 'tag-rejected'}`}>
            {emp.isActive ? 'Active' : 'Blocked'}
          </span>
        </div>
      </div>

      <div className="emp-details-row">
        <span className="list-meta">
          ◎ {WORK_MODE_LABEL[emp.workMode] || emp.workMode}
        </span>
        {emp.employeeId && (
          <span className="list-meta">ID: {emp.employeeId}</span>
        )}
        {emp.managerId && (
          <span className="list-meta">Reports to: {emp.managerId.fullName}</span>
        )}
        {emp.assignedGeoFences?.length > 0 && (
          <span className="list-meta">
            ⬡ {emp.assignedGeoFences.map((f) => f.name).join(', ')}
          </span>
        )}
      </div>

      <div className="form-actions" style={{ paddingTop: 0 }}>
        <button
          className={`btn ${emp.isActive ? 'btn-block' : 'btn-unblock'}`}
          onClick={handleToggle}
          disabled={toggling}
        >
          {toggling ? '…' : emp.isActive ? 'Block' : 'Unblock'}
        </button>
      </div>
    </div>
  );
};

// ── Main page ──────────────────────────────────────────────────
const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (filterRole)   params.role     = filterRole;
      if (filterStatus !== '') params.isActive = filterStatus;
      const res = await getEmployees(params);
      setEmployees(res.data?.users || []);
    } catch (err) {
      setError(err?.message || 'Unable to load employees.');
    } finally {
      setLoading(false);
    }
  }, [filterRole, filterStatus]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const handleCreated = (user) => {
    setShowCreate(false);
    if (user) setEmployees((prev) => [user, ...prev]);
  };

  const handleStatusChange = async (id, isActive) => {
    try {
      const res = await setEmployeeStatus(id, isActive);
      const updated = res.data?.user;
      setEmployees((prev) =>
        prev.map((e) => (e._id === updated._id ? { ...e, isActive: updated.isActive } : e))
      );
    } catch (err) {
      setError(err?.message || 'Failed to update status.');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-description">Manage employee accounts, roles, and access.</p>
        </div>
        <div className="page-header-meta">
          <span className="tag tag-secondary">{employees.length} total</span>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreate((v) => !v)}
          >
            {showCreate ? '✕ Cancel' : '+ New Employee'}
          </button>
        </div>
      </div>

      {showCreate && (
        <CreateForm onCreated={handleCreated} onCancel={() => setShowCreate(false)} />
      )}

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {/* Filters */}
      <div className="card" style={{ padding: '14px 20px' }}>
        <div className="emp-filter-row">
          <label className="form-label" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, margin: 0 }}>
            <span style={{ whiteSpace: 'nowrap', fontSize: 12, fontWeight: 600 }}>Role</span>
            <select
              className="form-input"
              style={{ minHeight: 34, padding: '5px 10px', fontSize: 13 }}
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="">All roles</option>
              {ALLOWED_ROLES_TO_CREATE.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </label>
          <label className="form-label" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, margin: 0 }}>
            <span style={{ whiteSpace: 'nowrap', fontSize: 12, fontWeight: 600 }}>Status</span>
            <select
              className="form-input"
              style={{ minHeight: 34, padding: '5px 10px', fontSize: 13 }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Blocked</option>
            </select>
          </label>
        </div>
      </div>

      {/* List */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Employee Directory</h2>
        </div>

        {loading && (
          <div className="skeleton-list">
            {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton-item" style={{ height: 90 }} />)}
          </div>
        )}

        {!loading && employees.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">👤</div>
            <div className="empty-state-title">No employees found</div>
            <div className="empty-state-sub">
              Create the first employee using the button above.
            </div>
          </div>
        )}

        {!loading && employees.length > 0 && (
          <div className="list-grid">
            {employees.map((emp) => (
              <EmployeeRow
                key={emp._id}
                emp={emp}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Employees;
