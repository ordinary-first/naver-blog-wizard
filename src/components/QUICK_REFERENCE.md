# Subscription Components - Quick Reference

## Import

```jsx
import {
  SubscriptionModal,
  SubscriptionManagement,
  SubscriptionBadge
} from './components';
```

---

## SubscriptionModal

**When to use:** Show when free limit reached

```jsx
<SubscriptionModal
  isOpen={count >= 30}
  onClose={() => setShowModal(false)}
  onSubscribe={handleCheckout}
  remainingCount={0}
/>
```

**Props:**
- `isOpen` (boolean) - Show/hide modal
- `onClose` (function) - Close handler
- `onSubscribe` (function) - Subscribe button handler
- `remainingCount` (number) - Remaining free uses

---

## SubscriptionManagement

**When to use:** Settings/account page

```jsx
<SubscriptionManagement
  subscriptionData={{
    tier: 'premium',
    nextPaymentDate: '2026-02-27',
    amount: 2000,
    paymentMethod: '네이버페이'
  }}
  onCancel={handleCancel}
/>
```

**Props:**
- `subscriptionData` (object)
  - `tier` ('free' | 'premium')
  - `nextPaymentDate` (string)
  - `amount` (number)
  - `paymentMethod` (string)
- `onCancel` (function) - Cancel handler

---

## SubscriptionBadge

**When to use:** Header/navigation

```jsx
// Full badge
<SubscriptionBadge
  tier="free"
  count={25}
  limit={30}
  size="md"
/>

// Premium
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

**Props:**
- `tier` ('free' | 'premium')
- `count` (number) - Current usage
- `limit` (number) - Max limit (default: 30)
- `size` ('sm' | 'md' | 'lg')
- `minimal` (boolean) - Icon only

**States:**
- Normal: Gray badge
- Warning (≤5): Red badge
- Premium: Green gradient with shimmer

---

## State Structure

```jsx
const [subscriptionData, setSubscriptionData] = useState({
  tier: 'free',
  usageCount: 0,
  limit: 30,
  nextPaymentDate: null,
  amount: 2000,
  paymentMethod: '네이버페이'
});
```

---

## Common Patterns

### Increment on usage
```jsx
if (subscriptionData.tier === 'free') {
  const newCount = subscriptionData.usageCount + 1;
  setSubscriptionData(prev => ({ ...prev, usageCount: newCount }));

  if (newCount >= subscriptionData.limit) {
    setShowSubscriptionModal(true);
  }
}
```

### Check if can use
```jsx
const canUse = subscriptionData.tier === 'premium' ||
               subscriptionData.usageCount < subscriptionData.limit;

if (!canUse) {
  setShowSubscriptionModal(true);
  return;
}
```

### Handle upgrade
```jsx
const handleSubscribe = async () => {
  const result = await initiateNaverPay();
  if (result.success) {
    setSubscriptionData(prev => ({
      ...prev,
      tier: 'premium',
      usageCount: 0
    }));
  }
};
```

---

## Styling Classes (from index.css)

- `.glass` - Light glass effect
- `.glass-heavy` - Heavy glass effect
- `.button-hover` - Hover animation
- `.premium-gradient` - Gradient text
- `.reveal` - Fade-in animation

**CSS Variables:**
- `--naver-green` - Primary green
- `--premium-gradient` - Gradient
- `--danger` - Red for warnings
- `--text-main` - Main text color
- `--text-dim` - Dimmed text

---

## Mobile Responsive

All components auto-adjust:
- Modal: 92vw width on mobile
- Badge: Use `size="sm"` on mobile
- Management: Single column layout

---

## Files

- `SubscriptionModal.jsx` - 225 lines
- `SubscriptionManagement.jsx` - 379 lines
- `SubscriptionBadge.jsx` - 171 lines
- `SubscriptionExample.jsx` - 287 lines (demo)
- `README.md` - Full documentation
- `QUICK_REFERENCE.md` - This file

**Total:** 1,382 lines

---

## View Demo

1. Static: Open `subscription-demo.html`
2. Interactive: Import `SubscriptionExample.jsx`

---

## Need Help?

- Component docs: `README.md`
- Implementation: `SUBSCRIPTION_IMPLEMENTATION.md`
- Example usage: `SubscriptionExample.jsx`
