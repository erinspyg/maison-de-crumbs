// public/admin.js

fetch('/api/products', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
})
  .then(res => res.json())
  .then(products => {
    const container = document.getElementById('admin-product-list');
    container.innerHTML = '';

    products.forEach(p => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `
        <img src="${p.image_url}" alt="${p.name}" />
        <h3>${p.name}</h3>
        <p><strong>Rp ${p.price.toLocaleString('id-ID')}</strong></p>
        <button onclick="editProduct(${p.id})">Edit</button>
        <button onclick="deleteProduct(${p.id})" style="margin-top:5px;">Hapus</button>
      `;
      container.appendChild(card);
    });
  })
  .catch(err => {
    console.error('❌ Gagal ambil produk:', err);
    alert('Gagal memuat daftar produk. Pastikan Anda login sebagai admin.');
  });

function editProduct(id) {
  window.location.href = `edit-product.html?id=${id}`;
}

function deleteProduct(id) {
  if (confirm('Yakin ingin menghapus produk ini?')) {
    fetch(`/api/products/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    })
      .then(res => res.json())
      .then(data => {
        alert(data.message || 'Produk berhasil dihapus');
        location.reload();
      })
      .catch(err => {
        console.error('❌ Error saat menghapus:', err);
        alert('Gagal menghapus produk');
      });
  }
}
