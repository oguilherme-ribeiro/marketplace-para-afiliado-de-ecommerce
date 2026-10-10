const state = { products: [], category: 'Todos', query: '', sort: 'featured' };

const productGrid = document.querySelector('#product-grid');
const categoryList = document.querySelector('#categories');
const catalogMessage = document.querySelector('#catalog-message');
const featureDetails = document.querySelector('#featured-details');
const featureImage = document.querySelector('#featured-image');
const featurePlaceholder = document.querySelector('#featured-placeholder');

function safeUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function formatPrice(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 'Consulte o preço';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
}

function makeAffiliateLink(product, label, className) {
  const destination = safeUrl(product.Link);
  const link = document.createElement('a');
  link.className = className;
  link.textContent = label;
  link.setAttribute('aria-label', `${label}: ${product.Nome}`);
  if (destination) {
    link.href = product._id
      ? `/api/products/${encodeURIComponent(product._id)}/click`
      : destination;
    link.target = '_blank';
    link.rel = 'noopener noreferrer sponsored';
  } else {
    link.setAttribute('aria-disabled', 'true');
    link.title = 'Link de compra indisponível';
  }
  return link;
}

function renderFeatured(product) {
  if (!product) {
    featureDetails.textContent = 'Nenhum produto disponível por enquanto.';
    return;
  }

  const imageUrl = safeUrl(product.Imagem);
  if (imageUrl) {
    featureImage.src = imageUrl;
    featureImage.alt = product.Nome || 'Produto em destaque';
    featureImage.classList.add('is-visible');
    featurePlaceholder.hidden = true;
  }

  featureDetails.replaceChildren();
  const category = document.createElement('p');
  category.className = 'feature-category';
  category.textContent = product.Categoria || 'Achado';
  const title = document.createElement('h2');
  title.textContent = product.Nome || 'Produto em destaque';
  const description = document.createElement('p');
  description.className = 'feature-description';
  description.textContent = product.Descricao || '';

  const details = document.createElement('div');
  details.append(category, title, description);
  const priceLabel = document.createElement('span');
  priceLabel.className = 'feature-price-label';
  priceLabel.textContent = 'PREÇO DO ACHADO';
  const price = document.createElement('strong');
  price.className = 'feature-price';
  price.textContent = formatPrice(product.Preco);
  const priceBlock = document.createElement('div');
  priceBlock.append(priceLabel, price);
  const bottom = document.createElement('div');
  bottom.className = 'feature-bottom';
  bottom.append(priceBlock, makeAffiliateLink(product, 'Ver na Shopee ↗', 'buy-button'));
  featureDetails.append(details, bottom);
}

function renderCategories() {
  const categories = ['Todos', ...new Set(state.products.map(product => product.Categoria).filter(Boolean))];
  categoryList.replaceChildren();
  categories.forEach(category => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `category-button${state.category === category ? ' is-active' : ''}`;
    button.textContent = category;
    button.setAttribute('aria-pressed', String(state.category === category));
    button.addEventListener('click', () => {
      state.category = category;
      renderCategories();
      renderProducts();
    });
    categoryList.append(button);
  });
}

function filteredProducts() {
  const query = state.query.trim().toLocaleLowerCase('pt-BR');
  const products = state.products.filter(product => {
    const matchesCategory = state.category === 'Todos' || product.Categoria === state.category;
    const searchable = `${product.Nome || ''} ${product.Descricao || ''} ${product.Categoria || ''}`.toLocaleLowerCase('pt-BR');
    return matchesCategory && searchable.includes(query);
  });
  if (state.sort === 'price-asc') products.sort((a, b) => Number(a.Preco) - Number(b.Preco));
  if (state.sort === 'price-desc') products.sort((a, b) => Number(b.Preco) - Number(a.Preco));
  if (state.sort === 'name') products.sort((a, b) => (a.Nome || '').localeCompare(b.Nome || '', 'pt-BR'));
  return products;
}

function renderProducts() {
  const products = filteredProducts();
  productGrid.replaceChildren();
  catalogMessage.replaceChildren();

  if (!products.length) {
    catalogMessage.textContent = state.products.length ? 'Nenhum achado combina com essa busca.' : 'Ainda não há produtos por aqui. Volte em breve.';
    return;
  }

  products.forEach((product, index) => {
    const card = document.createElement('article');
    card.className = 'product-card';
    card.style.animationDelay = `${Math.min(index, 8) * 45}ms`;
    const media = document.createElement('div');
    media.className = 'product-card-media';
    const imageUrl = safeUrl(product.Imagem);
    if (imageUrl) {
      const image = document.createElement('img');
      image.src = imageUrl;
      image.alt = product.Nome || 'Produto';
      image.loading = 'lazy';
      image.onerror = () => image.remove();
      media.append(image);
    }
    const category = document.createElement('span');
    category.className = 'product-card-category';
    category.textContent = product.Categoria || 'Achado';
    media.append(category);

    const body = document.createElement('div');
    body.className = 'product-card-body';
    const title = document.createElement('h3');
    title.textContent = product.Nome || 'Produto';
    const description = document.createElement('p');
    description.className = 'product-card-description';
    description.textContent = product.Descricao || '';
    const bottom = document.createElement('div');
    bottom.className = 'product-card-bottom';
    const price = document.createElement('strong');
    price.className = 'product-card-price';
    price.textContent = formatPrice(product.Preco);
    bottom.append(price, makeAffiliateLink(product, '↗', 'product-card-link'));
    body.append(title, description, bottom);
    card.append(media, body);
    productGrid.append(card);
  });
}

async function loadProducts() {
  try {
    const response = await fetch('/api/products');
    if (!response.ok) throw new Error(`Erro ${response.status}`);
    const products = await response.json();
    if (!Array.isArray(products)) throw new Error('Resposta inválida da API');
    state.products = products;
    renderFeatured(products[0]);
    renderCategories();
    renderProducts();
  } catch (error) {
    featureDetails.textContent = 'Não foi possível carregar o destaque.';
    catalogMessage.textContent = 'Não foi possível carregar os achados. Tente novamente em instantes.';
    console.error('Falha ao carregar produtos:', error);
  }
}

document.querySelector('#search').addEventListener('input', event => {
  state.query = event.target.value;
  renderProducts();
});
document.querySelector('#sort').addEventListener('change', event => {
  state.sort = event.target.value;
  renderProducts();
});
document.addEventListener('keydown', event => {
  if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
    event.preventDefault();
    document.querySelector('#search').focus();
  }
});

loadProducts();
