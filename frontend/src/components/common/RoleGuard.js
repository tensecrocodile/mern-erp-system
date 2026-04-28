import { Navigate } from 'react-router-dom';

export const EMPLOYEE_ONLY = ['employee', 'manager'];
export const MANAGEMENT    = ['manager', 'hr', 'admin', 'super_admin'];
export const HR_AND_ABOVE  = ['hr', 'admin', 'super_admin'];
export const ADMIN_ONLY    = ['admin', 'super_admin'];

export const useRole = () => localStorage.getItem('role') || 'employee';

export const isEmployeeRole = (role) => EMPLOYEE_ONLY.includes(role);
export const isManagementRole = (role) => MANAGEMENT.includes(role);

const RoleGuard = ({ allow, redirectTo = '/dashboard', children }) => {
  const role = useRole();
  if (!allow.includes(role)) return <Navigate to={redirectTo} replace />;
  return children;
};

export default RoleGuard;
