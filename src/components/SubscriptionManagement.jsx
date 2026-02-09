import React, { useState } from 'react';
import { Crown, Calendar, CreditCard, AlertCircle, ChevronRight, Shield, Check } from 'lucide-react';

/**
 * SubscriptionManagement - Full-screen subscription management interface
 * @param {object} subscriptionData - { tier: 'free'|'premium', nextPaymentDate: string, amount: number, paymentMethod: string }
 * @param {function} onCancel - Handler for subscription cancellation
 */
const SubscriptionManagement = ({ subscriptionData, onCancel }) => {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const isPremium = subscriptionData?.tier === 'premium';

  return (
    <div
      className="reveal"
      style={{
        padding: '2rem 1.5rem',
        maxWidth: '680px',
        margin: '0 auto',
        paddingBottom: '100px',
      }}
    >
      {/* Status Hero Card */}
      <div
        className="glass-heavy"
        style={{
          padding: '2.5rem',
          marginBottom: '1.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Gradient Decoration */}
        <div
          style={{
            position: 'absolute',
            top: '-50%',
            right: '-20%',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: isPremium
              ? 'radial-gradient(circle, rgba(3, 199, 90, 0.2), transparent)'
              : 'radial-gradient(circle, rgba(148, 163, 184, 0.1), transparent)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Status Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.6rem 1.2rem',
              borderRadius: '50px',
              background: isPremium ? 'rgba(3, 199, 90, 0.15)' : 'rgba(148, 163, 184, 0.1)',
              border: `2px solid ${isPremium ? 'var(--naver-green)' : 'var(--text-muted)'}`,
              marginBottom: '1.5rem',
            }}
          >
            {isPremium ? <Crown size={18} color="var(--naver-green)" fill="var(--naver-green)" /> : <Shield size={18} color="var(--text-muted)" />}
            <span
              style={{
                fontSize: '0.9rem',
                fontWeight: '800',
                color: isPremium ? 'var(--naver-green)' : 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {isPremium ? 'Premium' : 'Free'}
            </span>
          </div>

          {/* Plan Title */}
          <h1
            style={{
              fontSize: '2.5rem',
              fontWeight: '950',
              color: 'var(--text-main)',
              marginBottom: '0.75rem',
              letterSpacing: '-1px',
            }}
          >
            {isPremium ? '프리미엄 플랜' : '무료 플랜'}
          </h1>

          <p
            style={{
              fontSize: '1.05rem',
              color: 'var(--text-dim)',
              lineHeight: 1.6,
            }}
          >
            {isPremium
              ? '무제한으로 블로그 위저드를 사용하고 계세요'
              : '매월 10회까지 무료로 사용 가능합니다'}
          </p>
        </div>
      </div>

      {/* Premium Details */}
      {isPremium && (
        <>
          {/* Payment Info Card */}
          <div
            className="glass"
            style={{
              padding: '1.75rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1.25rem',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'rgba(3, 199, 90, 0.1)',
                border: '1px solid rgba(3, 199, 90, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Calendar size={28} color="var(--naver-green)" strokeWidth={2} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>다음 결제일</p>
              <p style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)' }}>
                {subscriptionData.nextPaymentDate || '2026-02-27'}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>결제 금액</p>
              <p className="premium-gradient" style={{ fontSize: '1.15rem', fontWeight: '900' }}>
                {subscriptionData.amount?.toLocaleString() || '2,000'}원
              </p>
            </div>
          </div>

          {/* Payment Method Card */}
          <div
            className="glass"
            style={{
              padding: '1.75rem',
              marginBottom: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'rgba(3, 199, 90, 0.1)',
                  border: '1px solid rgba(3, 199, 90, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CreditCard size={28} color="var(--naver-green)" strokeWidth={2} />
              </div>
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>결제 수단</p>
                <p style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-main)' }}>
                  {subscriptionData.paymentMethod || '네이버페이'}
                </p>
              </div>
            </div>
            <button
              className="button-hover"
              style={{
                padding: '0.75rem 1.25rem',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              변경
              <ChevronRight size={16} />
            </button>
          </div>
        </>
      )}

      {/* Features Section */}
      <div style={{ marginBottom: '2rem' }}>
        <h3
          style={{
            fontSize: '1.25rem',
            fontWeight: '800',
            color: 'var(--text-main)',
            marginBottom: '1rem',
          }}
        >
          {isPremium ? '현재 이용중인 혜택' : '프리미엄 혜택'}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            { icon: Check, text: '무제한 블로그 글 생성', available: isPremium },
            { icon: Check, text: '이미지 무제한 업로드', available: isPremium },
            { icon: Check, text: '고급 AI 편집 기능', available: isPremium },
            { icon: Check, text: '우선 고객 지원', available: isPremium },
          ].map((feature, idx) => (
            <div
              key={idx}
              className="glass"
              style={{
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                opacity: isPremium || idx === 0 ? 1 : 0.5,
              }}
            >
              <feature.icon
                size={20}
                color={feature.available ? 'var(--naver-green)' : 'var(--text-muted)'}
                strokeWidth={2.5}
              />
              <span
                style={{
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  color: feature.available ? 'var(--text-main)' : 'var(--text-dim)',
                }}
              >
                {feature.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      {isPremium ? (
        <button
          onClick={() => setShowCancelDialog(true)}
          className="button-hover"
          style={{
            width: '100%',
            padding: '1.25rem',
            borderRadius: '16px',
            background: 'transparent',
            border: '2px solid var(--danger)',
            color: 'var(--danger)',
            fontSize: '1rem',
            fontWeight: '800',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
          }}
        >
          <AlertCircle size={20} />
          구독 취소하기
        </button>
      ) : (
        <button
          className="button-hover"
          style={{
            width: '100%',
            padding: '1.5rem',
            borderRadius: '16px',
            background: 'var(--premium-gradient)',
            border: 'none',
            color: 'white',
            fontSize: '1.1rem',
            fontWeight: '900',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-green)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
          }}
        >
          <Crown size={22} fill="white" />
          프리미엄으로 업그레이드
        </button>
      )}

      {/* Cancel Confirmation Dialog */}
      {showCancelDialog && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(8px)',
              zIndex: 9998,
              animation: 'fadeIn 0.2s',
            }}
            onClick={() => setShowCancelDialog(false)}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'min(400px, 90vw)',
              zIndex: 9999,
              animation: 'scaleIn 0.3s',
            }}
          >
            <div className="glass-heavy" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '1rem', color: 'var(--text-main)' }}>
                정말 취소하시겠어요?
              </h3>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-dim)', marginBottom: '2rem', lineHeight: 1.6 }}>
                구독을 취소하시면 다음 결제일부터 프리미엄 혜택을 이용할 수 없습니다.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => setShowCancelDialog(false)}
                  className="button-hover"
                  style={{
                    flex: 1,
                    padding: '1rem',
                    borderRadius: '12px',
                    background: 'var(--naver-green)',
                    border: 'none',
                    color: 'white',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  계속 이용하기
                </button>
                <button
                  onClick={() => {
                    onCancel?.();
                    setShowCancelDialog(false);
                  }}
                  className="button-hover"
                  style={{
                    flex: 1,
                    padding: '1rem',
                    borderRadius: '12px',
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'var(--text-dim)',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  취소하기
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SubscriptionManagement;
