import React from 'react';
import { BUSINESS_INFO } from '../config/businessInfo';

function Footer() {
  return (
    <footer style={{
      marginTop: '3rem',
      padding: '2rem 1.5rem',
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      fontSize: '0.875rem',
      color: 'var(--text-dim)',
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
      }}>
        {/* 회사 정보 */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            fontWeight: '600',
            fontSize: '1rem',
            color: 'var(--text-primary)',
            marginBottom: '0.75rem'
          }}>
            {BUSINESS_INFO.companyName}
          </div>
          <div style={{ lineHeight: '1.6' }}>
            <div>대표자: {BUSINESS_INFO.ceoName}</div>
            <div>사업자등록번호: {BUSINESS_INFO.registrationNumber}</div>
            <div>주소: {BUSINESS_INFO.address}</div>
            <div>
              전화: {BUSINESS_INFO.phone} | 이메일:{' '}
              <a
                href={`mailto:${BUSINESS_INFO.email}`}
                style={{ color: 'var(--naver-green)', textDecoration: 'none' }}
              >
                {BUSINESS_INFO.email}
              </a>
            </div>
          </div>
        </div>

        {/* 법적 링크 */}
        <div style={{
          display: 'flex',
          gap: '1.5rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          flexWrap: 'wrap',
        }}>
          <a
            href={BUSINESS_INFO.termsUrl}
            style={{
              color: 'var(--text-dim)',
              textDecoration: 'none',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.color = 'var(--naver-green)'}
            onMouseLeave={(e) => e.target.style.color = 'var(--text-dim)'}
          >
            이용약관
          </a>
          <a
            href={BUSINESS_INFO.privacyUrl}
            style={{
              color: 'var(--text-dim)',
              textDecoration: 'none',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.color = 'var(--naver-green)'}
            onMouseLeave={(e) => e.target.style.color = 'var(--text-dim)'}
          >
            개인정보처리방침
          </a>
          <a
            href={BUSINESS_INFO.refundUrl}
            style={{
              color: 'var(--text-dim)',
              textDecoration: 'none',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.color = 'var(--naver-green)'}
            onMouseLeave={(e) => e.target.style.color = 'var(--text-dim)'}
          >
            환불정책
          </a>
        </div>

        {/* Copyright */}
        <div style={{
          marginTop: '1rem',
          fontSize: '0.8rem',
          opacity: 0.6,
        }}>
          © {new Date().getFullYear()} {BUSINESS_INFO.companyName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default Footer;
