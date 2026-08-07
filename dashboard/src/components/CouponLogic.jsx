// CouponLogic.jsx — the reason→action playbook. Makes the core strategy obvious:
// match the RIGHT action to the RIGHT reason, and give coupons ONLY to the
// genuinely-unsure — never to sure buyers.
import React from 'react'

const PLAYBOOK = [
  { icon: '😎', reason: 'Sure buyer', signal: 'Full cart, straight to payment, low risk', action: 'Do nothing', coupon: false, why: 'They buy anyway — a coupon just burns margin.' },
  { icon: '💳', reason: 'Payment failure', signal: '1 failed UPI/card attempt', action: 'Payment retry help', coupon: false, why: 'Fix the payment, not the price. Free.' },
  { icon: '💵', reason: 'Repeated UPI failure', signal: '2+ failed attempts', action: 'Cash on Delivery', coupon: false, why: 'The rail is broken — bypass it with COD (India).' },
  { icon: '🚚', reason: 'Shipping shock', signal: 'Bounced fast at checkout', action: 'Free shipping', coupon: false, why: 'Targets the exact objection, cheaper than a coupon.' },
  { icon: '📅', reason: 'Delivery too slow', signal: 'Long promised delivery date', action: 'Faster delivery', coupon: false, why: 'Offer expedited delivery / a guarantee. Free.' },
  { icon: '😴', reason: 'Left cart (distracted)', signal: 'Added to cart, never checked out', action: 'WhatsApp / email reminder', coupon: false, why: 'A gentle nudge beats giving away margin.' },
  { icon: '🛍️', reason: 'Price-shopping (unsure)', signal: 'Heavy browsing, high value, high risk', action: 'Small coupon 🎟️', coupon: true, why: 'The ONE case a coupon is justified — capped by budget.' },
]

export default function CouponLogic() {
  return (
    <div>
      <h3 className="text-base font-bold flex items-center gap-2">🎟️ The Coupon Playbook
        <span className="text-[9px] text-muted font-medium bg-ink px-1.5 py-0.5 rounded">right action → right reason</span>
      </h3>
      <p className="text-muted text-[12px] mb-4">
        The golden rule: <b className="text-good">match the action to the reason</b>, and give a coupon <b className="text-warn">only to the genuinely unsure</b> — never to someone who'd buy anyway.
      </p>

      <div className="overflow-hidden rounded-xl border border-line">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-soft text-muted text-[11px] uppercase tracking-wide">
              <th className="text-left px-3 py-2">Reason</th>
              <th className="text-left px-3 py-2 hidden md:table-cell">Signal</th>
              <th className="text-left px-3 py-2">Smart action</th>
              <th className="text-center px-3 py-2">Coupon?</th>
            </tr>
          </thead>
          <tbody>
            {PLAYBOOK.map((r, i) => (
              <tr key={i} className={`border-t border-line ${r.coupon ? 'bg-warn/5' : ''}`}>
                <td className="px-3 py-2.5"><span className="mr-1.5">{r.icon}</span>{r.reason}</td>
                <td className="px-3 py-2.5 text-muted hidden md:table-cell text-[12px]">{r.signal}</td>
                <td className="px-3 py-2.5 font-medium">{r.action}</td>
                <td className="px-3 py-2.5 text-center">
                  {r.coupon
                    ? <span className="text-warn font-bold">✅ Yes</span>
                    : <span className="text-muted">✕ No</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 bg-good/10 border border-good/25 rounded-xl p-3 text-[13px] leading-relaxed">
        💡 <b className="text-good">Why this wins:</b> Only <b>1 of 7</b> reasons ever gets a coupon — and only when the cart is worthwhile and the shopper is truly at risk. That's how we spend <b>99% less discount</b> than "coupon-to-everyone" while recovering more carts.
      </div>
    </div>
  )
}
