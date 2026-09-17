import React from 'react';
import type { HealthStatus } from '../services/api.js';

interface HeaderProps {
  readonly health: HealthStatus | null;
  readonly onRefresh: () => void;
  readonly isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({ health, onRefresh, isRefreshing }) => {
  const isOnline = health?.status === 'HEALTHY';
  const dbStatus = health?.database.connected ? 'PostgreSQL Active' : 'In-Memory Store';

  return (
    <header className="navbar">
      <div className="nav-container">
        <div className="brand">
          <div className="brand-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div className="brand-text">
            <span className="brand-name">ClinicWorks</span>
            <span className="brand-badge">Azure AI Clinical Platform</span>
          </div>
        </div>

        <div className="nav-status">
          <span className={`status-indicator ${isOnline ? 'online' : 'offline'}`} />
          <span className="status-label">
            {isOnline ? `Online (${dbStatus})` : 'Connecting...'}
          </span>
          <button
            type="button"
            className="btn-sm btn-outline"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh documents list"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              className={isRefreshing ? 'spin-icon' : ''}
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>
    </header>
  );
};
