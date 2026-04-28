const MENU = {
  employee: [
    {
      section: 'Overview',
      items: [{ to: '/dashboard', icon: '▣', label: 'Dashboard' }],
    },
    {
      section: 'Attendance',
      items: [
        { to: '/geo',           icon: '⊙', label: 'Geo Check-in'  },
        { to: '/attendance',    icon: '◷', label: 'My Attendance'  },
        { to: '/meetings',      icon: '◇', label: 'Client Visits'  },
        { to: '/daily-reports', icon: '◫', label: 'Daily Reports'  },
      ],
    },
    {
      section: 'My Work',
      items: [
        { to: '/claims',   icon: '▤', label: 'My Claims'  },
        { to: '/leaves',   icon: '◰', label: 'My Leaves'  },
        { to: '/holidays', icon: '◆', label: 'Holidays'   },
        { to: '/payslips', icon: '▥', label: 'Payslips'   },
      ],
    },
    {
      section: 'Company',
      items: [
        { to: '/announcements', icon: '▶', label: 'Announcements' },
      ],
    },
  ],

  manager: [
    {
      section: 'Overview',
      items: [{ to: '/dashboard', icon: '▣', label: 'Dashboard' }],
    },
    {
      section: 'Field',
      items: [
        { to: '/geo',           icon: '⊙', label: 'Geo Check-in'  },
        { to: '/trips-live',    icon: '◈', label: 'Live Map'       },
        { to: '/attendance',    icon: '◷', label: 'Attendance'     },
        { to: '/meetings',      icon: '◇', label: 'Client Visits'  },
        { to: '/daily-reports', icon: '◫', label: 'Daily Reports'  },
      ],
    },
    {
      section: 'My Work',
      items: [
        { to: '/claims',   icon: '▤', label: 'My Claims'  },
        { to: '/leaves',   icon: '◰', label: 'My Leaves'  },
        { to: '/payslips', icon: '▥', label: 'Payslips'   },
      ],
    },
    {
      section: 'Team',
      items: [
        { to: '/approvals', icon: '✓', label: 'Approvals' },
        { to: '/employees', icon: '◉', label: 'My Team'   },
      ],
    },
    {
      section: 'Company',
      items: [
        { to: '/holidays',      icon: '◆', label: 'Holidays'      },
        { to: '/announcements', icon: '▶', label: 'Announcements' },
      ],
    },
  ],

  hr: [
    {
      section: 'Overview',
      items: [{ to: '/dashboard', icon: '▣', label: 'Dashboard' }],
    },
    {
      section: 'People',
      items: [
        { to: '/employees',  icon: '◉', label: 'Employees'      },
        { to: '/attendance', icon: '◷', label: 'Team Attendance' },
      ],
    },
    {
      section: 'Approvals',
      items: [
        { to: '/approvals', icon: '✓', label: 'All Approvals'  },
        { to: '/leaves',    icon: '◰', label: 'Leave Requests' },
        { to: '/claims',    icon: '▤', label: 'Claim Requests' },
      ],
    },
    {
      section: 'Company',
      items: [
        { to: '/holidays',      icon: '◆', label: 'Holidays'      },
        { to: '/announcements', icon: '▶', label: 'Announcements' },
      ],
    },
  ],

  admin: [
    {
      section: 'Overview',
      items: [{ to: '/dashboard', icon: '▣', label: 'Dashboard' }],
    },
    {
      section: 'Operations',
      items: [
        { to: '/trips-live', icon: '◈', label: 'Live Map'   },
        { to: '/attendance', icon: '◷', label: 'Attendance' },
        { to: '/employees',  icon: '◉', label: 'Employees'  },
      ],
    },
    {
      section: 'Reviews',
      items: [
        { to: '/approvals',     icon: '✓', label: 'Approvals'      },
        { to: '/leaves',        icon: '◰', label: 'Leave Requests' },
        { to: '/claims',        icon: '▤', label: 'Claim Requests' },
        { to: '/announcements', icon: '▶', label: 'Announcements'  },
      ],
    },
    {
      section: 'Configuration',
      items: [
        { to: '/geofences', icon: '⬡', label: 'Geofences' },
        { to: '/holidays',  icon: '◆', label: 'Holidays'  },
      ],
    },
  ],
};

export function getMenuForRole(role) {
  if (role === 'super_admin' || role === 'admin') return MENU.admin;
  if (role === 'hr') return MENU.hr;
  if (role === 'manager') return MENU.manager;
  return MENU.employee;
}

export default MENU;
