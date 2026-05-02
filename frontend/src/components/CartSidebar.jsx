import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function CartSidebar() {
  const { items, removeItem, updateQty, totalAmount, isOpen, setIsOpen } = useCart();
  const navigate = useNavigate();

  if (!isOpen) return null;

  function handleCheckout() {
    setIsOpen(false);
    navigate('/checkout');
  }

  return (
    <>
      <div className="cart-overlay" onClick={() => setIsOpen(false)} />
      <div className="cart-sidebar">
        <div className="cart-header">
          <div className="cart-header-title">🛒 購物車</div>
          <button className="cart-close-btn" onClick={() => setIsOpen(false)}>
            ×
          </button>
        </div>

        {items.length === 0 ? (
          <div className="cart-empty">
            <div className="cart-empty-icon">🛒</div>
            <div className="cart-empty-text">購物車是空的</div>
            <div style={{ fontSize: 13, color: '#b2bec3' }}>快去挑選喜歡的商品吧！</div>
          </div>
        ) : (
          <div className="cart-items">
            {items.map(({ product, quantity }) => (
              <div key={product.id} className="cart-item">
                {(product.has_image || product.image_url) ? (
                  <img
                    src={product.has_image ? `/api/products/${product.id}/image` : product.image_url}
                    alt={product.name}
                    className="cart-item-img"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div
                    className="cart-item-img"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}
                  >
                    🎁
                  </div>
                )}
                <div className="cart-item-info">
                  <div className="cart-item-name">{product.name}</div>
                  <div className="cart-item-price">
                    NT${(Number(product.price) * quantity).toLocaleString()}
                  </div>
                  <div className="qty-controls">
                    <button
                      className="qty-btn"
                      onClick={() => updateQty(product.id, quantity - 1)}
                    >
                      −
                    </button>
                    <span className="qty-num">{quantity}</span>
                    <button
                      className="qty-btn"
                      onClick={() => updateQty(product.id, quantity + 1)}
                      disabled={quantity >= product.stock}
                    >
                      ＋
                    </button>
                  </div>
                </div>
                <button className="cart-item-remove" onClick={() => removeItem(product.id)}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <div className="cart-footer">
            <div className="cart-total-row">
              <span className="cart-total-label">合計</span>
              <span className="cart-total-amount">
                NT${totalAmount.toLocaleString()}
              </span>
            </div>
            <button className="checkout-btn" onClick={handleCheckout}>
              前往結帳 →
            </button>
          </div>
        )}
      </div>
    </>
  );
}
