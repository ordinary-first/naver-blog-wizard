# Subscription UI Components

Premium subscription interface components with glass-morphism design aesthetic. Built to match the existing Naver Blog Wizard design system.

## Components

### 1. SubscriptionModal

Modal dialog shown when free usage limit is reached.

**Props:**
- `isOpen` (boolean) - Controls modal visibility
- `onClose` (function) - Handler for closing modal
- `onSubscribe` (function) - Handler for subscription action
- `remainingCount` (number) - Remaining free uses (0-30)

**Usage:**
```jsx
import { SubscriptionModal } from './components';

<SubscriptionModal
  isOpen={usageCount >= 30}
  onClose={() => setShowModal(false)}
  onSubscribe={handleNaverPayCheckout}
  remainingCount={30 - usageCount}
/>
```

**Features:**
- Glass-morphism card with blur backdrop
- Premium gradient accents
- Animated feature list with staggered reveal
- Primary CTA with Naver green
- Secondary "나중에 하기" action
- Responsive mobile design

---

### 2. SubscriptionManagement

Full-screen subscription management interface.

**Props:**
- `subscriptionData` (object) - Subscription details
  - `tier` ('free' | 'premium')
  - `nextPaymentDate` (string) - ISO date string
  - `amount` (number) - Payment amount in KRW
  - `paymentMethod` (string) - Payment method name
- `onCancel` (function) - Handler for subscription cancellation

**Usage:**
```jsx
import { SubscriptionManagement } from './components';

<SubscriptionManagement
  subscriptionData={{
    tier: 'premium',
    nextPaymentDate: '2026-02-27',
    amount: 2000,
    paymentMethod: '네이버페이'
  }}
  onCancel={handleCancelSubscription}
/>
```

**Features:**
- Hero status card with gradient decoration
- Payment info cards (date, amount, method)
- Premium features checklist
- Upgrade CTA for free users
- Cancel subscription button with confirmation dialog
- Premium/Free tier visual differentiation

---

### 3. SubscriptionBadge

Compact tier indicator badge for headers and navigation.

**Props:**
- `tier` ('free' | 'premium') - Subscription tier
- `count` (number) - Current usage count (for free tier)
- `limit` (number) - Usage limit (default: 30)
- `size` ('sm' | 'md' | 'lg') - Badge size variant
- `minimal` (boolean) - Show icon-only version

**Usage:**
```jsx
import { SubscriptionBadge } from './components';

// Full badge
<SubscriptionBadge
  tier="free"
  count={25}
  limit={30}
  size="md"
/>

// Premium badge
<SubscriptionBadge
  tier="premium"
  size="lg"
/>

// Minimal (icon only)
<SubscriptionBadge
  tier="premium"
  minimal
/>
```

**Features:**
- Three size variants (sm, md, lg)
- Premium shimmer animation
- Free tier progress bar
- Warning state when ≤5 uses remaining
- Minimal icon-only mode
- Responsive and accessible

---

## Design System

All components follow the existing design patterns:

### Colors
- **Primary:** `var(--naver-green)` - #03c75a
- **Hover:** `var(--naver-hover)` - #02a84c
- **Premium Gradient:** `linear-gradient(135deg, #03c75a, #00f2fe)`
- **Danger:** `var(--danger)` - #ef4444

### Glass Effects
- **Glass:** `rgba(255, 255, 255, 0.03)` with `blur(16px)`
- **Glass Heavy:** `rgba(255, 255, 255, 0.05)` with `blur(20px)`
- **Borders:** `rgba(255, 255, 255, 0.08-0.12)`

### Animations
- **Reveal:** Fade + translateY on mount
- **Scale In:** Fade + scale for modals
- **Slide In Right:** Staggered list reveals
- **Pulse Green:** Glow effect on CTAs
- **Shimmer:** Premium badge effect

### Typography
- **Headings:** 900 weight, tight letter-spacing
- **Body:** Pretendard font family
- **Premium Text:** Gradient background-clip

### Interactions
- `.button-hover` class for all interactive elements
- Smooth cubic-bezier transitions
- Transform on hover (-2px translateY)
- Scale on active press (0.96)

---

## Integration Example

See `SubscriptionExample.jsx` for a complete working demo.

### Basic Setup

1. **Import components:**
```jsx
import {
  SubscriptionModal,
  SubscriptionManagement,
  SubscriptionBadge
} from './components';
```

2. **Add state management:**
```jsx
const [subscriptionData, setSubscriptionData] = useState({
  tier: 'free',
  count: 0,
  limit: 30,
  nextPaymentDate: null,
  amount: 2000,
  paymentMethod: '네이버페이'
});
```

3. **Implement handlers:**
```jsx
const handleSubscribe = async () => {
  // Integrate Naver Pay checkout
  const result = await initiateNaverPay();
  if (result.success) {
    setSubscriptionData(prev => ({ ...prev, tier: 'premium' }));
  }
};

const handleCancel = async () => {
  // Cancel subscription API call
  await cancelSubscription();
  setSubscriptionData(prev => ({ ...prev, tier: 'free', count: 0 }));
};
```

4. **Add to UI:**
```jsx
// In header
<SubscriptionBadge tier={subscriptionData.tier} count={subscriptionData.count} />

// Trigger on limit
{subscriptionData.count >= subscriptionData.limit && (
  <SubscriptionModal
    isOpen
    onClose={() => {}}
    onSubscribe={handleSubscribe}
    remainingCount={0}
  />
)}

// Settings page
<SubscriptionManagement
  subscriptionData={subscriptionData}
  onCancel={handleCancel}
/>
```

---

## Mobile Responsiveness

All components are fully responsive:

- **Modal:** Scales to 92vw on mobile, touch-friendly buttons
- **Management:** Single column layout, compact cards
- **Badge:** Small size recommended for mobile headers

Test on:
- Desktop (1920x1080)
- Tablet (768x1024)
- Mobile (375x667)

---

## Accessibility

- Semantic HTML structure
- Keyboard navigation support
- Focus states on interactive elements
- ARIA labels where needed
- Color contrast ratios meet WCAG AA

---

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

Requires:
- CSS `backdrop-filter` support
- CSS custom properties
- Flexbox/Grid

---

## File Structure

```
src/components/
├── index.js                      # Export barrel
├── SubscriptionModal.jsx         # Upsell modal
├── SubscriptionManagement.jsx    # Management screen
├── SubscriptionBadge.jsx         # Tier indicator
├── SubscriptionExample.jsx       # Demo/reference
└── README.md                     # This file
```

---

## Next Steps

1. **Backend Integration:**
   - Add Supabase subscription table
   - Track usage count per user
   - Store payment metadata

2. **Payment Integration:**
   - Implement Naver Pay checkout flow
   - Handle webhook callbacks
   - Update subscription status

3. **Analytics:**
   - Track modal impressions
   - Monitor conversion rates
   - A/B test pricing/copy

4. **Testing:**
   - Unit tests for components
   - E2E subscription flow
   - Payment sandbox testing

---

## Design Philosophy

These components follow a **brutally bold aesthetic**:

- **High contrast** - Dark backgrounds with vibrant Naver green
- **Glass-morphism** - Layered translucency creates depth
- **Micro-interactions** - Smooth animations delight users
- **Premium feel** - Gradients and glows signal value
- **Clear hierarchy** - Typography scale guides attention

The goal: Make premium feel premium, and make the upsell irresistible.

---

Built with love for Naver Blog Wizard ✨
