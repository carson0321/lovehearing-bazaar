import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

const SHIPPING_LABELS = { '711': '超商取貨', delivery: '宅配', pickup: '自取' };

function formatDate(str) {
  const d = new Date(str);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

export default function TransferPage() {
  // step: 'lookup' | 'select' | 'report' | 'success'
  const [step, setStep] = useState('lookup');
  const [identity, setIdentity] = useState({ customer_email: '', customer_phone: '' });
  const [identityErrors, setIdentityErrors] = useState({});
  const [looking, setLooking] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [last5, setLast5] = useState('');
  const [last5Error, setLast5Error] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successOrder, setSuccessOrder] = useState('');

  function validateIdentity() {
    const errs = {};
    if (!identity.customer_email.trim()) {
      errs.customer_email = '請填寫 Email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity.customer_email)) {
      errs.customer_email = 'Email 格式不正確';
    }
    if (!identity.customer_phone.trim()) errs.customer_phone = '請填寫聯絡電話';
    return errs;
  }

  async function handleLookup(e) {
    e.preventDefault();
    const errs = validateIdentity();
    setIdentityErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLooking(true);
    setLookupError('');
    try {
      const result = await api.lookupOrders(identity);
      setOrders(result);
      setStep('select');
    } catch (err) {
      setLookupError(err.message || '查詢失敗，請稍後再試');
    } finally {
      setLooking(false);
    }
  }

  function handleSelectOrder(order) {
    setSelectedOrder(order);
    setLast5('');
    setLast5Error('');
    setSubmitError('');
    setStep('report');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!/^\d{5}$/.test(last5)) {
      setLast5Error('須為5位數字');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const result = await api.reportTransfer({
        customer_email: identity.customer_email,
        customer_phone: identity.customer_phone,
        order_number: selectedOrder.order_number,
        transfer_last5: last5,
      });
      setSuccessOrder(result.order_number);
      setStep('success');
    } catch (err) {
      setSubmitError(err.message || '送出失敗，請稍後再試');
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 'success') {
    return (
      <div className="success-page">
        <div className="success-card">
          <div className="success-icon">💛</div>
          <h1 className="success-title">匯款資訊已送出！</h1>
          <p className="success-subtitle">協會收到您的匯款回報後將盡快確認，感謝您的愛心！</p>
          <div className="success-order-num">
            <div className="success-order-label">訂單編號</div>
            <div className="success-order-value">{successOrder}</div>
          </div>
          <Link to="/" className="back-to-shop-btn" style={{ marginTop: 8 }}>← 回首頁</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <h1 className="checkout-title">
        <button
          onClick={() => {
            if (step === 'report') setStep('select');
            else if (step === 'select') setStep('lookup');
          }}
          style={{ background: 'none', border: 'none', cursor: step === 'lookup' ? 'default' : 'pointer', color: 'var(--text-muted)', fontSize: 20, padding: 0, marginRight: 8 }}
        >
          {step === 'lookup' ? <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>←</Link> : '←'}
        </button>
        匯款回報
      </h1>

      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div className="bank-info-box" style={{ marginBottom: 24 }}>
          <div className="bank-info-title">💳 匯款資訊</div>
          <div className="bank-info-row">
            <span>銀行</span>
            <span>合作金庫銀行（006）長安分行</span>
          </div>
          <div className="bank-info-row">
            <span>帳號</span>
            <strong style={{ letterSpacing: 1 }}>0888717136030</strong>
          </div>
        </div>

        {/* Step 1: lookup */}
        {step === 'lookup' && (
          <div className="checkout-form-section" style={{ borderRadius: 'var(--radius-lg)', padding: 24, background: 'var(--white)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-light)' }}>
            <div className="form-section-title" style={{ marginBottom: 8 }}>查詢您的訂單</div>
            <p style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 20, lineHeight: 1.6 }}>
              請填寫下單時使用的 Email 與聯絡電話，系統將列出您的訂單供您選擇。
            </p>

            {lookupError && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠ {lookupError}</div>}

            <form onSubmit={handleLookup}>
              <div className="form-group">
                <label className="form-label">Email <span className="required">*</span></label>
                <input
                  className="form-input"
                  name="customer_email"
                  type="email"
                  value={identity.customer_email}
                  onChange={(e) => {
                    setIdentity((p) => ({ ...p, customer_email: e.target.value }));
                    if (identityErrors.customer_email) setIdentityErrors((p) => ({ ...p, customer_email: '' }));
                  }}
                  placeholder="請輸入下單時填寫的 Email"
                />
                {identityErrors.customer_email && <div className="form-error">{identityErrors.customer_email}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">聯絡電話 <span className="required">*</span></label>
                <input
                  className="form-input"
                  name="customer_phone"
                  type="tel"
                  value={identity.customer_phone}
                  onChange={(e) => {
                    setIdentity((p) => ({ ...p, customer_phone: e.target.value }));
                    if (identityErrors.customer_phone) setIdentityErrors((p) => ({ ...p, customer_phone: '' }));
                  }}
                  placeholder="請輸入下單時填寫的聯絡電話"
                />
                {identityErrors.customer_phone && <div className="form-error">{identityErrors.customer_phone}</div>}
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '13px', marginTop: 8 }} disabled={looking}>
                {looking ? <><span className="spinner" /> 查詢中...</> : '查詢我的訂單'}
              </button>
            </form>
          </div>
        )}

        {/* Step 2: select order */}
        {step === 'select' && (
          <div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>
              找到 <strong>{orders.length}</strong> 筆訂單，請選擇要回報匯款的訂單：
            </div>
            {orders.map((order) => (
              <div
                key={order.order_number}
                className="transfer-order-card"
                onClick={() => !order.transfer_last5 && handleSelectOrder(order)}
                style={{ opacity: order.transfer_last5 ? 0.6 : 1, cursor: order.transfer_last5 ? 'default' : 'pointer' }}
              >
                <div className="transfer-order-card-top">
                  <span className="transfer-order-number">{order.order_number}</span>
                  {order.transfer_last5 ? (
                    <span className="transfer-badge reported">已回報</span>
                  ) : (
                    <span className="transfer-badge pending">待回報</span>
                  )}
                </div>
                <div className="transfer-order-card-meta">
                  <span>{formatDate(order.created_at)}</span>
                  <span>{SHIPPING_LABELS[order.shipping_method] || order.shipping_method}</span>
                  <span>NT${Number(order.total_amount).toLocaleString()}</span>
                </div>
                {order.items && order.items.length > 0 && (
                  <div className="transfer-order-items">
                    {order.items.map((item, i) => (
                      <span key={i} className="transfer-order-item-tag">
                        {item.product_name} ×{item.quantity}
                      </span>
                    ))}
                  </div>
                )}
                {!order.transfer_last5 && (
                  <div className="transfer-order-card-action">點此回報匯款 →</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Step 3: enter last5 */}
        {step === 'report' && selectedOrder && (
          <div>
            <div className="transfer-selected-order">
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>回報訂單</div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{selectedOrder.order_number}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                {formatDate(selectedOrder.created_at)}・{SHIPPING_LABELS[selectedOrder.shipping_method]}・NT${Number(selectedOrder.total_amount).toLocaleString()}
              </div>
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div className="transfer-order-items" style={{ marginTop: 8 }}>
                  {selectedOrder.items.map((item, i) => (
                    <span key={i} className="transfer-order-item-tag">
                      {item.product_name} ×{item.quantity}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="checkout-form-section" style={{ borderRadius: 'var(--radius-lg)', padding: 24, background: 'var(--white)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-light)', marginTop: 16 }}>
              <div className="form-section-title" style={{ marginBottom: 8 }}>填寫匯款帳號後五碼</div>

              {submitError && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠ {submitError}</div>}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">匯款帳號後五碼 <span className="required">*</span></label>
                  <input
                    className="form-input"
                    value={last5}
                    onChange={(e) => {
                      setLast5(e.target.value.replace(/\D/g, '').slice(0, 5));
                      if (last5Error) setLast5Error('');
                    }}
                    placeholder="請輸入匯款帳號後五碼"
                    inputMode="numeric"
                    maxLength={5}
                    autoFocus
                  />
                  {last5Error && <div className="form-error">{last5Error}</div>}
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '13px', marginTop: 8 }} disabled={submitting}>
                  {submitting ? <><span className="spinner" /> 送出中...</> : '送出匯款回報'}
                </button>
              </form>
            </div>
          </div>
        )}

        <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.7 }}>
          公益勸募許可字號 115年02月09日北市社團字第115030052號
        </div>
      </div>
    </div>
  );
}
