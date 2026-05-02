const BASE = '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('admin_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '請求失敗');
  return data;
}

export const api = {
  // Products
  getProducts: () => request('/products'),
  getAdminProducts: () => request('/products/admin/all'),
  createProduct: (body) => request('/products', { method: 'POST', body: JSON.stringify(body) }),
  updateProduct: (id, body) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),
  uploadProductImage: (id, file) => {
    const token = localStorage.getItem('admin_token');
    const formData = new FormData();
    formData.append('image', file);
    return fetch(`/api/products/${id}/image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '上傳失敗');
      return data;
    });
  },
  deleteProductImage: (id) => request(`/products/${id}/image`, { method: 'DELETE' }),

  // Orders
  createOrder: (body) => request('/orders', { method: 'POST', body: JSON.stringify(body) }),
  getOrders: () => request('/orders'),
  updateOrderStatus: (id, status) =>
    request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Auth
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
};
