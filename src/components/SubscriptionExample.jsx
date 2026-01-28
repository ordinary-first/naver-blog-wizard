import React, { useState } from 'react';
import SubscriptionModal from './SubscriptionModal';
import SubscriptionManagement from './SubscriptionManagement';
import SubscriptionBadge from './SubscriptionBadge';

/**
 * Example usage of subscription components
 * This file demonstrates how to integrate the subscription UI into your app
 */
const SubscriptionExample = () => {
  const [showModal, setShowModal] = useState(false);
  const [view, setView] = useState('badges'); // 'badges' | 'management'

  // Example subscription state
  const [subscriptionData, setSubscriptionData] = useState({
    tier: 'free', // 'free' | 'premium'
    count: 25, // Current usage count
    limit: 30, // Free tier limit
    nextPaymentDate: '2026-02-27',
    amount: 2000,
    paymentMethod: '네이버페이',
  });

  const handleSubscribe = () => {
    console.log('Navigate to payment flow...');
    // Implement Naver Pay integration here
    setShowModal(false);

    // After successful payment:
    setSubscriptionData({
      ...subscriptionData,
      tier: 'premium',
    });
  };

  const handleCancelSubscription = () => {
    console.log('Cancel subscription...');
    setSubscriptionData({
      ...subscriptionData,
      tier: 'free',
      count: 0,
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-dark)',
      padding: '2rem',
    }}>
      {/* Navigation */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto 2rem',
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
      }}>
        <button
          onClick={() => setView('badges')}
          className="button-hover"
          style={{
            padding: '1rem 1.5rem',
            borderRadius: '12px',
            background: view === 'badges' ? 'var(--naver-green)' : 'var(--glass)',
            border: '1px solid var(--glass-border)',
            color: 'white',
            fontWeight: '700',
            cursor: 'pointer',
          }}
        >
          Badge Examples
        </button>
        <button
          onClick={() => setView('management')}
          className="button-hover"
          style={{
            padding: '1rem 1.5rem',
            borderRadius: '12px',
            background: view === 'management' ? 'var(--naver-green)' : 'var(--glass)',
            border: '1px solid var(--glass-border)',
            color: 'white',
            fontWeight: '700',
            cursor: 'pointer',
          }}
        >
          Management View
        </button>
        <button
          onClick={() => setShowModal(true)}
          className="button-hover"
          style={{
            padding: '1rem 1.5rem',
            borderRadius: '12px',
            background: 'var(--danger)',
            border: 'none',
            color: 'white',
            fontWeight: '700',
            cursor: 'pointer',
          }}
        >
          Trigger Modal
        </button>
        <button
          onClick={() => setSubscriptionData(prev => ({
            ...prev,
            tier: prev.tier === 'free' ? 'premium' : 'free'
          }))}
          className="button-hover"
          style={{
            padding: '1rem 1.5rem',
            borderRadius: '12px',
            background: 'var(--glass)',
            border: '1px solid var(--glass-border)',
            color: 'white',
            fontWeight: '700',
            cursor: 'pointer',
          }}
        >
          Toggle Tier
        </button>
      </div>

      {/* Badge Examples */}
      {view === 'badges' && (
        <div className="reveal" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: '900',
            color: 'var(--text-main)',
            marginBottom: '2rem',
          }}>
            SubscriptionBadge Examples
          </h2>

          {/* Size Variations */}
          <div className="glass-heavy" style={{ padding: '2rem', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '1.5rem' }}>
              Sizes (Free Tier)
            </h3>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <SubscriptionBadge tier="free" count={10} limit={30} size="sm" />
              <SubscriptionBadge tier="free" count={10} limit={30} size="md" />
              <SubscriptionBadge tier="free" count={10} limit={30} size="lg" />
            </div>
          </div>

          {/* Premium Variations */}
          <div className="glass-heavy" style={{ padding: '2rem', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '1.5rem' }}>
              Premium Badge
            </h3>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <SubscriptionBadge tier="premium" size="sm" />
              <SubscriptionBadge tier="premium" size="md" />
              <SubscriptionBadge tier="premium" size="lg" />
            </div>
          </div>

          {/* Warning State */}
          <div className="glass-heavy" style={{ padding: '2rem', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '1.5rem' }}>
              Low Usage Warning (5 remaining)
            </h3>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <SubscriptionBadge tier="free" count={25} limit={30} size="sm" />
              <SubscriptionBadge tier="free" count={25} limit={30} size="md" />
              <SubscriptionBadge tier="free" count={25} limit={30} size="lg" />
            </div>
          </div>

          {/* Minimal Versions */}
          <div className="glass-heavy" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '1.5rem' }}>
              Minimal (Icon Only)
            </h3>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <SubscriptionBadge tier="premium" minimal />
              <SubscriptionBadge tier="free" count={10} limit={30} minimal />
              <SubscriptionBadge tier="free" count={28} limit={30} minimal />
            </div>
          </div>

          {/* Integration Example */}
          <div className="glass-heavy" style={{ padding: '2rem', marginTop: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '1.5rem' }}>
              In Header Context
            </h3>
            <div style={{
              background: 'var(--bg-card)',
              padding: '1rem 1.5rem',
              borderRadius: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-main)' }}>
                블로그 위저드
              </h1>
              <SubscriptionBadge
                tier={subscriptionData.tier}
                count={subscriptionData.count}
                limit={subscriptionData.limit}
                size="md"
              />
            </div>
          </div>
        </div>
      )}

      {/* Management View */}
      {view === 'management' && (
        <SubscriptionManagement
          subscriptionData={subscriptionData}
          onCancel={handleCancelSubscription}
        />
      )}

      {/* Modal */}
      <SubscriptionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubscribe={handleSubscribe}
        remainingCount={subscriptionData.limit - subscriptionData.count}
      />

      {/* Usage Instructions */}
      <div style={{
        maxWidth: '1200px',
        margin: '3rem auto',
        padding: '2rem',
        background: 'var(--glass)',
        borderRadius: '20px',
        border: '1px solid var(--glass-border)',
      }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '1rem' }}>
          Integration Guide
        </h3>
        <pre style={{
          background: 'var(--bg-card)',
          padding: '1.5rem',
          borderRadius: '12px',
          overflow: 'auto',
          fontSize: '0.85rem',
          color: 'var(--text-dim)',
          lineHeight: 1.6,
        }}>
{`// Import components
import {
  SubscriptionModal,
  SubscriptionManagement,
  SubscriptionBadge
} from './components';

// 1. Add badge to header
<SubscriptionBadge
  tier={user.tier}
  count={user.usageCount}
  limit={30}
  size="md"
/>

// 2. Show modal when limit reached
<SubscriptionModal
  isOpen={usageCount >= 30}
  onClose={() => setShowModal(false)}
  onSubscribe={handleNaverPayCheckout}
  remainingCount={30 - usageCount}
/>

// 3. Add management screen
<SubscriptionManagement
  subscriptionData={{
    tier: 'premium',
    nextPaymentDate: '2026-02-27',
    amount: 2000,
    paymentMethod: '네이버페이'
  }}
  onCancel={handleCancelSubscription}
/>`}
        </pre>
      </div>
    </div>
  );
};

export default SubscriptionExample;
