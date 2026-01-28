import React from 'react';
import { Crown, Sparkles } from 'lucide-react';

/**
 * SubscriptionBadge - Compact tier indicator badge
 * @param {string} tier - 'free' | 'premium'
 * @param {number} count - Current usage count (for free tier)
 * @param {number} limit - Usage limit (default 30)
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {boolean} minimal - Show minimal version (icon only)
 */
const SubscriptionBadge = ({ tier = 'free', count = 0, limit = 30, size = 'md', minimal = false }) => {
  const isPremium = tier === 'premium';
  const remaining = limit - count;
  const percentage = (count / limit) * 100;

  // Size configurations
  const sizes = {
    sm: {
      padding: '0.35rem 0.75rem',
      fontSize: '0.75rem',
      iconSize: 14,
      gap: '0.4rem',
    },
    md: {
      padding: '0.5rem 1rem',
      fontSize: '0.85rem',
      iconSize: 16,
      gap: '0.5rem',
    },
    lg: {
      padding: '0.65rem 1.25rem',
      fontSize: '0.95rem',
      iconSize: 18,
      gap: '0.6rem',
    },
  };

  const sizeConfig = sizes[size];

  // Color scheme with progressive urgency
  const getColorScheme = () => {
    if (isPremium) {
      return {
        background: 'linear-gradient(135deg, rgba(3, 199, 90, 0.15), rgba(0, 242, 254, 0.15))',
        border: '2px solid rgba(3, 199, 90, 0.4)',
        color: 'var(--naver-green)',
        shadow: '0 4px 12px rgba(3, 199, 90, 0.2)',
      };
    }

    // Free tier: Color based on remaining count
    if (remaining <= 1) {
      // 29-30 사용 (0-1 남음): 빨간색 (긴급)
      return {
        background: 'rgba(239, 68, 68, 0.12)',
        border: '2px solid rgba(239, 68, 68, 0.4)',
        color: '#ef4444',
        shadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
      };
    } else if (remaining <= 4) {
      // 26-28 사용 (2-4 남음): 주황색 (경고)
      return {
        background: 'rgba(251, 146, 60, 0.12)',
        border: '2px solid rgba(251, 146, 60, 0.4)',
        color: '#fb923c',
        shadow: '0 4px 12px rgba(251, 146, 60, 0.2)',
      };
    } else {
      // 0-25 사용 (5-30 남음): 초록색 (정상)
      return {
        background: 'rgba(3, 199, 90, 0.1)',
        border: '2px solid rgba(3, 199, 90, 0.3)',
        color: 'var(--naver-green)',
        shadow: '0 4px 12px rgba(3, 199, 90, 0.15)',
      };
    }
  };

  const badgeStyle = getColorScheme();

  if (minimal) {
    return (
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '12px',
          background: badgeStyle.background,
          border: badgeStyle.border,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: badgeStyle.shadow,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        title={isPremium ? 'Premium' : `${remaining}/${limit} 남음`}
      >
        {isPremium ? (
          <Crown size={18} color={badgeStyle.color} fill={badgeStyle.color} strokeWidth={2} />
        ) : (
          <span style={{ fontSize: '0.75rem', fontWeight: '900', color: badgeStyle.color }}>
            {remaining}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: sizeConfig.gap,
        padding: sizeConfig.padding,
        borderRadius: '50px',
        background: badgeStyle.background,
        border: badgeStyle.border,
        boxShadow: badgeStyle.shadow,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Shimmer effect for premium */}
      {isPremium && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
            animation: 'shimmer 3s infinite',
          }}
        />
      )}

      {/* Icon */}
      {isPremium ? (
        <Crown size={sizeConfig.iconSize} color={badgeStyle.color} fill={badgeStyle.color} strokeWidth={2.5} />
      ) : (
        <Sparkles size={sizeConfig.iconSize} color={badgeStyle.color} strokeWidth={2.5} />
      )}

      {/* Text Content */}
      <span
        style={{
          fontSize: sizeConfig.fontSize,
          fontWeight: '800',
          color: badgeStyle.color,
          letterSpacing: '0.3px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {isPremium
          ? 'Premium'
          : remaining <= 1
            ? `${remaining}/${limit} 남음!`
            : `무료 ${count}/${limit}`}
      </span>

      {/* Progress bar for free tier */}
      {!isPremium && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: '3px',
            width: `${percentage}%`,
            background: remaining <= 1 ? '#ef4444' : remaining <= 4 ? '#fb923c' : 'var(--naver-green)',
            borderRadius: '50px',
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: 0.5,
          }}
        />
      )}
    </div>
  );
};

// Add shimmer animation to global styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes shimmer {
      0% { left: -100%; }
      100% { left: 200%; }
    }
  `;
  if (!document.head.querySelector('style[data-shimmer]')) {
    styleSheet.setAttribute('data-shimmer', 'true');
    document.head.appendChild(styleSheet);
  }
}

export default SubscriptionBadge;
