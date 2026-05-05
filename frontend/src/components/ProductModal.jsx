import { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext';
import ImageCarousel from './ImageCarousel';

const CATEGORY_EMOJI = {
  '生活用品': '🏠', '食品': '🍱', '文具': '✏️',
  '書籍': '📚', '手工藝品': '🎨', '義賣商品': '🎁',
};

export default function ProductModal({ product, onClose }) {
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const isOutOfStock = product.stock <= 0;
  const emoji = CATEGORY_EMOJI[product.category] || '🎁';

  const images = [
    ...(product.image_ids || []).map((id) => `/api/products/images/${id}`),
    ...(product.image_url ? [product.image_url] : []),
  ];

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  function handleAdd() {
    addItem(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="product-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="關閉">×</button>

        {/* Image panel */}
        <div className="product-modal-images">
          {images.length > 0 ? (
            <div style={{ position: 'relative', paddingTop: '85%' }}>
              <ImageCarousel images={images} alt={product.name} className="product-img" />
            </div>
          ) : (
            <div className="product-modal-placeholder">{emoji}</div>
          )}
        </div>

        {/* Info panel */}
        <div className="product-modal-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span className="product-category-tag" style={{ position: 'static' }}>{product.category}</span>
            {isOutOfStock && (
              <span style={{ fontSize: 12, color: 'var(--error)', fontWeight: 600 }}>已售完</span>
            )}
          </div>

          <h2 className="product-modal-name">{product.name}</h2>

          <p className="product-modal-desc">{product.description}</p>

          <div className="product-modal-price">
            NT${Number(product.price).toLocaleString()}
          </div>

          <div className={`product-stock ${product.stock <= 3 && !isOutOfStock ? 'low' : ''}`} style={{ marginBottom: 20 }}>
            {isOutOfStock
              ? '已售完'
              : product.stock <= 3
              ? `僅剩 ${product.stock} 件`
              : `庫存 ${product.stock} 件`}
          </div>

          {!isOutOfStock && (
            <div className="qty-controls" style={{ marginBottom: 16 }}>
              <button className="qty-btn" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
              <span className="qty-num">{qty}</span>
              <button
                className="qty-btn"
                onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                disabled={qty >= product.stock}
              >＋</button>
            </div>
          )}

          <button
            className={`add-to-cart-btn ${added ? 'added' : ''}`}
            onClick={handleAdd}
            disabled={isOutOfStock}
          >
            {added ? '✓ 已加入購物車' : isOutOfStock ? '已售完' : '＋ 加入購物車'}
          </button>
        </div>
      </div>
    </div>
  );
}
