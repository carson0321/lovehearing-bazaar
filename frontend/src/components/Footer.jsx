export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">
              <span style={{ fontSize: 24 }}>🌼</span>
              <span className="footer-brand-name">蒲公英聽語協會</span>
            </div>
            <p className="footer-desc">
              我們始終相信愛心就像蒲公英，只要有風，就能隨風起舞，
              吹進每個需要幫助的聽損家庭。每一份義賣收益，都用於支持聽損兒童及其家庭。
            </p>
          </div>
          <div>
            <div className="footer-heading">快速連結</div>
            <a href="https://www.lovehearing.org" target="_blank" rel="noopener noreferrer" className="footer-link">關於我們</a>
            <a href="https://www.lovehearing.org" target="_blank" rel="noopener noreferrer" className="footer-link">活動消息</a>
            <a href="https://www.lovehearing.org" target="_blank" rel="noopener noreferrer" className="footer-link">捐款支持</a>
            <a href="https://www.lovehearing.org" target="_blank" rel="noopener noreferrer" className="footer-link">相關資源</a>
          </div>
          <div>
            <div className="footer-heading">聯絡我們</div>
            <p className="footer-desc" style={{ marginBottom: 8 }}>
              如有任何問題，歡迎聯繫我們
            </p>
            <a href="https://www.lovehearing.org" target="_blank" rel="noopener noreferrer" className="footer-link">
              🌐 www.lovehearing.org
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          © {new Date().getFullYear()} 蒲公英聽語協會 版權所有｜本網站義賣所得全數用於聽損兒童服務
        </div>
      </div>
    </footer>
  );
}
