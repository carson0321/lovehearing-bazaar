import { useState } from 'react';
import { useCart } from '../context/CartContext';

const CATEGORY_EMOJI = {
  '生活用品': '🏠',
  '食品': '🍱',
  '文具': '✏️',
  '書籍': '📚',
  '手工藝品': '🎨',
  '義賣商品': '🎁',
};

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const isOutOfStock = product.stock <= 0;

  function handleAdd() {
    if (isOutOfStock) return;
    addItem(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  const emoji = CATEGORY_EMOJI[product.category] || '🎁';

  return (
    <div className="product-card">
      <div className="product-img-wrap">
        {product.image_url && !imgError ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="product-img"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="product-img-placeholder">{emoji}</div>
        )}
        {product.category && (
          <span className="product-category-tag">{product.category}</span>
        )}
        {isOutOfStock && (
          <div className="product-out-of-stock-overlay">已售完</div>
        )}
      </div>

      <div className="product-body">
        <div className="product-name">{product.name}</div>
        <div className="product-desc">{product.description}</div>

        <div className="product-footer">
          <div>
            <span className="product-price">
              NT${Number(product.price).toLocaleString()}
            </span>
          </div>
          <span className={`product-stock ${product.stock <= 3 && product.stock > 0 ? 'low' : ''}`}>
            {isOutOfStock
              ? '已售完'
              : product.stock <= 3
              ? `僅剩 ${product.stock} 件`
              : `庫存 ${product.stock} 件`}
          </span>
        </div>

        <button
          className={`add-to-cart-btn ${added ? 'added' : ''}`}
          onClick={handleAdd}
          disabled={isOutOfStock}
        >
          {added ? '✓ 已加入購物車' : isOutOfStock ? '已售完' : '＋ 加入購物車'}
        </button>
      </div>
    </div>
  );
}
