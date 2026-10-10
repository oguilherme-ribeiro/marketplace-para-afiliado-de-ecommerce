const tokenKey = 'achados-admin-token';
const loginPanel = document.querySelector('#login-panel');
const dashboard = document.querySelector('#dashboard');
const loginMessage = document.querySelector('#login-message');
const productMessage = document.querySelector('#product-message');
const listMessage = document.querySelector('#list-message');
const productList = document.querySelector('#product-list');
const productForm = document.querySelector('#product-form');
const productSubmit = productForm.querySelector('button[type="submit"]');
let editingProductId = null;

function showDashboard(isAuthenticated) {
  loginPanel.hidden = isAuthenticated;
  dashboard.hidden = !isAuthenticated;
}

async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = sessionStorage.getItem(tokenKey);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body) headers.set('Content-Type', 'application/json');

  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'Não foi possível concluir a solicitação.');
    error.status = response.status;
    throw error;
  }
  return data;
}

function formatPrice(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
}

function resetProductForm() {
  editingProductId = null;
  productForm.reset();
  document.querySelector('#new-product-title').textContent = 'Adicionar produto';
  productSubmit.textContent = 'Publicar produto';
  document.querySelector('#cancel-edit').hidden = true;
  productMessage.textContent = '';
}

function endSession() {
  sessionStorage.removeItem(tokenKey);
  showDashboard(false);
  loginMessage.textContent = 'Sua sessão expirou. Entre novamente.';
}

function renderProducts(products) {
  productList.replaceChildren();
  document.querySelector('#product-count').textContent = products.length;
  document.querySelector('#click-count').textContent = products.reduce((sum, product) => sum + (Number(product.Cliques) || 0), 0).toLocaleString('pt-BR');

  if (!products.length) {
    listMessage.textContent = 'Nenhum produto publicado ainda.';
    return;
  }
  listMessage.textContent = '';

  products.forEach(product => {
    const item = document.createElement('article');
    item.className = 'admin-product-row';
    const details = document.createElement('div');
    details.className = 'admin-product-details';
    const name = document.createElement('strong');
    name.textContent = product.Nome;
    const meta = document.createElement('span');
    meta.textContent = `${product.Categoria} · ${formatPrice(product.Preco)}`;
    details.append(name, meta);

    const clickCount = document.createElement('div');
    clickCount.className = 'admin-product-clicks';
    const clickValue = document.createElement('strong');
    clickValue.textContent = (Number(product.Cliques) || 0).toLocaleString('pt-BR');
    const clickLabel = document.createElement('span');
    clickLabel.textContent = 'cliques';
    clickCount.append(clickValue, clickLabel);
    const actions = document.createElement('div');
    actions.className = 'admin-product-actions';
    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'admin-row-button';
    editButton.textContent = 'Editar';
    editButton.setAttribute('aria-label', `Editar ${product.Nome}`);
    editButton.addEventListener('click', () => {
      editingProductId = product._id;
      for (const field of ['Nome', 'Descricao', 'Preco', 'Categoria', 'Imagem', 'Link']) {
        productForm.elements.namedItem(field).value = product[field] ?? '';
      }
      document.querySelector('#new-product-title').textContent = 'Editar produto';
      productSubmit.textContent = 'Salvar alterações';
      document.querySelector('#cancel-edit').hidden = false;
      productMessage.textContent = '';
      productForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
      productForm.elements.namedItem('Nome').focus({ preventScroll: true });
    });

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'admin-row-button admin-delete-button';
    deleteButton.textContent = 'Excluir';
    deleteButton.setAttribute('aria-label', `Excluir ${product.Nome}`);
    deleteButton.addEventListener('click', async () => {
      if (!window.confirm(`Excluir "${product.Nome}" da vitrine?`)) return;
      listMessage.textContent = 'Excluindo produto...';
      try {
        await apiRequest(`/api/products/${encodeURIComponent(product._id)}`, { method: 'DELETE' });
        if (editingProductId === product._id) resetProductForm();
        listMessage.textContent = 'Produto excluído.';
        await loadProducts();
      } catch (error) {
        if (error.status === 401) endSession();
        listMessage.textContent = error.message;
      }
    });

    actions.append(editButton, deleteButton);
    item.append(details, clickCount, actions);
    productList.append(item);
  });
}

async function loadProducts() {
  listMessage.textContent = 'Carregando produtos...';
  try {
    const products = await apiRequest('/api/products/admin');
    renderProducts(products);
  } catch (error) {
    if (error.status === 401) {
      endSession();
      return;
    }
    listMessage.textContent = error.message;
  }
}

document.querySelector('#login-form').addEventListener('submit', async event => {
  event.preventDefault();
  loginMessage.textContent = 'Validando acesso...';
  const formData = new FormData(event.currentTarget);
  try {
    const result = await apiRequest('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ Email: formData.get('Email'), Senha: formData.get('Senha') })
    });
    sessionStorage.setItem(tokenKey, result.token);
    loginMessage.textContent = '';
    event.currentTarget.reset();
    showDashboard(true);
    await loadProducts();
  } catch (error) {
    loginMessage.textContent = error.message;
  }
});

productForm.addEventListener('submit', async event => {
  event.preventDefault();
  productMessage.textContent = editingProductId ? 'Salvando alterações...' : 'Publicando produto...';
  const values = Object.fromEntries(new FormData(event.currentTarget));
  values.Preco = Number(values.Preco);
  try {
    const isEditing = Boolean(editingProductId);
    const route = isEditing ? `/api/products/${encodeURIComponent(editingProductId)}` : '/api/products';
    await apiRequest(route, { method: isEditing ? 'PUT' : 'POST', body: JSON.stringify(values) });
    resetProductForm();
    productMessage.textContent = isEditing ? 'Alterações salvas.' : 'Produto publicado na vitrine.';
    await loadProducts();
  } catch (error) {
    if (error.status === 401) {
      endSession();
    }
    productMessage.textContent = error.message;
  }
});

document.querySelector('#cancel-edit').addEventListener('click', resetProductForm);
document.querySelector('#refresh-products').addEventListener('click', loadProducts);
document.querySelector('#logout').addEventListener('click', () => {
  sessionStorage.removeItem(tokenKey);
  showDashboard(false);
});

if (sessionStorage.getItem(tokenKey)) {
  showDashboard(true);
  loadProducts();
} else {
  showDashboard(false);
}
