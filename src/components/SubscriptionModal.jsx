import React from 'react';
import { X, Sparkles, Zap, CheckCircle } from 'lucide-react';

/**
 * SubscriptionModal - Premium upsell modal with glass-morphism aesthetic
 * @param {boolean} isOpen - Controls modal visibility
 * @param {function} onClose - Handler for closing modal
 * @param {function} onSubscribe - Handler for subscription action
 * @param {number} remainingCount - Remaining free uses (0-30)
 */
const SubscriptionModal = ({ isOpen, onClose, onSubscribe, remainingCount = 0 }) => {
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
            overflow: 'hidden',
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
              무료 {remainingCount ? `${30 - remainingCount}회` : '30회'}를 모두 사용하셨어요. 이제 무제한으로 이어가세요!
            </p>

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

            {/* CTA Button */}
            <button
              onClick={onSubscribe}
              className="button-hover"
              style={{
                width: '100%',
                padding: '1.25rem',
                borderRadius: '16px',
                background: 'var(--naver-green)',
                color: 'white',
                fontSize: '1.1rem',
                fontWeight: '800',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                boxShadow: '0 10px 30px rgba(3, 199, 90, 0.3)',
                marginBottom: '0.75rem',
              }}
            >
              <span style={{ fontSize: '1.3rem' }}>🟢</span>
              무제한으로 시작하기
              <Zap size={20} fill="white" />
            </button>

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
              }}
            >
              나중에 하기
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SubscriptionModal;
