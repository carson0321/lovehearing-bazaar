import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function Navbar() {
  const { totalItems, setIsOpen } = useCart();
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <img src="/logo.png" alt="蒲公英聽語協會" className="navbar-logo" />
          <div className="navbar-title">
            <span className="navbar-title-main">蒲公英聽語協會</span>
            <span className="navbar-title-sub">Dandelion Hearing & Language</span>
          </div>
        </Link>

        <div className="navbar-nav">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
            義賣商品
          </Link>
          <a
            href="https://www.lovehearing.org"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link"
          >
            關於協會
          </a>
        </div>

        <div className="navbar-actions">
          <button className="cart-btn" onClick={() => setIsOpen(true)}>
            <span>🛒</span>
            <span>購物車</span>
            {totalItems > 0 && (
              <span className="cart-badge">{totalItems > 99 ? '99+' : totalItems}</span>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}
