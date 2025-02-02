// Month selector
const monthSelector = document.createElement('select');
monthSelector.id = 'transactionMonthSelect';
monthSelector.className = 'transaction-month-select';

// Year selector
const yearSelector = document.createElement('select');
yearSelector.id = 'transactionYearSelect';
yearSelector.className = 'transaction-month-select';

// Get current month and year
const today = new Date();
const currentMonth = today.getMonth();
const currentYear = today.getFullYear();

// Generate month options
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

// Generate year options up to 2030
for (let year = currentYear; year <= 2030; year++) {
  const option = document.createElement('option');
  option.value = year;
  option.textContent = year;
  yearSelector.appendChild(option);
}

// Set default to current month and year
monthSelector.value = currentMonth + 1;
yearSelector.value = currentYear;

// Create a container for selectors
const filterContainer = document.createElement('div');
filterContainer.style.display = 'flex';
filterContainer.style.gap = '10px';
filterContainer.appendChild(monthSelector);
filterContainer.appendChild(yearSelector);

// Find the transactions header
const transactionsHeader = document.querySelector('.transactions-header');

// Add filter container before print button
const printTransactionsBtn = document.createElement('button');
printTransactionsBtn.className = 'add-transaction-btn';
printTransactionsBtn.style.background = 'var(--blue-color)';
printTransactionsBtn.style.color = 'white';
printTransactionsBtn.style.marginLeft = '10px';
printTransactionsBtn.textContent = 'Imprimir Transacciones';
printTransactionsBtn.addEventListener('click', printTransactions);

transactionsHeader.insertBefore(filterContainer, transactionsHeader.children[0]);
transactionsHeader.appendChild(printTransactionsBtn);

// Update print transactions function to use both month and year
function printTransactions() {
  const selectedMonth = parseInt(monthSelector.value);
  const selectedYear = parseInt(yearSelector.value);
  
  // Get all transactions from the table
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

// Add event listeners to filter transactions in real-time
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

function updateTotalProductsCount() {
  const totalProducts = inventory.reduce((sum, product) => sum + (product.quantity || 0), 0);
  const totalProductsElement = document.getElementById('totalProducts');
  
  if (totalProductsElement) {
    totalProductsElement.textContent = totalProducts;
  }
}

function updateTotalInvested() {
  // Get the total invested from localStorage, ensuring it's not reduced
  let totalInvested = parseFloat(localStorage.getItem('totalInvested') || '0');

  // Ensure total invested is calculated and stored correctly when first adding products
  inventory.forEach(product => {
    const productKey = `product_investment_${product.id}`;
    let originalInvestment = parseFloat(localStorage.getItem(productKey) || '0');
    
    // If no previous investment is recorded, calculate and store it
    if (originalInvestment === 0) {
      originalInvestment = product.buyPrice * product.quantity;
      localStorage.setItem(productKey, originalInvestment.toString());
      
      // Update total invested only when first adding a product
      totalInvested += originalInvestment;
      localStorage.setItem('totalInvested', totalInvested.toString());
    }
  });
  
  // Always display the stored total invested amount
  document.getElementById('totalInvested').textContent = `$${totalInvested.toFixed(2)}`;
}

function finishAddingProduct(newProduct) {
  inventory.push(newProduct);
  
  // Track original investment for the new product
  const productKey = `product_investment_${newProduct.id}`;
  const originalInvestment = newProduct.buyPrice * newProduct.quantity;
  
  // Only store if not already stored
  if (!localStorage.getItem(productKey)) {
    localStorage.setItem(productKey, originalInvestment.toString());
    
    // Update total invested in localStorage
    const currentTotalInvested = parseFloat(localStorage.getItem('totalInvested') || '0');
    const newTotalInvested = currentTotalInvested + originalInvestment;
    localStorage.setItem('totalInvested', newTotalInvested.toString());
  }
  
  addInventoryItem(newProduct);
  inventoryForm.reset();
  updateTotalProductsCount();
  updateTotalInvested();
  document.getElementById('inventoryModal').style.display = 'none';
  saveData();
}

window.deleteProduct = (id) => {
  const index = inventory.findIndex(p => p.id === id);
  if (index > -1) {
    const product = inventory[index];
    const productKey = `product_investment_${product.id}`;
    
    // Remove the product from inventory
    inventory.splice(index, 1);
    
    // Do NOT remove the investment amount from total invested
    updateInventoryGrid();
    updateTotalProductsCount();
    saveData();
    document.querySelector('.floating-confirm')?.remove();
  }
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
        // Preserve the original investment amount
        const productKey = `product_investment_${product.id}`;
        
        inventory[index] = updatedProduct;
        updateInventoryGrid();
        updateTotalProductsCount();
        document.getElementById('editModal').style.display = 'none';
        saveData();
      }
    };
  }
};

window.clearInvestedMoney = () => {
  // Clear all stored product investments
  inventory.forEach(product => {
    const productKey = `product_investment_${product.id}`;
    localStorage.removeItem(productKey);
  });
  
  // Reset total invested to zero
  localStorage.setItem('totalInvested', '0');
  updateTotalInvested();
  saveData();
  document.querySelector('.floating-confirm')?.remove();
};

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
    saveData();
  }
};

function addInventoryItem(product) {
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
};