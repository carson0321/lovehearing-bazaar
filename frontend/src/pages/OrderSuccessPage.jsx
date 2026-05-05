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
          感謝您的愛心購買！您的愛心將幫助更多聽損族群得到支持。
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

        {/* Bank transfer info */}
        <div className="bank-info-box" style={{ textAlign: 'left', marginBottom: 16 }}>
          <div className="bank-info-title">💳 請完成匯款</div>
          <div className="bank-info-row">
            <span>銀行</span>
            <span>合作金庫銀行（006）長安分行</span>
          </div>
          <div className="bank-info-row">
            <span>帳號</span>
            <strong style={{ letterSpacing: 1 }}>0888717136030</strong>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 8, lineHeight: 1.6 }}>
            匯款完成後，請點下方按鈕填寫帳號後五碼，協會確認後將盡快安排出貨。
          </div>
        </div>

        <Link to="/transfer" className="btn btn-primary" style={{ display: 'block', textAlign: 'center', marginBottom: 12, padding: '13px' }}>
          前往填寫匯款帳號後五碼 →
        </Link>

        <Link to="/" className="back-to-shop-btn">
          ← 繼續選購
        </Link>
      </div>
    </div>
  );
}
