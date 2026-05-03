import { useLocation, Link } from 'react-router-dom';

export default function OrderSuccessPage() {
  const { state } = useLocation();
  const orderNumber = state?.order_number || '—';
  const totalAmount = state?.total_amount;

  return (
    <div className="success-page">
      <div className="success-card">
        <div className="success-icon">✅</div>
        <h1 className="success-title">訂單送出成功！</h1>
        <p className="success-subtitle">
          感謝您的愛心購買！我們已收到您的訂單，
          協會人員將盡快與您聯繫確認付款方式與取貨安排。
        </p>

        <div className="success-order-num">
          <div className="success-order-label">訂單編號</div>
          <div className="success-order-value">{orderNumber}</div>
        </div>

        {totalAmount !== undefined && (
          <div className="success-total">
            訂單金額：<strong>NT${Number(totalAmount).toLocaleString()}</strong>
          </div>
        )}

        <div
          style={{
            padding: '16px 20px',
            background: 'var(--primary-light)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 14,
            color: 'var(--text-light)',
            lineHeight: 1.7,
            marginBottom: 24,
            textAlign: 'left',
          }}
        >
          您的愛心將幫助更多聽損族群得到支持，謝謝您！
        </div>

        <Link to="/" className="back-to-shop-btn">
          ← 繼續選購
        </Link>
      </div>
    </div>
  );
}
