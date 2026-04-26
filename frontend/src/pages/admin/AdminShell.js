import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import './AdminShell.css';

const navClass = ({ isActive }) => `sidebarLink ${isActive ? 'sidebarLinkActive' : ''}`;

const AdminShell = () => {
  return (
    <section className="shell admin-shell">
      <aside className="sidebar admin-sidebar">
        <h2 className="sidebarTitle">Admin Workspace</h2>
        <p className="sidebarMeta">Manage operations, users, and review analytics.</p>

        <nav className="sidebarNav" aria-label="Admin navigation">
          <NavLink to="/admin" end className={navClass}>
            Dashboard
          </NavLink>
          <NavLink to="/admin/user-management" className={navClass}>
            User Management
          </NavLink>
          <NavLink to="/admin/reviews" className={navClass}>
            Reviews Analytics
          </NavLink>
        </nav>
      </aside>

      <div className="content admin-shell-content">
        <Outlet />
      </div>
    </section>
  );
};

export default AdminShell;
