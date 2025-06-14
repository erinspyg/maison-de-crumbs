async function fetchCart() {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Silakan login terlebih dahulu.');
    window.location.href = 'login.html';
    return;
  }

  const res = await fetch('/api/cart', {
    headers: {
      'Authorization': 'Bearer ' + token
    }
  });

  const data = await res.json();
  const container = document.getElementById('cart-items');
  const totalDiv = document.getElementById('total');

  container.innerHTML = '';
  let total = 0;

  if (!data.length) {
    container.innerHTML = '<p style="text-align:center;">Keranjang kosong.</p>';
    totalDiv.innerText = '';
    return;
  }

  data.forEach(item => {
    const subtotal = item.price * item.quantity;
    total += subtotal;

    const el = document.createElement('div');
    el.className = 'cart-item';
    el.innerHTML = `
      <img src="${item.image_url}" alt="${item.name}">
      <div class="item-details">
        <div class="item-name">${item.name}</div>
        <div class="item-qty">Jumlah: ${item.quantity}</div>
      </div>
      <div class="item-price">Rp${subtotal.toLocaleString()}</div>
    `;
    container.appendChild(el);
  });

  totalDiv.innerText = `Total: Rp${total.toLocaleString()}`;
}

async function checkout() {
  const res = await fetch('/api/checkout', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + localStorage.getItem('token')
    }
  });
  const data = await res.json();
  alert(data.message);
  fetchCart();
}

document.addEventListener('DOMContentLoaded', fetchCart);
