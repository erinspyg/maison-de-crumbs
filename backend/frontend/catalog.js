document.addEventListener('DOMContentLoaded', () => {
  const catalogContainer = document.getElementById('catalog-container');

  catalogContainer.innerHTML = "<p>Loading produk...</p>";

  fetch('/api/products')
    .then(res => {
      if (!res.ok) throw new Error('Gagal ambil data produk');
      return res.json();
    })
    .then(products => {
      if (!products.length) {
        catalogContainer.innerHTML = "<p>Tidak ada produk saat ini.</p>";
        return;
      }

      catalogContainer.innerHTML = ''; // Kosongkan kontainer dulu

      products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
          <img src="${product.image_url}" alt="${product.name}" loading="lazy">
          <h3>${product.name}</h3>
          <p><strong>Rp${Number(product.price || 0).toLocaleString('id-ID')}</strong></p>
          <button class="buy-btn" data-id="${product.id}">Beli</button>
        `;
        catalogContainer.appendChild(card);
      });

      // Tambahkan event listener ke semua tombol "Beli"
      document.querySelectorAll('.buy-btn').forEach(button => {
        button.addEventListener('click', () => {
          const productId = button.dataset.id;
          const token = localStorage.getItem('token');

          if (!token) {
            alert('Silakan login terlebih dahulu sebelum membeli.');
            window.location.href = 'login.html';
            return;
          }

          fetch('/api/cart', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ productId: parseInt(productId) })
          })
            .then(res => res.json())
            .then(data => {
              alert(data.message || 'Berhasil ditambahkan ke keranjang!');
              button.textContent = '✅ Ditambahkan';
              button.disabled = true;
              button.style.backgroundColor = '#ccc';
            })
            .catch(err => {
              console.error('❌ Gagal menambahkan ke keranjang:', err);
              alert('Terjadi kesalahan saat menambahkan ke keranjang.');
            });
        });
      });
    })
    .catch(error => {
      catalogContainer.innerHTML = "<p style='color:red;'>Gagal memuat produk. Pastikan backend berjalan di port 3000.</p>";
      console.error('❌ Error fetching products:', error);
    });
});
