import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { api } from '../api';

const SHIPPING_OPTIONS = [
  { value: '711',      label: '7-11 店到店',  fee: 80,  note: '運費 NT$80' },
  { value: 'delivery', label: '宅配地址',      fee: 100, note: '包裹郵資 NT$100' },
  { value: 'pickup',   label: '自取',          fee: 0,   note: '臺北市中山區長安東路一段65巷3號3樓' },
];

export default function CheckoutPage() {
  const { items, totalAmount, clearCart } = useCart();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    line_id: '',
    note: '',
    shipping_method: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const selectedShipping = SHIPPING_OPTIONS.find((o) => o.value === form.shipping_method);
  const shippingFee = selectedShipping?.fee ?? 0;
  const grandTotal = totalAmount + shippingFee;

  if (items.length === 0) {
    return (
      <div className="checkout-page">
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🛒</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>購物車是空的</div>
          <Link to="/" className="back-to-shop-btn">← 去選購商品</Link>
        </div>
      </div>
    );
  }

  function validate() {
    const errs = {};
    if (!form.customer_name.trim()) errs.customer_name = '請填寫姓名';
    if (!form.customer_phone.trim()) errs.customer_phone = '請填寫聯絡電話';
    if (!form.customer_email.trim()) {
      errs.customer_email = '請填寫 Email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customer_email)) {
      errs.customer_email = 'Email 格式不正確';
    }
    if (!form.shipping_method) errs.shipping_method = '請選擇運送方式';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    setSubmitError('');

    try {
      const orderItems = items.map((i) => ({
        product_id: i.product.id,
        quantity: i.quantity,
      }));

      const result = await api.createOrder({ ...form, items: orderItems });
      clearCart();
      navigate('/order-success', { state: result });
    } catch (err) {
      setSubmitError(err.message || '訂單提交失敗，請稍後再試');
    } finally {
      setSubmitting(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  }

  return (
    <div className="checkout-page">
      <h1 className="checkout-title">
        <Link to="/" style={{ color: 'var(--text-muted)', fontSize: 20 }}>←</Link>
        確認訂單
      </h1>

      <div className="checkout-layout">
        {/* Form */}
        <div className="checkout-form-section">
          <div className="form-section-title">填寫收件資料</div>

          {submitError && (
            <div className="alert alert-error">⚠ {submitError}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">姓名 <span className="required">*</span></label>
              <input
                className="form-input"
                name="customer_name"
                value={form.customer_name}
                onChange={handleChange}
                placeholder="請輸入您的姓名"
              />
              {errors.customer_name && <div className="form-error">{errors.customer_name}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">聯絡電話 <span className="required">*</span></label>
              <input
                className="form-input"
                name="customer_phone"
                type="tel"
                value={form.customer_phone}
                onChange={handleChange}
                placeholder="請輸入聯絡電話"
              />
              {errors.customer_phone && <div className="form-error">{errors.customer_phone}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Email <span className="required">*</span></label>
              <input
                className="form-input"
                name="customer_email"
                type="email"
                value={form.customer_email}
                onChange={handleChange}
                placeholder="請輸入 Email"
              />
              {errors.customer_email && <div className="form-error">{errors.customer_email}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Line ID</label>
              <input
                className="form-input"
                name="line_id"
                value={form.line_id}
                onChange={handleChange}
                placeholder="選填，方便協會與您聯繫"
              />
            </div>

            <div className="form-group">
              <label className="form-label">運送方式 <span className="required">*</span></label>
              <div className="shipping-options">
                {SHIPPING_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`shipping-option ${form.shipping_method === opt.value ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="shipping_method"
                      value={opt.value}
                      checked={form.shipping_method === opt.value}
                      onChange={handleChange}
                      style={{ display: 'none' }}
                    />
                    <div className="shipping-option-main">
                      <span className="shipping-option-label">{opt.label}</span>
                      <span className="shipping-option-fee">
                        {opt.fee === 0 ? '免運費' : `NT$${opt.fee}`}
                      </span>
                    </div>
                    <div className="shipping-option-note">{opt.note}</div>
                  </label>
                ))}
              </div>
              {errors.shipping_method && <div className="form-error">{errors.shipping_method}</div>}
            </div>

            <div className="bank-info-box">
              <div className="bank-info-title">💳 匯款資訊</div>
              <div className="bank-info-row">
                <span>銀行</span>
                <span>合作金庫銀行（006）長安分行</span>
              </div>
              <div className="bank-info-row">
                <span>帳號</span>
                <strong>0888717136030</strong>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 6 }}>
                下單後請完成匯款，再至「匯款回報」頁面填寫帳號後五碼
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">備註</label>
              <textarea
                className="form-textarea"
                name="note"
                value={form.note}
                onChange={handleChange}
                placeholder="如有特殊需求請在此說明（選填）"
              />
            </div>

            <div
              style={{
                marginTop: 24,
                padding: 16,
                background: 'var(--primary-light)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 13,
                color: 'var(--text-light)',
                lineHeight: 1.7,
              }}
            >
              💛 義賣所得將全數捐助蒲公英聽語協會，支持聽損兒童的語言治療、教育服務與聽損族群的需要。感謝您的愛心！
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                公益勸募許可字號 115年02月09日北市社團字第115030052號
              </div>
            </div>
          </form>
        </div>

        {/* Order summary */}
        <div className="checkout-order-summary">
          <div className="order-summary-title">訂單明細</div>

          {items.map(({ product, quantity }) => (
            <div key={product.id} className="order-item-row">
              <div>
                <div className="order-item-name">{product.name}</div>
                <div className="order-item-qty">x {quantity}</div>
              </div>
              <div className="order-item-subtotal">
                NT${(Number(product.price) * quantity).toLocaleString()}
              </div>
            </div>
          ))}

          <div style={{ borderTop: '1px solid var(--border-light)', margin: '12px 0' }} />

          <div className="order-item-row" style={{ fontSize: 13, color: 'var(--text-light)' }}>
            <span>商品小計</span>
            <span>NT${totalAmount.toLocaleString()}</span>
          </div>
          <div className="order-item-row" style={{ fontSize: 13, color: 'var(--text-light)' }}>
            <span>運費{selectedShipping ? `（${selectedShipping.label}）` : ''}</span>
            <span>{selectedShipping ? (shippingFee === 0 ? '免運費' : `NT$${shippingFee}`) : '—'}</span>
          </div>

          <div className="order-total-row">
            <span className="order-total-label">總計</span>
            <span className="order-total-amount">
              NT${grandTotal.toLocaleString()}
            </span>
          </div>

          <button
            className="submit-order-btn"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <><span className="spinner" /><span>處理中...</span></>
            ) : (
              '確認下單 ✓'
            )}
          </button>

          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-light)', textAlign: 'center', lineHeight: 1.7 }}>
            下單後請至「匯款回報」頁面填寫帳號後五碼
          </div>
        </div>
      </div>

      {/* Mobile sticky bottom bar */}
      <div className="checkout-mobile-bar">
        <div className="checkout-mobile-bar-total">
          <div className="checkout-mobile-bar-label">訂單合計</div>
          <div className="checkout-mobile-bar-amount">NT${grandTotal.toLocaleString()}</div>
        </div>
        <button
          className="checkout-mobile-bar-btn"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? <><span className="spinner" /> 處理中</> : '確認下單 ✓'}
        </button>
      </div>
    </div>
  );
}
