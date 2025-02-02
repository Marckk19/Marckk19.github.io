document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab-btn');
  const sections = document.querySelectorAll('.section');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));

      tab.classList.add('active');

      const sectionId = tab.dataset.section;
      document.getElementById(sectionId).classList.add('active');

      updateOrderCount();
    });
  });

  const withdrawBtn = document.getElementById('withdrawBtn');
  withdrawBtn.addEventListener('click', () => {
    const totalSalesElement = document.getElementById('totalSales');
    const totalSales = parseFloat(totalSalesElement.textContent.replace('$', '')) || 0;
    
    if (totalSales > 0) {
      const confirmDiv = document.createElement('div');
      confirmDiv.className = 'floating-confirm';
      confirmDiv.innerHTML = `
        <div class="floating-confirm-content">
          <h3>Retiro de Efectivo</h3>
          <p>Total disponible para retirar: $${totalSales.toFixed(2)}</p>
          <input type="number" id="withdrawAmount" placeholder="Monto a retirar" 
                 step="0.01" max="${totalSales}" min="0.01" 
                 style="width: 100%; padding: 8px; margin: 10px 0;">
          <div class="confirm-buttons">
            <button onclick="processWithdrawal()" class="confirm-btn">Confirmar Retiro</button>
            <button onclick="this.closest('.floating-confirm').remove()" class="cancel-btn">Cancelar</button>
          </div>
        </div>
      `;
      document.body.appendChild(confirmDiv);

      // Focus the input field
      setTimeout(() => {
        document.getElementById('withdrawAmount').focus();
      }, 100);
    } else {
      const confirmDiv = document.createElement('div');
      confirmDiv.className = 'floating-confirm';
      confirmDiv.innerHTML = `
        <div class="floating-confirm-content">
          <h3>No hay fondos disponibles</h3>
          <p>No hay ventas disponibles para retirar.</p>
          <div class="confirm-buttons">
            <button onclick="this.closest('.floating-confirm').remove()" class="cancel-btn">Cerrar</button>
          </div>
        </div>
      `;
      document.body.appendChild(confirmDiv);
    }
  });

  window.processWithdrawal = () => {
    const withdrawAmount = parseFloat(document.getElementById('withdrawAmount').value);
    const totalSalesElement = document.getElementById('totalSales');  
    const currentTotal = parseFloat(totalSalesElement.textContent.replace(/[^0-9.-]+/g, ''));

    if (withdrawAmount > 0 && withdrawAmount <= currentTotal) {
      // Store both the remaining balance and total withdrawals in localStorage
      const remainingBalance = currentTotal - withdrawAmount;
      const totalWithdrawals = parseFloat(localStorage.getItem('totalWithdrawals') || '0') + withdrawAmount;
      
      localStorage.setItem('totalWithdrawals', totalWithdrawals);
      localStorage.setItem('currentBalance', remainingBalance);
      
      totalSalesElement.textContent = `$${remainingBalance.toFixed(2)}`;

      // Add withdrawal transaction to the transactions table
      const transactionsBody = document.getElementById('transactionsBody');
      const newRow = document.createElement('tr');
      newRow.innerHTML = `
        <td>${new Date().toLocaleDateString()}</td>
        <td>Retiro</td>
        <td>Retiro de efectivo</td>
        <td>1</td>
        <td>$${withdrawAmount.toFixed(2)}</td>
        <td>$${withdrawAmount.toFixed(2)}</td>
      `;
      transactionsBody.appendChild(newRow);

      // Close the confirmation window
      document.querySelector('.floating-confirm').remove();

      // Show success message
      const successDiv = document.createElement('div');
      successDiv.className = 'floating-confirm';
      successDiv.innerHTML = `
        <div class="floating-confirm-content">
          <h3>Retiro Exitoso</h3>
          <p>Se ha retirado $${withdrawAmount.toFixed(2)} exitosamente.</p>
          <div class="confirm-buttons">
            <button onclick="this.closest('.floating-confirm').remove()" class="confirm-btn">Aceptar</button>
          </div>
        </div>
      `;
      document.body.appendChild(successDiv);
      
      // Save the updated total to localStorage
      saveData();
    } else {
      alert('Por favor ingrese un monto válido');
    }
  };

  const addProductBtn = document.getElementById('addProductBtn');
  addProductBtn.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('inventoryModal').style.display = 'block';
    resetInventoryForm();
  });

  const inventoryModalCloseBtn = document.getElementById('closeInventoryModal');
  inventoryModalCloseBtn.addEventListener('click', () => {
    document.getElementById('inventoryModal').style.display = 'none';
  });

  const newOrderModal = document.getElementById('newOrderModal');
  const newOrderBtn = document.getElementById('newOrderBtn');
  newOrderBtn.addEventListener('click', () => {
    newOrderModal.style.display = 'block';
    updateProductSelect();
  });

  const closeBtns = document.querySelectorAll('.close');
  closeBtns.forEach(btn => {
    btn.addEventListener('click', (event) => {
      const modal = event.currentTarget.closest('.modal');
      modal.style.display = 'none';
      resetOrderForm();
    });
  });

  let currentOrderItems = [];
  let orders = JSON.parse(localStorage.getItem('orders')) || [];
  let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
  let archivedOrders = JSON.parse(localStorage.getItem('archivedOrders')) || [];
  let showingArchived = false;

  function saveData() {
    localStorage.setItem('orders', JSON.stringify(orders));
    localStorage.setItem('inventory', JSON.stringify(inventory));
    localStorage.setItem('archivedOrders', JSON.stringify(archivedOrders));
    
    // Ensure total invested is not modified by other save operations
    if (!localStorage.getItem('totalInvested')) {
      localStorage.setItem('totalInvested', '0');
    }
  }

  const inventoryForm = document.getElementById('inventoryForm');
  inventoryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(inventoryForm);
    const newProduct = {
      id: Date.now(),
      name: formData.get('productName'),
      buyPrice: parseFloat(formData.get('buyPrice')),
      sellPrice: parseFloat(formData.get('sellPrice')),
      quantity: parseInt(formData.get('quantity')),
      imageUrl: formData.get('imageUrl'),
    };

    const fileInput = inventoryForm.querySelector('input[name="image"]');
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const reader = new FileReader();
      reader.onloadend = function() {
        newProduct.imageUrl = reader.result;
        finishAddingProduct(newProduct);
      }
      reader.readAsDataURL(file);
    } else {
      newProduct.imageUrl = newProduct.imageUrl || 'https://via.placeholder.com/150';
      finishAddingProduct(newProduct);
    }
  });

  function finishAddingProduct(newProduct) {
    // Track original investment ONLY when first adding a product
    const productKey = `product_investment_${newProduct.id}`;
    const originalInvestment = newProduct.buyPrice * newProduct.quantity;
    
    // Only store if not already stored
    if (!localStorage.getItem(productKey)) {
      localStorage.setItem(productKey, originalInvestment.toString());
      
      // Update total invested by adding the new product's investment
      const currentTotalInvested = parseFloat(localStorage.getItem('totalInvested') || '0');
      const newTotalInvested = currentTotalInvested + originalInvestment;
      localStorage.setItem('totalInvested', newTotalInvested.toString());
    }
    
    inventory.push(newProduct);
    addInventoryItem(newProduct);
    inventoryForm.reset();
    updateTotalProductsCount();
    updateTotalInvested();
    document.getElementById('inventoryModal').style.display = 'none';
    saveData();
  }

  function resetOrderForm() {
    document.getElementById('newOrderForm').reset();
    currentOrderItems = [];
    updateOrderSummary();
  }

  function resetInventoryForm() {
    document.getElementById('inventoryForm').reset();
  }

  document.getElementById('newOrderForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const customerName = document.querySelector('[name="customerName"]').value;
    const customerPhone = document.querySelector('[name="customerPhone"]').value;

    const order = {
      id: Date.now(),
      customer: customerName,
      phone: customerPhone,
      items: [...currentOrderItems],
      total: currentOrderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      status: 'orders',
      date: new Date(),
    };

    // IMPORTANT: Update only the inventory quantities, do NOT touch investment tracking
    currentOrderItems.forEach(orderItem => {
      const inventoryItem = inventory.find(item => item.id === orderItem.id);
      if (inventoryItem) {
        inventoryItem.quantity -= orderItem.quantity;
      }
    });

    addOrderToDisplay(order);
    updateInventoryGrid();
    updateDashboardStats();
    updateTotalProductsCount(); 
    orders.push(order);
    saveData();
    newOrderModal.style.display = 'none';
    resetOrderForm();
    
    // Total invested should NOT be modified here
    updateTotalInvested();
  });

  function updateTotalProductsCount() {
    const totalProducts = inventory.reduce((sum, product) => sum + (product.quantity || 0), 0);
    const totalProductsElement = document.getElementById('totalProducts');
    
    if (totalProductsElement) {
      totalProductsElement.textContent = totalProducts;
    }
  }

  const addToOrderBtn = document.getElementById('addToOrderBtn');
  addToOrderBtn.addEventListener('click', () => {
    const productSelect = document.getElementById('productSelect');
    const quantityInput = document.querySelector('[name="quantity"]');
    const productId = productSelect.value;
    const quantity = parseInt(quantityInput.value);

    if (productId && quantity > 0) {
      const product = inventory.find(p => p.id === parseInt(productId));
      if (product && product.quantity >= quantity) {
        const orderItem = {
          id: product.id,
          name: product.name,
          price: product.sellPrice,
          quantity: quantity
        };
        currentOrderItems.push(orderItem);
        updateOrderSummary();
        quantityInput.value = 0;
      } else {
        alert('No hay suficiente stock disponible');
      }
    }
  });

  function updateOrderSummary() {
    const orderItemsDiv = document.getElementById('orderItems');
    const orderTotalSpan = document.getElementById('orderTotal');
    
    orderItemsDiv.innerHTML = currentOrderItems.map(item => `
      <div class="order-item">
        <span>${item.name} x ${item.quantity}</span>
        <span>$${(item.price * item.quantity).toFixed(2)}</span>
        <button type="button" class="remove-item" onclick="removeOrderItem(${currentOrderItems.indexOf(item)})">&times;</button>
      </div>
    `).join('');
    
    const total = currentOrderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    orderTotalSpan.textContent = total.toFixed(2);
  }

  window.removeOrderItem = (index) => {
    currentOrderItems.splice(index, 1);
    updateOrderSummary();
  };

  function createOrderCard(order) {
    const orderCard = document.createElement('div');
    orderCard.className = 'order-card';
    orderCard.dataset.id = order.id;
    
    const invoiceButton = order.status === 'completed' ? 
      `<button class="edit-order-btn" onclick="showInvoice(${JSON.stringify(order).replace(/"/g, '&quot;')})">
         Ver Factura
       </button>` : '';

    orderCard.innerHTML = `
      <div class="order-header">
        <span class="order-id">#${order.id}</span>
        <select class="order-status-select" onchange="updateOrderStatus(${order.id}, this.value)" ${order.archived ? 'disabled' : ''}>
          <option value="orders" ${order.status === 'orders' ? 'selected' : ''}>Pendiente</option>
          <option value="in-progress" ${order.status === 'in-progress' ? 'selected' : ''}>En Progreso</option>
          <option value="delivering" ${order.status === 'delivering' ? 'selected' : ''}>Enviando</option>
          <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completado</option>
        </select>
      </div>
      <div class="order-details">
        <p><strong>Cliente:</strong> ${order.customer}</p>
        <p><strong>Teléfono:</strong> ${order.phone}</p>
        <ul class="order-items-list">
          ${order.items.map(item => `
            <li>${item.name} x ${item.quantity} - $${(item.price * item.quantity).toFixed(2)}</li>
          `).join('')}
        </ul>
        <p><strong>Total:</strong> $${order.total.toFixed(2)}</p>
      </div>
      ${order.status === 'completed' ? `
        <div class="order-actions">
          ${invoiceButton}
          <button class="edit-order-btn" onclick="editOrder(${order.id})">Editar</button>
          <button class="delete-order-btn" onclick="showDeleteConfirmation(${order.id})">Eliminar</button>
          ${!order.archived ? `
            <button class="archive-btn" onclick="showArchiveConfirmation(${order.id})">Archivar</button>
          ` : `
            <button class="unarchive-btn" onclick="showUnarchiveConfirmation(${order.id})">Desarchivar</button>
          `}
        </div>
      ` : ''}
    `;
    return orderCard;
  }

  window.updateOrderStatus = (orderId, newStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      const oldStatus = order.status;
      order.status = newStatus;
      
      const orderCard = document.querySelector(`.order-card[data-id="${orderId}"]`);
      if (orderCard) {
        orderCard.remove();
      }
      
      const targetContainer = document.querySelector(`#${newStatus} .orders-container`);
      if (targetContainer) {
        const newOrderCard = createOrderCard(order);
        targetContainer.prepend(newOrderCard);
      }

      if (newStatus === 'completed' && oldStatus !== 'completed') {
        const currentBalance = parseFloat(localStorage.getItem('currentBalance') || '0');
        const newBalance = currentBalance + order.total;
        localStorage.setItem('currentBalance', newBalance);
        document.getElementById('totalSales').textContent = `$${newBalance.toFixed(2)}`;

        // Add transactions for each product in the completed order
        order.items.forEach(item => {
          addTransaction('Venta', item.name, item.quantity, item.price);
        });
      }
      
      updateOrderCount();
      updateTotalInvested(); // Make sure total invested doesn't change
      saveData();
    }
  };

  function addOrderToDisplay(order) {
    const orderCard = createOrderCard(order);
    const targetSection = document.querySelector(`#${order.status} .orders-container`);
    if (targetSection) {
      targetSection.prepend(orderCard);
    }
    
    if (order.status === 'completed') {
      const currentBalance = parseFloat(localStorage.getItem('currentBalance') || '0');
      const newBalance = currentBalance + order.total;
      localStorage.setItem('currentBalance', newBalance);
      document.getElementById('totalSales').textContent = `$${newBalance.toFixed(2)}`;
    }
    
    updateOrderCount();
    saveData();
  }

  function updateOrderCount() {
    const activeOrders = orders.filter(order => order.status !== 'completed').length;
    document.getElementById('totalOrders').textContent = activeOrders;
  }

  const inventoryGrid = document.getElementById('inventoryGrid');

  window.addInventoryItem = (product) => {
    const productKey = `product_investment_${product.id}`;
    
    // Only add new investment if it hasn't been recorded before
    if (!localStorage.getItem(productKey)) {
      const originalInvestment = product.buyPrice * product.quantity;
      localStorage.setItem(productKey, originalInvestment.toString());
      
      // Update total invested by adding the new investment
      const currentTotalInvested = parseFloat(localStorage.getItem('totalInvested') || '0');
      const newTotalInvested = currentTotalInvested + originalInvestment;
      localStorage.setItem('totalInvested', newTotalInvested.toString());
    }

    // Rest of the existing function remains the same
    const item = document.createElement('div');
    item.className = 'inventory-item small';
    item.dataset.id = product.id;
    item.innerHTML = `
      <img src="${product.imageUrl}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/150'" ondblclick="openGallery(${product.id})">
      <div class="inventory-item-details">
        <h3>${product.name}</h3>
        <p>Precio de compra: $${product.buyPrice.toFixed(2)}</p>
        <p>Precio de venta: $${product.sellPrice.toFixed(2)}</p>
        <p>Cantidad: ${product.quantity}</p>
        <p>Ganancia por unidad: $${(product.sellPrice - product.buyPrice).toFixed(2)}</p>
      </div>
      <div class="inventory-item-options">
        <button class="delete-btn" onclick="confirmDelete(${product.id})">Eliminar</button>
        <button class="edit-btn" onclick="confirmEdit(${product.id})">Editar</button>
      </div>
    `;
    inventoryGrid.appendChild(item);
  }

  window.deleteProduct = (id) => {
    const index = inventory.findIndex(p => p.id === id);
    if (index > -1) {
      inventory.splice(index, 1);
      updateInventoryGrid();
      updateTotalProductsCount();
      saveData();
      document.querySelector('.floating-confirm')?.remove();
    }
  };

  window.confirmDelete = (id) => {
    const confirmDiv = document.createElement('div');
    confirmDiv.className = 'floating-confirm';
    confirmDiv.innerHTML = `
      <div class="floating-confirm-content">
        <h3>Confirmar Eliminación</h3>
        <p>¿Estás seguro de que deseas eliminar este producto?</p>
        <div class="confirm-buttons">
          <button onclick="deleteProduct(${id})" class="confirm-btn">Sí, Eliminar</button>
          <button onclick="this.closest('.floating-confirm').remove()" class="cancel-btn">Cancelar</button>
        </div>
      </div>
    `;
    document.body.appendChild(confirmDiv);
  };

  window.confirmEdit = (id) => {
    const product = inventory.find(p => p.id === id);
    if (product) {
      document.getElementById('editModal').style.display = 'block';
      const editForm = document.getElementById('editForm');
      editForm.productName.value = product.name;
      editForm.buyPrice.value = product.buyPrice;
      editForm.sellPrice.value = product.sellPrice;
      editForm.quantity.value = product.quantity;
      document.getElementById('imageUrlEdit').value = product.imageUrl;

      const saveProductBtn = document.getElementById('saveProductBtn');
      saveProductBtn.onclick = (e) => {
        e.preventDefault();
        const updatedProduct = {
          id: product.id,
          name: editForm.productName.value,
          buyPrice: parseFloat(editForm.buyPrice.value),
          sellPrice: parseFloat(editForm.sellPrice.value),
          quantity: parseInt(editForm.quantity.value) || 0,
          imageUrl: editForm.imageUrl.value || product.imageUrl 
        };

        const index = inventory.findIndex(p => p.id === product.id);
        if (index > -1) {
          // Get the existing product investment amount
          const productKey = `product_investment_${product.id}`;
          const originalInvestment = parseFloat(localStorage.getItem(productKey) || '0');
          
          // Calculate additional investment if quantity increased
          const quantityDiff = updatedProduct.quantity - product.quantity;
          if (quantityDiff > 0) {
            // Only add investment for additional quantity at new buy price
            const additionalInvestment = quantityDiff * updatedProduct.buyPrice;
            const newTotalInvestment = originalInvestment + additionalInvestment;
            
            // Update the product's investment amount
            localStorage.setItem(productKey, newTotalInvestment.toString());
            
            // Update total invested
            const currentTotalInvested = parseFloat(localStorage.getItem('totalInvested') || '0');
            const newTotalInvested = currentTotalInvested + additionalInvestment;
            localStorage.setItem('totalInvested', newTotalInvested.toString());
          }

          inventory[index] = updatedProduct;
          updateInventoryGrid();
          updateTotalProductsCount();
          document.getElementById('editModal').style.display = 'none';
          saveData();
          
          // Make sure to update display without reducing total invested
          updateTotalInvested();
        }
      };
    }
  };

  function updateInventoryGrid() {
    inventoryGrid.innerHTML = '';
    inventory.forEach(product => {
      addInventoryItem(product);
    });
    updateTotalInvested();
  }

  function updateTotalInvested() {
    // Get the stored total invested amount
    const totalInvested = parseFloat(localStorage.getItem('totalInvested') || '0');
    
    // Update the display
    document.getElementById('totalInvested').textContent = `$${totalInvested.toFixed(2)}`;
  }

  const updateProductSelect = () => {
    const productSelect = document.getElementById('productSelect');
    productSelect.innerHTML = '<option value="">Seleccionar producto</option>';
    inventory.forEach(product => {
      if (product.quantity > 0) {
        productSelect.innerHTML += `
          <option value="${product.id}">${product.name} - $${product.sellPrice.toFixed(2)}</option>
        `;
      }
    });
  };

  window.openGallery = (productId) => {
    const product = inventory.find(p => p.id === productId);
    if (!product) return;

    const galleryModal = document.createElement('div');
    galleryModal.className = 'modal gallery-modal';
    galleryModal.innerHTML = `
      <div class="modal-content">
        <span class="close">&times;</span>
        <h2>Galería de ${product.name}</h2>
        <img src="${product.imageUrl}" alt="${product.name}" 
             onerror="this.src='https://via.placeholder.com/150'" 
             style="max-width: 100%; height: auto;"/>
      </div>
    `;
    document.body.appendChild(galleryModal);
    galleryModal.style.display = 'block';

    const closeBtn = galleryModal.querySelector('.close');
    closeBtn.onclick = () => {
      galleryModal.remove();
    };
  };

  function addImageToProduct(productId) {
    const newImageUrl = prompt("Ingrese la URL de la nueva imagen:");
    const product = inventory.find(p => p.id === productId);
    if (product && newImageUrl) {
      product.images = product.images || [];
      product.images.push(newImageUrl);
    }
    updateInventoryGrid();
  }

  function addTransaction(type, productName, quantity, price) {
    const transactionsBody = document.getElementById('transactionsBody');
    const newRow = document.createElement('tr');
    const totalPrice = price * quantity;
    newRow.innerHTML = `
      <td>${new Date().toLocaleDateString()}</td>
      <td>${type.charAt(0).toUpperCase() + type.slice(1)}</td>
      <td>${productName}</td>
      <td>${quantity}</td>
      <td>$${price.toFixed(2)}</td>
      <td>$${totalPrice.toFixed(2)}</td>
    `;
    transactionsBody.appendChild(newRow);
    updateDashboardStats();
  }

  function updateDashboardStats() {
    const totalInvested = inventory.reduce((sum, product) =>
      sum + (product.buyPrice * product.quantity), 0);

    const totalOrderSales = orders
      .filter(order => order.status === 'completed')
      .reduce((sum, order) => sum + order.total, 0);

    const totalArchivedSales = archivedOrders
      .reduce((sum, order) => sum + order.total, 0);

    const totalWithdrawals = parseFloat(localStorage.getItem('totalWithdrawals') || '0');
    
    const currentBalance = parseFloat(localStorage.getItem('currentBalance')) || 
      (totalOrderSales + totalArchivedSales - totalWithdrawals);

    const totalItems = inventory.reduce((sum, product) =>
      sum + product.quantity, 0);

    document.getElementById('totalInvested').textContent = `$${totalInvested.toFixed(2)}`;
    document.getElementById('totalSales').textContent = `$${currentBalance.toFixed(2)}`;
    document.getElementById('totalProducts').textContent = totalItems;
  }

  function loadSavedData() {
    const savedOrders = localStorage.getItem('orders');
    const savedInventory = localStorage.getItem('inventory');
    const savedBalance = localStorage.getItem('currentBalance');
    
    document.querySelectorAll('.orders-container').forEach(container => {
      container.innerHTML = '';
    });
    
    if (savedOrders) {
      orders = JSON.parse(savedOrders);
      orders.forEach(order => addOrderToDisplay(order));
    }
    
    if (savedInventory) {
      inventory = JSON.parse(savedInventory);
      updateInventoryGrid();
    }
    
    if (savedBalance) {
      document.getElementById('totalSales').textContent = `$${parseFloat(savedBalance).toFixed(2)}`;
    }
    
    updateOrderCount();
    updateTotalProductsCount();
    updateTotalInvested();
  }

  function updateHTMLStructure() {
    const sections = ['in-progress', 'delivering', 'completed'];
    sections.forEach(section => {
      const sectionElement = document.getElementById(section);
      if (sectionElement && !sectionElement.querySelector('.orders-container')) {
        const container = document.createElement('div');
        container.className = 'orders-container';
        sectionElement.appendChild(container);
      }
    });
  }

  window.archiveOrder = (orderId) => {
    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex > -1) {
      const order = orders.splice(orderIndex, 1)[0];
      order.archived = true;
      archivedOrders.push(order);
      saveData();
      updateCompletedOrders();
      document.querySelector('.floating-confirm')?.remove();
    }
  };

  window.unarchiveOrder = (orderId) => {
    const orderIndex = archivedOrders.findIndex(o => o.id === orderId);
    if (orderIndex > -1) {
      const order = archivedOrders.splice(orderIndex, 1)[0];
      delete order.archived;
      order.status = 'completed'; 
      orders.push(order);
      saveData();
      updateCompletedOrders();
      document.querySelector('.floating-confirm')?.remove();
    }
  };

  window.deleteOrder = (orderId) => {
    let orderIndex = orders.findIndex(o => o.id === orderId);
    let targetArray = orders;
    
    if (orderIndex === -1) {
      orderIndex = archivedOrders.findIndex(o => o.id === orderId);
      targetArray = archivedOrders;
    }

    if (orderIndex > -1) {
      targetArray.splice(orderIndex, 1);
      saveData();
      const orderCard = document.querySelector(`.order-card[data-id="${orderId}"]`);
      if (orderCard) {
        orderCard.remove();
      }
      document.querySelector('.floating-confirm')?.remove();
    }
  };

  function updateCompletedOrders() {
    const completedContainer = document.querySelector('#completed .orders-container');
    if (!completedContainer) return;
    
    completedContainer.innerHTML = '';
    const ordersToShow = showingArchived ? 
      archivedOrders : 
      orders.filter(o => o.status === 'completed' && !o.archived);
  
    ordersToShow.forEach(order => {
      const orderCard = createOrderCard(order);
      completedContainer.appendChild(orderCard);
    });
  }

  document.getElementById('showActiveBtn').addEventListener('click', (e) => {
    e.preventDefault(); 
    showingArchived = false;
    document.getElementById('showArchivedBtn').classList.remove('active-filter');
    e.target.classList.add('active-filter');
    updateCompletedOrders();
    const completedTab = document.querySelector('.tab-btn[data-section="completed"]');
    if (!completedTab.classList.contains('active')) {
      completedTab.click();
    }
  });

  document.getElementById('showArchivedBtn').addEventListener('click', (e) => {
    e.preventDefault(); 
    showingArchived = true;
    document.getElementById('showActiveBtn').classList.remove('active-filter');
    e.target.classList.add('active-filter');
    updateCompletedOrders();
    const completedTab = document.querySelector('.tab-btn[data-section="completed"]');
    if (!completedTab.classList.contains('active')) {
      completedTab.click();
    }
  });

  window.showArchiveConfirmation = (orderId) => {
    const confirmDiv = document.createElement('div');
    confirmDiv.className = 'floating-confirm';
    confirmDiv.innerHTML = `
      <div class="floating-confirm-content">
        <h3>Confirmar Archivo</h3>
        <p>¿Deseas archivar este pedido?</p>
        <div class="confirm-buttons">
          <button onclick="archiveOrder(${orderId})" class="confirm-btn">Sí, Archivar</button>
          <button onclick="this.closest('.floating-confirm').remove()" class="cancel-btn">Cancelar</button>
        </div>
      </div>
    `;
    document.body.appendChild(confirmDiv);
  };

  window.showDeleteConfirmation = (orderId) => {
    const confirmDiv = document.createElement('div');
    confirmDiv.className = 'floating-confirm';
    confirmDiv.innerHTML = `
      <div class="floating-confirm-content">
        <h3>Confirmar Eliminación</h3>
        <p>¿Estás seguro de que deseas eliminar este pedido?</p>
        <div class="confirm-buttons">
          <button onclick="deleteOrder(${orderId})" class="confirm-btn">Sí, Eliminar</button>
          <button onclick="this.closest('.floating-confirm').remove()" class="cancel-btn">Cancelar</button>
        </div>
      </div>
    `;
    document.body.appendChild(confirmDiv);
  };

  window.showUnarchiveConfirmation = (orderId) => {
    const confirmDiv = document.createElement('div');
    confirmDiv.className = 'floating-confirm';
    confirmDiv.innerHTML = `
      <div class="floating-confirm-content">
        <h3>Confirmar Desarchivar</h3>
        <p>¿Deseas desarchivar este pedido?</p>
        <div class="confirm-buttons">
          <button onclick="unarchiveOrder(${orderId})" class="confirm-btn">Sí, Desarchivar</button>
          <button onclick="this.closest('.floating-confirm').remove()" class="cancel-btn">Cancelar</button>
        </div>
      </div>
    `;
    document.body.appendChild(confirmDiv);
  };

  window.editOrder = (orderId) => {
    const order = orders.find(o => o.id === orderId) || archivedOrders.find(o => o.id === orderId);
    if (!order) return;

    const editModal = document.getElementById('editOrderModal');
    const editForm = document.getElementById('editOrderForm');
    
    editForm.customerName.value = order.customer;
    editForm.customerPhone.value = order.phone;
    
    let currentEditItems = [...order.items];
    updateEditOrderSummary(currentEditItems);
    
    editForm.onsubmit = (e) => {
      e.preventDefault();
      order.customer = editForm.customerName.value;
      order.phone = editForm.customerPhone.value;
      order.items = currentEditItems;
      order.total = currentEditItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      saveData();
      updateOrderDisplay(order);
      editModal.style.display = 'none';
    };
    
    editModal.style.display = 'block';
  };

  function updateEditOrderSummary(items) {
    const orderItemsDiv = document.getElementById('editOrderItems');
    const orderTotalSpan = document.getElementById('editOrderTotal');
    
    orderItemsDiv.innerHTML = items.map((item, index) => `
      <div class="order-item">
        <span>${item.name} x ${item.quantity}</span>
        <span>$${(item.price * item.quantity).toFixed(2)}</span>
        <button type="button" class="remove-item" onclick="removeEditOrderItem(${index})">&times;</button>
      </div>
    `).join('');
    
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    orderTotalSpan.textContent = total.toFixed(2);
  }

  window.removeEditOrderItem = (index) => {
    const items = Array.from(document.querySelectorAll('#editOrderItems .order-item'));
    if (items[index]) {
      items[index].remove();
      updateEditOrderSummary(items);
    }
  };

  function updateOrderDisplay(order) {
    const orderCard = document.querySelector(`.order-card[data-id="${order.id}"]`);
    if (orderCard) {
      orderCard.remove();
    }
    addOrderToDisplay(order);
  }

  document.getElementById('showActiveBtn').classList.add('active-filter');
  updateCompletedOrders();
  
  updateHTMLStructure();
  loadSavedData();

  function showInvoice(order) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.maxWidth = '800px';

    const closeBtn = document.createElement('span');
    closeBtn.className = 'close';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => modal.remove();

    const invoice = createInvoice(order);

    modalContent.appendChild(closeBtn);
    modalContent.appendChild(invoice);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
  }

  function createInvoice(order) {
    const invoiceTemplate = JSON.parse(localStorage.getItem('invoiceTemplate')) || {
      logo: '',
      companyName: 'Mi Empresa',
      description: 'Descripción de la empresa',
      address: 'Dirección de la empresa',
      phone: 'Teléfono de contacto',
      email: 'Email de contacto'
    };

    const invoice = document.createElement('div');
    invoice.className = 'invoice';
    invoice.innerHTML = `
      <div class="invoice-header">
        <div class="invoice-logo">
          ${invoiceTemplate.logo ? `<img src="${invoiceTemplate.logo}" alt="Logo">` : ''}
        </div>
        <div class="invoice-company">
          <h2>${invoiceTemplate.companyName}</h2>
          <p>${invoiceTemplate.description}</p>
          <p>${invoiceTemplate.address}</p>
          <p>${invoiceTemplate.phone}</p>
          <p>${invoiceTemplate.email}</p>
        </div>
      </div>
      <div class="invoice-details">
        <div>
          <h3>Cliente</h3>
          <p>Nombre: ${order.customer}</p>
          <p>Teléfono: ${order.phone}</p>
        </div>
        <div>
          <h3>Detalles del Pedido</h3>
          <p>Pedido #: ${order.id}</p>
          <p>Fecha: ${new Date(order.date).toLocaleDateString()}</p>
        </div>
      </div>
      <table class="invoice-items">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Precio Unitario</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${order.items.map(item => `
            <tr>
              <td>${item.name}</td>
              <td>${item.quantity}</td>
              <td>$${item.price.toFixed(2)}</td>
              <td>$${(item.price * item.quantity).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="invoice-total">
        <h3>Total: $${order.total.toFixed(2)}</h3>
      </div>
      <button class="print-btn no-print" onclick="window.print()">Imprimir Factura</button>
    `;
  
    return invoice;
  }

  // Add clear invested money functionality
  document.getElementById('clearInvestedButton').addEventListener('click', () => {
    const confirmDiv = document.createElement('div');
    confirmDiv.className = 'floating-confirm';
    confirmDiv.innerHTML = `
      <div class="floating-confirm-content">
        <h3>Confirmar Limpieza</h3>
        <p>¿Estás seguro de que deseas limpiar el dinero invertido?</p>
        <div class="confirm-buttons">
          <button onclick="clearInvestedMoney()" class="confirm-btn">Sí, Limpiar</button>
          <button onclick="this.closest('.floating-confirm').remove()" class="cancel-btn">Cancelar</button>
        </div>
      </div>
    `;
    document.body.appendChild(confirmDiv);
  });

  window.clearInvestedMoney = () => {
    // Remove ALL product investment tracking
    Object.keys(localStorage)
      .filter(key => key.startsWith('product_investment_'))
      .forEach(key => localStorage.removeItem(key));
    
    // Reset total invested to zero
    localStorage.setItem('totalInvested', '0');
    updateTotalInvested();
    saveData();
    document.querySelector('.floating-confirm')?.remove();
  };

  // Add print inventory functionality
  document.getElementById('printInventoryButton').addEventListener('click', () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Inventario</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f4f4f4; }
            .header { margin-bottom: 20px; }
            .total { margin-top: 20px; font-weight: bold; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Reporte de Inventario</h2>
            <p>Fecha: ${new Date().toLocaleDateString()}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio de Compra</th>
                <th>Precio de Venta</th>
                <th>Valor Total</th>
              </tr>
            </thead>
            <tbody>
              ${inventory.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.quantity}</td>
                  <td>$${item.buyPrice.toFixed(2)}</td>
                  <td>$${item.sellPrice.toFixed(2)}</td>
                  <td>$${(item.buyPrice * item.quantity).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total">
            <p>Total de Productos: ${inventory.reduce((sum, item) => sum + item.quantity, 0)}</p>
            <p>Valor Total del Inventario: $${inventory.reduce((sum, item) => sum + (item.buyPrice * item.quantity), 0).toFixed(2)}</p>
          </div>
          <button onclick="window.print()">Imprimir</button>
        </body>
      </html>
    `);
    printWindow.document.close();
  });

  // Add print transactions button to the transactions section
  const transactionsHeader = document.querySelector('.transactions-header');
  const monthSelector = document.createElement('select');
  monthSelector.id = 'transactionMonthSelect';
  monthSelector.className = 'transaction-month-select';

  const yearSelector = document.createElement('select');
  yearSelector.id = 'transactionYearSelect';
  yearSelector.className = 'transaction-month-select';

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  months.forEach((month, index) => {
    const option = document.createElement('option');
    option.value = index + 1;
    option.textContent = month;
    monthSelector.appendChild(option);
  });

  for (let year = currentYear; year <= 2030; year++) {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    yearSelector.appendChild(option);
  }

  monthSelector.value = currentMonth + 1;
  yearSelector.value = currentYear;

  const filterContainer = document.createElement('div');
  filterContainer.style.display = 'flex';
  filterContainer.style.gap = '10px';
  filterContainer.appendChild(monthSelector);
  filterContainer.appendChild(yearSelector);

  const printTransactionsBtn = document.createElement('button');
  printTransactionsBtn.className = 'add-transaction-btn';
  printTransactionsBtn.style.background = 'var(--blue-color)';
  printTransactionsBtn.style.color = 'white';
  printTransactionsBtn.style.marginLeft = '10px';
  printTransactionsBtn.textContent = 'Imprimir Transacciones';
  printTransactionsBtn.addEventListener('click', printTransactions);

  transactionsHeader.insertBefore(filterContainer, transactionsHeader.children[0]);
  transactionsHeader.appendChild(printTransactionsBtn);

  function printTransactions() {
    const selectedMonth = parseInt(monthSelector.value);
    const selectedYear = parseInt(yearSelector.value);
  
    const transactions = Array.from(document.getElementById('transactionsBody').getElementsByTagName('tr'))
      .filter(row => {
        const date = new Date(row.cells[0].textContent);
        return date.getFullYear() === selectedYear && 
               (date.getMonth() + 1) === selectedMonth;
      });

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Registro de Transacciones - ${months[selectedMonth - 1]} ${selectedYear}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f4f4f4; }
            .header { margin-bottom: 20px; }
            .summary { margin-top: 20px; }
            @media print {
              button { display: none; }
            }
            .transaction-type {
              padding: 4px 8px;
              border-radius: 4px;
              font-weight: 500;
            }
            .transaction-retiro {
              background-color: #fee2e2;
              color: #991b1b;
            }
            .no-transactions {
              text-align: center;
              padding: 20px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Registro de Transacciones</h2>
            <p>Período: ${months[selectedMonth - 1]} ${selectedYear}</p>
          </div>
          ${transactions.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Precio Unitario</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${transactions.map(row => `
                  <tr>
                    <td>${row.cells[0].textContent}</td>
                    <td>
                      <span class="transaction-type ${row.cells[1].textContent.toLowerCase().includes('retiro') ? 'transaction-retiro' : ''}">
                        ${row.cells[1].textContent}
                      </span>
                    </td>
                    <td>${row.cells[2].textContent}</td>
                    <td>${row.cells[3].textContent}</td>
                    <td>${row.cells[4].textContent}</td>
                    <td>${row.cells[5].textContent}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="summary">
              <p><strong>Total de Transacciones:</strong> ${transactions.length}</p>
              <p><strong>Total en Retiros:</strong> $${transactions
                .filter(row => row.cells[1].textContent.toLowerCase().includes('retiro'))
                .reduce((sum, row) => sum + parseFloat(row.cells[5].textContent.replace('$', '')), 0)
                .toFixed(2)}</p>
            </div>
          ` : `
            <div class="no-transactions">
              <p>No hay transacciones registradas para este período</p>
            </div>
          `}
          <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px;">Imprimir</button>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  monthSelector.addEventListener('change', filterTransactions);
  yearSelector.addEventListener('change', filterTransactions);

  function filterTransactions() {
    const selectedMonth = parseInt(monthSelector.value);
    const selectedYear = parseInt(yearSelector.value);
  
    const transactionsBody = document.getElementById('transactionsBody');
    const rows = transactionsBody.getElementsByTagName('tr');

    for (let row of rows) {
      const date = new Date(row.cells[0].textContent);
      const rowMonth = date.getMonth() + 1;
      const rowYear = date.getFullYear();

      row.style.display = (rowMonth === selectedMonth && rowYear === selectedYear) ? '' : 'none';
    }
  }

  // Statistics Section
  const statisticsMonthSelect = document.getElementById('statisticsMonthSelect');
  const statisticsYearSelect = document.getElementById('statisticsYearSelect');
  const topProductsList = document.getElementById('topProductsList');

  // Populate Month and Year Selectors
  function populateStatisticsSelectors() {
    // Month selector
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Clear existing options
    statisticsMonthSelect.innerHTML = '';
    statisticsYearSelect.innerHTML = '';

    // Generate last 12 months options
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentYear, currentMonth - i, 1);
      const monthOption = document.createElement('option');
      monthOption.value = date.getMonth() + 1;
      monthOption.textContent = date.toLocaleDateString('es-ES', { month: 'long' });
      statisticsMonthSelect.appendChild(monthOption);
    }

    // Generate last 5 years options
    for (let i = 0; i < 5; i++) {
      const yearOption = document.createElement('option');
      yearOption.value = currentYear - i;
      yearOption.textContent = currentYear - i;
      statisticsYearSelect.appendChild(yearOption);
    }

    // Set default to current month and year
    statisticsMonthSelect.value = currentMonth + 1;
    statisticsYearSelect.value = currentYear;

    // Update statistics on change
    statisticsMonthSelect.addEventListener('change', updateStatistics);
    statisticsYearSelect.addEventListener('change', updateStatistics);
  }

  function updateStatistics() {
    const selectedMonth = parseInt(statisticsMonthSelect.value);
    const selectedYear = parseInt(statisticsYearSelect.value);

    // Filter completed orders for the selected month and year
    const filteredOrders = orders.filter(order => {
      const orderDate = new Date(order.date);
      return order.status === 'completed' && 
             orderDate.getMonth() + 1 === selectedMonth && 
             orderDate.getFullYear() === selectedYear;
    });

    // Calculate product sales
    const productSales = {};
    const productRevenue = {};

    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        if (!productSales[item.id]) {
          productSales[item.id] = 0;
          productRevenue[item.id] = 0;
        }
        productSales[item.id] += item.quantity;
        productRevenue[item.id] += item.quantity * item.price;
      });
    });

    // Sort products by sales
    const sortedProducts = Object.entries(productSales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);  // Top 5 products

    // Update top products list
    topProductsList.innerHTML = sortedProducts.map(([productId, quantity]) => {
      const product = inventory.find(p => p.id === parseInt(productId));
      if (!product) return '';
      return `
        <div class="top-product-item">
          <div class="product-details">
            <img src="${product.imageUrl}" alt="${product.name}">
            <span>${product.name}</span>
          </div>
          <div class="product-stats">
            <span>Cantidad: ${quantity}</span>
            <span>Ingresos: $${productRevenue[productId].toFixed(2)}</span>
          </div>
        </div>
      `;
    }).join('');

    // Update Charts
    updateSalesCharts(sortedProducts, productSales, productRevenue);
  }

  function updateSalesCharts(sortedProducts, productSales, productRevenue) {
    const salesChart = document.getElementById('salesChart');
    const revenueChart = document.getElementById('revenueChart');

    // Prepare chart data
    const productNames = sortedProducts.map(([productId]) => {
      const product = inventory.find(p => p.id === parseInt(productId));
      return product ? product.name : '';
    });

    const salesData = sortedProducts.map(([productId]) => productSales[productId]);
    const revenueData = sortedProducts.map(([productId]) => productRevenue[productId]);

    // Destroy existing charts if they exist
    Chart.helpers.each(Chart.instances, (instance) => {
      instance.destroy();
    });

    // Sales Chart
    new Chart(salesChart, {
      type: 'bar',
      data: {
        labels: productNames,
        datasets: [{
          label: 'Cantidad Vendida',
          data: salesData,
          backgroundColor: 'rgba(54, 162, 235, 0.6)'
        }]
      },
      options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });

    // Revenue Chart
    new Chart(revenueChart, {
      type: 'bar',
      data: {
        labels: productNames,
        datasets: [{
          label: 'Ingresos',
          data: revenueData,
          backgroundColor: 'rgba(255, 99, 132, 0.6)'
        }]
      },
      options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
  }

  // Initialize statistics section
  populateStatisticsSelectors();
  updateStatistics();

  // Add event listener to statistics tab to refresh data
  document.querySelector('.tab-btn[data-section="statistics"]').addEventListener('click', updateStatistics);

  const backupBtn = document.getElementById('backupBtn');
  backupBtn.addEventListener('click', createBackup);

  function createBackup() {
    // Collect all necessary data to backup
    const backupData = {
      orders: JSON.parse(localStorage.getItem('orders')) || [],
      inventory: JSON.parse(localStorage.getItem('inventory')) || [],
      archivedOrders: JSON.parse(localStorage.getItem('archivedOrders')) || [],
      currentBalance: localStorage.getItem('currentBalance') || '0',
      totalWithdrawals: localStorage.getItem('totalWithdrawals') || '0',
      invoiceTemplate: localStorage.getItem('invoiceTemplate') || null,
      timestamp: new Date().toISOString()
    };

    // Convert data to JSON
    const backupJSON = JSON.stringify(backupData, null, 2);

    // Create a Blob with the backup data
    const blob = new Blob([backupJSON], { type: 'application/json' });

    // Create a link element to trigger download
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    
    // Generate filename with current date
    const date = new Date();
    const filename = `restaurant_backup_${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}.json`;
    link.download = filename;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Show success message
    const successDiv = document.createElement('div');
    successDiv.className = 'floating-confirm';
    successDiv.innerHTML = `
      <div class="floating-confirm-content">
        <h3>Copia de Seguridad Creada</h3>
        <p>Se ha creado una copia de seguridad exitosamente.</p>
        <div class="confirm-buttons">
          <button onclick="this.closest('.floating-confirm').remove()" class="confirm-btn">Aceptar</button>
        </div>
      </div>
    `;
    document.body.appendChild(successDiv);
  }

  function restoreBackup(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const backupData = JSON.parse(e.target.result);
          
          // Restore each item
          if (backupData.orders) localStorage.setItem('orders', JSON.stringify(backupData.orders));
          if (backupData.inventory) localStorage.setItem('inventory', JSON.stringify(backupData.inventory));
          if (backupData.archivedOrders) localStorage.setItem('archivedOrders', JSON.stringify(backupData.archivedOrders));
          if (backupData.currentBalance) localStorage.setItem('currentBalance', backupData.currentBalance);
          if (backupData.totalWithdrawals) localStorage.setItem('totalWithdrawals', backupData.totalWithdrawals);
          if (backupData.invoiceTemplate) localStorage.setItem('invoiceTemplate', backupData.invoiceTemplate);

          // Reload the page to apply changes
          location.reload();
        } catch (error) {
          alert('Error al restaurar la copia de seguridad. Archivo inválido.');
        }
      };
      reader.readAsText(file);
    }
  }

  const restoreBtn = document.createElement('button');
  restoreBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i>';
  restoreBtn.className = 'backup-btn';
  restoreBtn.title = 'Restaurar copia de seguridad';
  restoreBtn.style.marginLeft = '10px';
  
  restoreBtn.addEventListener('click', () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.addEventListener('change', restoreBackup);
    fileInput.click();
  });

  document.querySelector('.backup-container').appendChild(restoreBtn);

  // Add inventory search functionality
  const inventorySearch = document.getElementById('inventorySearch');
  inventorySearch.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const inventoryItems = document.querySelectorAll('.inventory-item');
    
    inventoryItems.forEach(item => {
      const productName = item.querySelector('h3').textContent.toLowerCase();
      if (productName.includes(searchTerm)) {
        item.style.display = '';
      } else {
        item.style.display = 'none';
      }
    });
  });

  // Add orders search functionality
  const orderIdSearch = document.getElementById('orderIdSearch');
  const orderNameSearch = document.getElementById('orderNameSearch');

  function searchOrders() {
    const idSearchTerm = orderIdSearch.value.toLowerCase();
    const nameSearchTerm = orderNameSearch.value.toLowerCase();
    const orderCards = document.querySelectorAll('.order-card');

    orderCards.forEach(card => {
      const orderId = card.querySelector('.order-id').textContent.toLowerCase();
      const customerName = card.querySelector('.order-details p:first-child').textContent.toLowerCase();
      
      const matchesId = orderId.includes(idSearchTerm);
      const matchesName = customerName.includes(nameSearchTerm);

      if ((idSearchTerm === '' || matchesId) && (nameSearchTerm === '' || matchesName)) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    });
  }

  orderIdSearch.addEventListener('input', searchOrders);
  orderNameSearch.addEventListener('input', searchOrders);
});