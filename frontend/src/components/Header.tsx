import React from 'react';
import type { HealthStatus } from '../services/api.js';

interface HeaderProps {
  readonly health: HealthStatus | null;
  readonly onRefresh: () => void;
  readonly isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({ health, onRefresh, isRefreshing }) => {
  const isOnline = health?.status === 'HEALTHY';
  const dbStatus = health?.database.connected ? 'Database Connected' : 'Storage Ready';

  return (
    <header className="navbar">
      <div className="nav-container">
        <div className="brand">
          <div className="brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div className="brand-text">
            <span className="brand-name">ClinicWorks</span>
            <span className="brand-badge">Clinical Document Processing</span>
          </div>
        </div>

        <div className="nav-actions">
          <div className="system-health-pill" title={isOnline ? 'All services operational' : 'System connectivity issue'}>
            <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
            <span className="health-label">
              {isOnline ? dbStatus : 'Reconnecting...'}
            </span>
          </div>

          <button
            type="button"
            className="btn-refresh"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh documents list"
            aria-label="Refresh documents list"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              className={isRefreshing ? 'spin-icon' : ''}
            >
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </header>
  );
};
