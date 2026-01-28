// User database (stored in memory during session)
let users = {
    'john123': {
        pin: '1234',
        name: 'John Doe',
        accountNumber: '1234567890',
        balance: 50000,
        transactions: []
    },
    'jane456': {
        pin: '5678',
        name: 'Jane Smith',
        accountNumber: '0987654321',
        balance: 75000,
        transactions: []
    }
};

let currentUser = null;

// Login Form Handler
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const userId = document.getElementById('userId').value;
    const pin = document.getElementById('pin').value;

    if (users[userId] && users[userId].pin === pin) {
        currentUser = userId;
        showDashboard();
        document.getElementById('loginForm').reset();
        hideMessage('loginError');
    } else {
        showMessage('loginError', 'Invalid User ID or PIN! Please try again.');
    }
});

// Show Dashboard after successful login
function showDashboard() {
    document.querySelector('.login-form').classList.remove('active');
    document.querySelector('.dashboard').classList.add('active');
    
    const user = users[currentUser];
    document.getElementById('userName').textContent = user.name;
    document.getElementById('accountNumber').textContent = user.accountNumber;
    updateBalance();
    updateTransactions();
    updateTransferOptions();
}

// Update Balance Display
function updateBalance() {
    const balance = users[currentUser].balance;
    document.getElementById('balanceAmount').textContent = '₹' + balance.toFixed(2);
}

// Update Transaction List
function updateTransactions() {
    const transactions = users[currentUser].transactions;
    const list = document.getElementById('transactionsList');
    
    if (transactions.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No transactions yet</p>';
        return;
    }

    list.innerHTML = '';
    // Show transactions in reverse order (newest first)
    transactions.slice().reverse().forEach(function(t) {
        const item = document.createElement('div');
        item.className = 'transaction-item';
        
        const info = document.createElement('div');
        info.className = 'transaction-info';
        info.innerHTML = '<h4>' + t.type + '</h4><p>' + t.date + '</p>';
        
        const amount = document.createElement('div');
        amount.className = 'transaction-amount ' + (t.type === 'Deposit' || t.type === 'Received' ? 'credit' : 'debit');
        amount.textContent = (t.type === 'Deposit' || t.type === 'Received' ? '+' : '-') + '₹' + t.amount.toFixed(2);
        
        item.appendChild(info);
        item.appendChild(amount);
        list.appendChild(item);
    });
}

// Update Transfer Recipient Options
function updateTransferOptions() {
    const select = document.getElementById('recipientAccount');
    select.innerHTML = '<option value="">Select account</option>';
    
    for (let userId in users) {
        if (userId !== currentUser) {
            const user = users[userId];
            const option = document.createElement('option');
            option.value = userId;
            option.textContent = user.name + ' - ' + user.accountNumber;
            select.appendChild(option);
        }
    }
}

// Deposit Form Handler
document.getElementById('depositForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('depositAmount').value);
    
    if (amount > 0) {
        users[currentUser].balance += amount;
        users[currentUser].transactions.push({
            type: 'Deposit',
            amount: amount,
            date: new Date().toLocaleString()
        });
        
        updateBalance();
        updateTransactions();
        showMessage('depositSuccess', '₹' + amount.toFixed(2) + ' deposited successfully!');
        document.getElementById('depositForm').reset();
        
        setTimeout(function() {
            closeModal('depositModal');
        }, 2000);
    }
});

// Withdraw Form Handler
document.getElementById('withdrawForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    
    hideMessage('withdrawError');
    
    if (amount > 0 && amount <= users[currentUser].balance) {
        users[currentUser].balance -= amount;
        users[currentUser].transactions.push({
            type: 'Withdrawal',
            amount: amount,
            date: new Date().toLocaleString()
        });
        
        updateBalance();
        updateTransactions();
        showMessage('withdrawSuccess', '₹' + amount.toFixed(2) + ' withdrawn successfully!');
        document.getElementById('withdrawForm').reset();
        
        setTimeout(function() {
            closeModal('withdrawModal');
        }, 2000);
    } else if (amount > users[currentUser].balance) {
        showMessage('withdrawError', 'Insufficient balance! Available balance: ₹' + users[currentUser].balance.toFixed(2));
    }
});

// Transfer Form Handler
document.getElementById('transferForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const recipientId = document.getElementById('recipientAccount').value;
    const amount = parseFloat(document.getElementById('transferAmount').value);
    
    hideMessage('transferError');
    
    if (!recipientId) {
        showMessage('transferError', 'Please select a recipient account!');
        return;
    }
    
    if (amount > 0 && amount <= users[currentUser].balance) {
        // Deduct from sender
        users[currentUser].balance -= amount;
        users[currentUser].transactions.push({
            type: 'Transfer to ' + users[recipientId].name,
            amount: amount,
            date: new Date().toLocaleString()
        });
        
        // Add to recipient
        users[recipientId].balance += amount;
        users[recipientId].transactions.push({
            type: 'Received from ' + users[currentUser].name,
            amount: amount,
            date: new Date().toLocaleString()
        });
        
        updateBalance();
        updateTransactions();
        showMessage('transferSuccess', '₹' + amount.toFixed(2) + ' transferred successfully to ' + users[recipientId].name + '!');
        document.getElementById('transferForm').reset();
        
        setTimeout(function() {
            closeModal('transferModal');
        }, 2000);
    } else if (amount > users[currentUser].balance) {
        showMessage('transferError', 'Insufficient balance! Available balance: ₹' + users[currentUser].balance.toFixed(2));
    }
});

// Open Modal
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    // Hide all messages when opening modal
    const modal = document.getElementById(modalId);
    const messages = modal.querySelectorAll('.success-msg, .error-msg');
    messages.forEach(function(msg) {
        msg.classList.remove('active');
    });
}

// Close Modal
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    // Reset forms
    const modal = document.getElementById(modalId);
    const forms = modal.querySelectorAll('form');
    forms.forEach(function(form) {
        form.reset();
    });
    // Hide all messages
    const messages = modal.querySelectorAll('.success-msg, .error-msg');
    messages.forEach(function(msg) {
        msg.classList.remove('active');
    });
}

// Show Message
function showMessage(elementId, message) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.classList.add('active');
}

// Hide Message
function hideMessage(elementId) {
    const element = document.getElementById(elementId);
    element.classList.remove('active');
}

// Logout Function
function logout() {
    currentUser = null;
    document.querySelector('.dashboard').classList.remove('active');
    document.querySelector('.login-form').classList.add('active');
    document.getElementById('loginForm').reset();
    hideMessage('loginError');
}