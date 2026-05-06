import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../api';

const EMPTY_FORM = {
  name: '', description: '', price: '', stock: '', image_url: '', category: '義賣商品',
};

const STATUS_LABELS = {
  pending: '待確認',
  confirmed: '已確認',
  shipped: '已出貨',
  completed: '已完成',
  cancelled: '已取消',
  expired: '已逾時',
};

const STATUS_COLORS = {
  pending:   { bg: '#f0f0f0', color: '#666' },
  confirmed: { bg: '#dbeafe', color: '#1d4ed8' },
  shipped:   { bg: '#ffedd5', color: '#c2410c' },
  completed: { bg: '#dcfce7', color: '#15803d' },
  cancelled: { bg: '#fee2e2', color: '#b91c1c' },
  expired:   { bg: '#f3e8ff', color: '#7e22ce' },
};

const SHIPPING_LABELS = { '711': '7-11店到店', delivery: '宅配', pickup: '自取' };

const CATEGORIES = ['義賣商品', '生活用品', '食品', '文具', '書籍', '手工藝品'];

function exportOrders(orders) {
  const rows = orders.map((o) => ({
    '訂單編號': o.order_number,
    '姓名': o.customer_name,
    '電話': o.customer_phone || '',
    'Email': o.customer_email || '',
    'Line ID': o.line_id || '',
    '運送方式': SHIPPING_LABELS[o.shipping_method] || o.shipping_method || '',
    '匯款後五碼': o.transfer_last5 || '',
    '商品': (o.items || []).filter(Boolean).map((i) => `${i.product_name}×${i.quantity}`).join('、'),
    '備註': o.note || '',
    '金額': Number(o.total_amount),
    '狀態': STATUS_LABELS[o.status] || o.status,
    '下單時間': new Date(o.created_at).toLocaleString('zh-TW'),
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '訂單');
  XLSX.writeFile(wb, `orders_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function exportTransfers(transfers) {
  const rows = transfers.map((o) => ({
    '訂單編號': o.order_number,
    '姓名': o.customer_name,
    '電話': o.customer_phone || '',
    'Email': o.customer_email || '',
    '匯款後五碼': o.transfer_last5 || '',
    '金額': Number(o.total_amount),
    '運送方式': SHIPPING_LABELS[o.shipping_method] || o.shipping_method || '',
    '商品': (o.items || []).filter(Boolean).map((i) => `${i.product_name}×${i.quantity}`).join('、'),
    '狀態': STATUS_LABELS[o.status] || o.status,
    '下單時間': new Date(o.created_at).toLocaleString('zh-TW'),
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '匯款回報');
  XLSX.writeFile(wb, `transfers_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export default function AdminPage() {
  const [token, setToken] = useState(localStorage.getItem('admin_token') || '');
  const [username, setUsername] = useState(localStorage.getItem('admin_username') || '');

  if (!token) {
    return <LoginForm onLogin={(t, u) => { setToken(t); setUsername(u); }} />;
  }

  return (
    <Dashboard
      username={username}
      onLogout={() => {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_username');
        setToken('');
        setUsername('');
      }}
    />
  );
}

function LoginForm({ onLogin }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login(form.username, form.password);
      localStorage.setItem('admin_token', data.token);
      localStorage.setItem('admin_username', data.username);
      onLogin(data.token, data.username);
    } catch (err) {
      setError(err.message || '登入失敗');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login">
      <div className="admin-login-card">
        <div className="admin-login-logo">
          <img src="/logo.png" alt="蒲公英聽語協會" style={{ width: 64, height: 64, objectFit: 'contain' }} />
        </div>
        <h1 className="admin-login-title">後台管理系統</h1>
        <p className="admin-login-subtitle">蒲公英聽語協會義賣管理</p>

        {error && <div className="alert alert-error">⚠ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">帳號</label>
            <input
              className="form-input"
              value={form.username}
              onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
              placeholder="管理員帳號"
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label className="form-label">密碼</label>
            <input
              className="form-input"
              type="password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              placeholder="管理員密碼"
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 8, padding: '13px' }}
            disabled={loading}
          >
            {loading ? <><span className="spinner" /> 登入中...</> : '登入'}
          </button>
        </form>


      </div>
    </div>
  );
}

function Dashboard({ username, onLogout }) {
  const [tab, setTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingTransfers, setLoadingTransfers] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [newImageFiles, setNewImageFiles] = useState([]); // [{file, preview}]
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchProducts = useCallback(() => {
    setLoadingProducts(true);
    api.getAdminProducts()
      .then(setProducts)
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  }, []);

  const fetchOrders = useCallback(() => {
    setLoadingOrders(true);
    api.getOrders()
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoadingOrders(false));
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const fetchTransfers = useCallback(() => {
    setLoadingTransfers(true);
    api.getTransfers()
      .then(setTransfers)
      .catch(() => {})
      .finally(() => setLoadingTransfers(false));
  }, []);

  useEffect(() => {
    if (tab === 'orders') fetchOrders();
    if (tab === 'transfers') fetchTransfers();
  }, [tab, fetchOrders, fetchTransfers]);

  async function handleSaveProduct(e) {
    e.preventDefault();
    if (!form.name || form.price === '') {
      setFormError('商品名稱和價格為必填');
      return;
    }
    setFormError('');
    setSaving(true);

    const payload = {
      ...form,
      price: parseFloat(form.price),
      stock: parseInt(form.stock) || 0,
      active: true,
    };

    try {
      let savedId = editingId;
      if (editingId) {
        await api.updateProduct(editingId, payload);
        setFormSuccess('商品已更新');
      } else {
        const created = await api.createProduct(payload);
        savedId = created.id;
        setFormSuccess('商品已新增');
      }
      for (const { file } of newImageFiles) {
        await api.uploadProductImage(savedId, file);
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      setNewImageFiles([]);
      fetchProducts();
      setTimeout(() => setFormSuccess(''), 3000);
    } catch (err) {
      setFormError(err.message || '操作失敗');
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description || '',
      price: String(product.price),
      stock: String(product.stock),
      image_url: product.image_url || '',
      category: product.category || '義賣商品',
    });
    setNewImageFiles([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleAddImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setNewImageFiles((prev) => [...prev, { file, preview: URL.createObjectURL(file) }]);
  }

  function handleRemoveNewImage(idx) {
    setNewImageFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleDeleteExistingImage(imageId) {
    try {
      await api.deleteProductImage(imageId);
      fetchProducts();
    } catch (err) {
      alert(err.message || '刪除失敗');
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`確定要刪除「${name}」？此操作無法復原。`)) return;
    try {
      await api.deleteProduct(id);
      fetchProducts();
    } catch (err) {
      alert(err.message || '刪除失敗');
    }
  }

  async function handleToggleActive(product) {
    try {
      await api.updateProduct(product.id, { ...product, active: !product.active });
      fetchProducts();
    } catch {}
  }

  async function handleStatusChange(orderId, status) {
    try {
      await api.updateOrderStatus(orderId, status);
      if (tab === 'transfers') fetchTransfers();
      else fetchOrders();
    } catch {}
  }

  return (
    <div className="admin-page">
      <div className="admin-navbar">
        <div className="admin-navbar-brand">
          <img src="/logo.png" alt="logo" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          蒲公英義賣後台管理
        </div>
        <div className="admin-navbar-right">
          <span className="admin-username">👤 {username}</span>
          <button className="admin-logout-btn" onClick={onLogout}>登出</button>
        </div>
      </div>

      <div className="admin-content">
        <div className="admin-tabs">
          <button
            className={`admin-tab ${tab === 'products' ? 'active' : ''}`}
            onClick={() => setTab('products')}
          >
            商品管理
          </button>
          <button
            className={`admin-tab ${tab === 'orders' ? 'active' : ''}`}
            onClick={() => setTab('orders')}
          >
            訂單管理
          </button>
          <button
            className={`admin-tab ${tab === 'transfers' ? 'active' : ''}`}
            onClick={() => setTab('transfers')}
          >
            匯款管理
          </button>
        </div>

        {tab === 'products' && (
          <>
            {/* Add/Edit Form */}
            <div className="admin-add-form">
              <div className="admin-form-title">
                {editingId ? '✏️ 編輯商品' : '➕ 新增商品'}
              </div>

              {formError && <div className="alert alert-error">{formError}</div>}
              {formSuccess && <div className="alert alert-success">✓ {formSuccess}</div>}

              <form onSubmit={handleSaveProduct}>
                <div className="admin-form-grid">
                  <div className="form-group">
                    <label className="form-label">商品名稱 <span className="required">*</span></label>
                    <input
                      className="form-input"
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="例：手工蠟燭禮盒"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">分類</label>
                    <select
                      className="form-select"
                      value={form.category}
                      onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">價格（NT$）<span className="required">*</span></label>
                    <input
                      className="form-input"
                      type="number"
                      min="0"
                      step="1"
                      value={form.price}
                      onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                      placeholder="例：350"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">庫存數量</label>
                    <input
                      className="form-input"
                      type="number"
                      min="0"
                      value={form.stock}
                      onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))}
                      placeholder="例：20"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label className="form-label">商品圖片（最多 3 張）</label>
                    {(() => {
                      const existingIds = (editingId ? products.find(p => p.id === editingId)?.image_ids : null) || [];
                      const totalCount = existingIds.length + newImageFiles.length;
                      return (
                        <>
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 10 }}>
                            {/* Existing saved images */}
                            {existingIds.map((imgId) => (
                              <div key={imgId} style={{ position: 'relative', flexShrink: 0 }}>
                                <img
                                  src={`/api/products/images/${imgId}`}
                                  alt="商品圖"
                                  style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleDeleteExistingImage(imgId)}
                                  style={{ position: 'absolute', top: -6, right: -6, background: 'var(--error)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 11, lineHeight: '20px', padding: 0 }}
                                  title="刪除圖片"
                                >✕</button>
                              </div>
                            ))}
                            {/* Queued new images */}
                            {newImageFiles.map(({ preview }, idx) => (
                              <div key={idx} style={{ position: 'relative', flexShrink: 0 }}>
                                <img
                                  src={preview}
                                  alt="新圖預覽"
                                  style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '2px dashed var(--primary)' }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveNewImage(idx)}
                                  style={{ position: 'absolute', top: -6, right: -6, background: 'var(--error)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 11, lineHeight: '20px', padding: 0 }}
                                  title="取消上傳"
                                >✕</button>
                              </div>
                            ))}
                            {/* Add image button */}
                            {totalCount < 3 && (
                              <label style={{ width: 80, height: 80, border: '2px dashed var(--border)', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, gap: 4 }}>
                                <span style={{ fontSize: 22, lineHeight: 1 }}>＋</span>
                                新增圖片
                                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAddImage} />
                              </label>
                            )}
                          </div>
                          <input
                            className="form-input"
                            value={form.image_url}
                            onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))}
                            placeholder="或貼上圖片網址 https://..."
                            style={{ fontSize: 13 }}
                          />
                        </>
                      );
                    })()}
                  </div>

                  <div className="form-group full-width">
                    <label className="form-label">商品描述</label>
                    <textarea
                      className="form-textarea"
                      value={form.description}
                      onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                      placeholder="詳細描述商品特色、材質、用途等..."
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <><span className="spinner" /> 儲存中...</> : editingId ? '更新商品' : '新增商品'}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => { setEditingId(null); setForm(EMPTY_FORM); setFormError(''); setNewImageFiles([]); }}
                    >
                      取消編輯
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Products Table */}
            <div className="admin-table-wrap">
              {loadingProducts ? (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div className="spinner dark" style={{ margin: '0 auto 12px' }} />
                  載入中...
                </div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>圖片</th>
                      <th>商品名稱</th>
                      <th>分類</th>
                      <th>價格</th>
                      <th>庫存</th>
                      <th>狀態</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          尚無商品，請新增第一件商品
                        </td>
                      </tr>
                    ) : products.map((p) => (
                      <tr key={p.id}>
                        <td>
                          {p.image_ids?.length > 0 ? (
                            <img src={`/api/products/images/${p.image_ids[0]}`} alt={p.name} className="admin-product-img" />
                          ) : p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="admin-product-img" />
                          ) : (
                            <div className="admin-product-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎁</div>
                          )}
                        </td>
                        <td style={{ fontWeight: 600, maxWidth: 200 }}>{p.name}</td>
                        <td style={{ color: 'var(--text-light)' }}>{p.category}</td>
                        <td style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>
                          NT${Number(p.price).toLocaleString()}
                        </td>
                        <td>
                          <span style={{ color: p.stock <= 3 ? 'var(--error)' : 'inherit', fontWeight: p.stock <= 3 ? 600 : 400 }}>
                            {p.stock}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${p.active ? 'active' : 'inactive'}`}>
                            {p.active ? '● 上架中' : '○ 已下架'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button className="action-btn toggle" onClick={() => handleEdit(p)}>
                              編輯
                            </button>
                            <button className="action-btn toggle" onClick={() => handleToggleActive(p)}>
                              {p.active ? '下架' : '上架'}
                            </button>
                            <button className="action-btn danger" onClick={() => handleDelete(p.id, p.name)}>
                              刪除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {tab === 'orders' && (
          <>
          {orders.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 0 0' }}>
              <button className="btn btn-outline" style={{ fontSize: 13, padding: '7px 16px' }} onClick={() => exportOrders(orders)}>
                匯出 Excel
              </button>
            </div>
          )}
          <div className="admin-table-wrap">
            {loadingOrders ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div className="spinner dark" style={{ margin: '0 auto 12px' }} />
                載入中...
              </div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>訂單編號</th>
                    <th>姓名</th>
                    <th>電話</th>
                    <th>Email</th>
                    <th>Line ID</th>
                    <th>運送方式</th>
                    <th>匯款後五碼</th>
                    <th>商品</th>
                    <th>備註</th>
                    <th>金額</th>
                    <th>狀態</th>
                    <th>下單時間</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={12} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        尚無訂單
                      </td>
                    </tr>
                  ) : orders.map((o) => (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 700, color: 'var(--primary-dark)', fontSize: 12 }}>
                        {o.order_number}
                      </td>
                      <td style={{ fontWeight: 600 }}>{o.customer_name}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-light)' }}>{o.customer_phone || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-light)' }}>{o.customer_email || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-light)' }}>{o.line_id || '—'}</td>
                      <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                        {o.shipping_method === '711' && '7-11店到店'}
                        {o.shipping_method === 'delivery' && '宅配地址'}
                        {o.shipping_method === 'pickup' && '自取'}
                        {!o.shipping_method && '—'}
                      </td>
                      <td style={{ fontSize: 13, fontFamily: 'monospace', letterSpacing: 1 }}>
                        {o.transfer_last5 || '—'}
                      </td>
                      <td>
                        <div className="order-items-list">
                          {(o.items || []).filter(Boolean).map((item, i) => (
                            <div key={i}>
                              {item.product_name} ×{item.quantity}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-light)', maxWidth: 160, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {o.note || '—'}
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--primary-dark)', whiteSpace: 'nowrap' }}>
                        NT${Number(o.total_amount).toLocaleString()}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 600,
                            background: STATUS_COLORS[o.status]?.bg,
                            color: STATUS_COLORS[o.status]?.color,
                            whiteSpace: 'nowrap',
                          }}>
                            {STATUS_LABELS[o.status]}
                          </span>
                          <select
                            className="form-select"
                            style={{ fontSize: 11, padding: '4px 24px 4px 8px', width: 'auto' }}
                            value={o.status}
                            onChange={(e) => handleStatusChange(o.id, e.target.value)}
                          >
                            {Object.entries(STATUS_LABELS).map(([val, label]) => (
                              <option key={val} value={val}>{label}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-light)', whiteSpace: 'nowrap' }}>
                        {new Date(o.created_at).toLocaleString('zh-TW', {
                          month: '2-digit', day: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          </>
        )}

        {tab === 'transfers' && (
          <>
          {transfers.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 0 0' }}>
              <button className="btn btn-outline" style={{ fontSize: 13, padding: '7px 16px' }} onClick={() => exportTransfers(transfers)}>
                匯出 Excel
              </button>
            </div>
          )}
          <div className="admin-table-wrap">
            {loadingTransfers ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div className="spinner dark" style={{ margin: '0 auto 12px' }} />
                載入中...
              </div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>訂單編號</th>
                    <th>姓名</th>
                    <th>電話</th>
                    <th>Email</th>
                    <th>匯款後五碼</th>
                    <th>金額</th>
                    <th>運送方式</th>
                    <th>狀態</th>
                    <th>下單時間</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        尚無匯款回報紀錄
                      </td>
                    </tr>
                  ) : transfers.map((o) => (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 700, color: 'var(--primary-dark)', fontSize: 12 }}>
                        {o.order_number}
                      </td>
                      <td style={{ fontWeight: 600 }}>{o.customer_name}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-light)' }}>{o.customer_phone}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-light)' }}>{o.customer_email}</td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 12px',
                          background: '#dbeafe',
                          color: '#1d4ed8',
                          borderRadius: 20,
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          fontSize: 14,
                          letterSpacing: 2,
                        }}>
                          {o.transfer_last5}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--primary-dark)', whiteSpace: 'nowrap' }}>
                        NT${Number(o.total_amount).toLocaleString()}
                      </td>
                      <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                        {o.shipping_method === '711' && '7-11店到店'}
                        {o.shipping_method === 'delivery' && '宅配地址'}
                        {o.shipping_method === 'pickup' && '自取'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                          <span style={{
                            display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                            fontSize: 12, fontWeight: 600,
                            background: STATUS_COLORS[o.status]?.bg,
                            color: STATUS_COLORS[o.status]?.color,
                            whiteSpace: 'nowrap',
                          }}>
                            {STATUS_LABELS[o.status]}
                          </span>
                          <select
                            className="form-select"
                            style={{ fontSize: 11, padding: '4px 24px 4px 8px', width: 'auto' }}
                            value={o.status}
                            onChange={(e) => handleStatusChange(o.id, e.target.value)}
                          >
                            {Object.entries(STATUS_LABELS).map(([val, label]) => (
                              <option key={val} value={val}>{label}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-light)', whiteSpace: 'nowrap' }}>
                        {new Date(o.created_at).toLocaleString('zh-TW', {
                          month: '2-digit', day: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          </>
        )}
      </div>
    </div>
  );
}
