import { useState, useEffect } from 'react';
import { api } from '../api';
import ProductCard from '../components/ProductCard';

const CATEGORIES = ['全部', '生活用品', '食品', '文具', '書籍', '手工藝品', '義賣商品'];

export default function ShopPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('全部');

  useEffect(() => {
    api.getProducts()
      .then(setProducts)
      .catch(() => setError('無法載入商品，請稍後再試'))
      .finally(() => setLoading(false));
  }, []);

  const visibleProducts =
    activeCategory === '全部'
      ? products
      : products.filter((p) => p.category === activeCategory);

  const existingCategories = ['全部', ...new Set(products.map((p) => p.category).filter(Boolean))];

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="hero-badge">愛心義賣活動進行中</div>
        <h1 className="hero-title">
          每一份購買<br />
          都是對<span>聽損族群</span>的支持
        </h1>
        <p className="hero-desc">
          蒲公英聽語協會義賣商品，每件皆由善心人士捐贈與愛心志工精心嚴選。
          所有收益將全數用於支持聽損兒童的語言治療、教育服務與聽損族群的需要。
        </p>
        <div className="hero-stats">
          <div className="hero-stat">
            <div className="hero-stat-num">10000+</div>
            <div className="hero-stat-label">服務人次</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-num">10年+</div>
            <div className="hero-stat-label">服務經驗</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-num">100%</div>
            <div className="hero-stat-label">收益用於公益</div>
          </div>
        </div>
      </section>

      {/* Shop */}
      <section className="shop-section">
        <div className="section-header">
          <h2 className="section-title">
            義賣商品
            {!loading && <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-light)', marginLeft: 8 }}>
              共 {visibleProducts.length} 件
            </span>}
          </h2>
          <div className="category-filters">
            {existingCategories.map((cat) => (
              <button
                key={cat}
                className={`category-pill ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-light)' }}>
            <div className="spinner dark" style={{ margin: '0 auto 12px' }} />
            <div>載入商品中...</div>
          </div>
        )}

        {error && (
          <div className="alert alert-error">{error}</div>
        )}

        {!loading && !error && visibleProducts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🌾</div>
            <div>此分類目前沒有商品</div>
          </div>
        )}

        {!loading && (
          <div className="product-grid">
            {visibleProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
