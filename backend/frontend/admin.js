// public/admin.js
fetch('http://localhost:3000/products')
  .then(res => res.json())
  .then(products => {
    const container = document.getElementById('admin-product-list');
    container.innerHTML = '';

    products.forEach(p => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `
        <img src="${p.image}" alt="${p.name}" />
        <h3>${p.name}</h3>
        <p>${p.description || ''}</p>
        <p><strong>Rp ${p.price.toLocaleString()}</strong></p>
        <button onclick="editProduct(${p.id})">Edit</button>
        <button onclick="deleteProduct(${p.id})" style="margin-top:5px;">Hapus</button>
      `;
      container.appendChild(card);
    });
  });

function editProduct(id) {
  window.location.href = `edit-product.html?id=${id}`;
}

function deleteProduct(id) {
  if (confirm('Yakin ingin menghapus produk ini?')) {
    fetch(`http://localhost:3000/products/${id}`, {
      method: 'DELETE'
    }).then(() => location.reload());
  }
}
