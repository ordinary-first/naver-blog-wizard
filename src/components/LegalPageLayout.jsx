import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Footer from './Footer';

function LegalPageLayout({ title, lastUpdated, children }) {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
    }}>
      {/* Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'rgba(17, 24, 39, 0.8)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '1rem 1.5rem',
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.color = 'var(--naver-green)'}
            onMouseLeave={(e) => e.target.style.color = 'var(--text-dim)'}
          >
            <ArrowLeft size={24} />
          </button>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            margin: 0,
          }}>
            {title}
          </h1>
        </div>
      </header>

      {/* Content */}
      <main style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '2rem 1.5rem',
      }}>
        {lastUpdated && (
          <div style={{
            fontSize: '0.875rem',
            color: 'var(--text-dim)',
            marginBottom: '2rem',
          }}>
            마지막 업데이트: {lastUpdated}
          </div>
        )}

        <div style={{
          lineHeight: '1.8',
          fontSize: '1rem',
        }}>
          {children}
        </div>

        {/* Footer */}
        <Footer />
      </main>
    </div>
  );
}

export default LegalPageLayout;
