import React, { useState } from 'react';
import { X, Sparkles, Zap, CheckCircle } from 'lucide-react';
import Footer from './Footer';

/**
 * SubscriptionModal - Premium upsell modal with glass-morphism aesthetic
 * @param {boolean} isOpen - Controls modal visibility
 * @param {function} onClose - Handler for closing modal
 * @param {function} onSubscribe - Handler for subscription action
 * @param {number} remainingCount - Remaining free uses (0-10)
 */
const SubscriptionModal = ({ isOpen, onClose, onSubscribe, remainingCount = 0 }) => {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop with blur */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          zIndex: 9998,
          animation: 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(480px, 92vw)',
          zIndex: 9999,
          animation: 'scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Glass Card */}
        <div
          className="glass-heavy"
          style={{
            padding: '2.5rem',
            position: 'relative',
            overflowX: 'hidden',
            overflowY: 'auto',
            maxHeight: '85vh',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Decorative gradient overlay */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '200px',
              background: 'radial-gradient(ellipse at top, rgba(3, 199, 90, 0.15), transparent)',
              pointerEvents: 'none',
            }}
          />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="button-hover"
            style={{
              position: 'absolute',
              top: '1.25rem',
              right: '1.25rem',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 1,
            }}
          >
            <X size={20} color="var(--text-dim)" />
          </button>

          {/* Content */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Icon Badge */}
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, rgba(3, 199, 90, 0.2), rgba(0, 242, 254, 0.2))',
                border: '2px solid rgba(3, 199, 90, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.5rem',
                animation: 'pulse-green 2s infinite',
              }}
            >
              <Sparkles size={36} color="var(--naver-green)" strokeWidth={2.5} />
            </div>

            {/* Heading */}
            <h2
              style={{
                fontSize: '2rem',
                fontWeight: '900',
                color: 'var(--text-main)',
                marginBottom: '0.5rem',
                letterSpacing: '-0.5px',
                lineHeight: 1.2,
              }}
            >
              무제한으로 계속 사용하세요!
            </h2>

            <p
              style={{
                fontSize: '1rem',
                color: 'var(--text-dim)',
                marginBottom: '2rem',
                lineHeight: 1.6,
              }}
            >
              프리미엄으로 업그레이드하고 무제한으로 이용하세요!
            </p>

            {/* Service Description */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                이 구독에 포함된 내용
              </h3>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-dim)', lineHeight: 1.6 }}>
                네이버 블로그 위저드는 AI 기반 블로그 글 작성 보조 서비스입니다.
                대화형 인터페이스를 통해 블로그 포스트를 자동으로 생성하고 편집할 수 있습니다.
              </p>
            </div>

            {/* Features List */}
            <div
              style={{
                background: 'rgba(3, 199, 90, 0.05)',
                border: '1px solid rgba(3, 199, 90, 0.15)',
                borderRadius: '20px',
                padding: '1.5rem',
                marginBottom: '2rem',
              }}
            >
              <div style={{ marginBottom: '1rem' }}>
                <div className="premium-gradient" style={{ fontSize: '2.5rem', fontWeight: '950', marginBottom: '0.25rem' }}>
                  월 2,000원
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>첫 달 50% 할인</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  '무제한 블로그 글 생성',
                  '이미지 무제한 업로드',
                  '고급 AI 편집 기능',
                  '우선 고객 지원',
                ].map((feature, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      animation: `slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${idx * 0.1}s backwards`,
                    }}
                  >
                    <CheckCircle size={18} color="var(--naver-green)" strokeWidth={2.5} />
                    <span style={{ fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: '500' }}>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Phone Number (required for Inicis V2) */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
                휴대폰 번호
              </label>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="예: 01012345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  color: 'var(--text-main)',
                  outline: 'none',
                }}
              />
              <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                이니시스 V2 결제에 필수입니다.
              </div>
            </div>

            {/* Terms Acceptance */}
            <label
              style={{
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start',
                cursor: 'pointer',
                marginBottom: '1.5rem',
                padding: '1rem',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                style={{
                  marginTop: '0.25rem',
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                  accentColor: 'var(--naver-green)',
                }}
              />
              <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)', lineHeight: 1.5, flex: 1 }}>
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--naver-green)', textDecoration: 'none', fontWeight: '600' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  이용약관
                </a>
                {' '}및{' '}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--naver-green)', textDecoration: 'none', fontWeight: '600' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  개인정보처리방침
                </a>
                에 동의합니다.
              </span>
            </label>

            {/* CTA Button */}
            <button
              onClick={() => onSubscribe(phoneNumber)}
              disabled={!termsAccepted || !phoneNumber}
              className="button-hover"
              style={{
                width: '100%',
                padding: '1.25rem',
                borderRadius: '16px',
                background: termsAccepted && phoneNumber ? 'var(--naver-green)' : 'rgba(255, 255, 255, 0.1)',
                color: termsAccepted && phoneNumber ? 'white' : 'var(--text-muted)',
                fontSize: '1.1rem',
                fontWeight: '800',
                border: 'none',
                cursor: termsAccepted && phoneNumber ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                boxShadow: termsAccepted && phoneNumber ? '0 10px 30px rgba(3, 199, 90, 0.3)' : 'none',
                marginBottom: '0.75rem',
                opacity: termsAccepted && phoneNumber ? 1 : 0.5,
                transition: 'all 0.3s',
              }}
            >
              <span style={{ fontSize: '1.3rem' }}>🟢</span>
              무제한으로 시작하기
              <Zap size={20} fill={termsAccepted ? 'white' : 'currentColor'} />
            </button>

            {/* Refund Policy Link */}
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
              구매 후 7일 이내 미사용 시 환불 가능.{' '}
              <a
                href="/refund"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--naver-green)', textDecoration: 'none' }}
              >
                환불정책 보기
              </a>
            </p>

            {/* Secondary Action */}
            <button
              onClick={onClose}
              className="button-hover"
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '16px',
                background: 'transparent',
                color: 'var(--text-dim)',
                fontSize: '0.95rem',
                fontWeight: '600',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                cursor: 'pointer',
                marginBottom: '2rem',
              }}
            >
              나중에 하기
            </button>

            {/* Footer */}
            <Footer />
          </div>
        </div>
      </div>
    </>
  );
};

export default SubscriptionModal;
