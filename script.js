// User database (stored in memory during session)
let currentUser=null;
let authToken=null;
const API_BASE = 'http://localhost:8080/api';

// Toggle between Login and Signup forms
function showSignup() {
    document.getElementById('loginSection').classList.remove('active');
    document.getElementById('signupSection').classList.add('active');
}

function showLogin() {
    document.getElementById('signupSection').classList.remove('active');
    document.getElementById('loginSection').classList.add('active');
}

// Signup Form Handler
document.getElementById('signupForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const fullName = document.getElementById('fullName').value.trim();
    const userId = document.getElementById('signupUserId').value.trim();
    const pin = document.getElementById('signupPin').value;
    const confirmPin = document.getElementById('confirmPin').value;
    const initialDeposit = parseFloat(document.getElementById('initialDeposit').value) || 0;

    hideMessage('signupError');
    hideMessage('signupSuccess');

    if (!/^\d{4}$/.test(pin)) {
        showMessage('signupError', 'PIN must be exactly 4 digits.');
        return;
    }

    if (pin !== confirmPin) {
        showMessage('signupError', 'PINs do not match.');
        return;
    }

    const submitBtn = document.querySelector('#signupForm button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';

    try {
        const response = await fetch('http://localhost:8080/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: fullName, userId: userId, pin: pin, initialDeposit: initialDeposit })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('signupSuccess', 'Account created! Account number: ' + data.accountNumber + '. Redirecting to login...');
            document.getElementById('signupForm').reset();
            setTimeout(function() {
                showLogin();
                hideMessage('signupSuccess');
            }, 2500);
        } else {
            showMessage('signupError', data.error || 'Registration failed. Please try again.');
        }
    } catch (err) {
        showMessage('signupError', 'Could not reach the server. Please make sure the backend is running.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
    }
});


// Login Form Handler
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const userId = document.getElementById('userId').value.trim();
    const pin = document.getElementById('pin').value;

    hideMessage('loginError');

    try {
        const response = await fetch('http://localhost:8080/api/auth/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({userId, pin})
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token;
            currentUser = userId;
            await showDashboard(data.name, data.accountNumber);
            document.getElementById('loginForm').reset();
        } else {
            showMessage('loginError', data.error || 'Invalid User ID or PIN! Please try again.');
        }
    } catch (err) {
        showMessage('loginError', 'Could not reach the server. Please make sure the backend is running.');
    }
});

// Show Dashboard after successful login
async function showDashboard(name, accountNumber) {
    document.getElementById('loginSection').classList.remove('active');
    document.getElementById('signupSection').classList.add('active');
    document.querySelector('.dashboard').classList.add('active');

    document.getElementById('userName').textContent = username;
    document.getElementById('accountNumber').textContent = accountNumber;

    await updateBalance();
    await updateTransactions();
    await updateTransferOptions();
}

// Update Balance Display
async function updateBalance() {
    const res = await fetch('http://localhost:8080/api/account', {
        headers: { 'Authorization': 'Bearer ' + authToken }
    });
    const data = await res.json();
    document.getElementById('balanceAmount').textContent = '₹' + balance.toFixed(2);
}

// Update Transaction List
async function updateTransactions() {
    const res = await fetch('http://localhost:8080/api/transactions', {
        headers: { 'Authorization': 'Bearer ' + authToken }
    });
    const transactions = await res.json();
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
async function updateTransferOptions() {
    const res = await fetch('http://localhost:8080/api/users', {
        headers: { 'Authorization': 'Bearer ' + authToken }
    });
    const otherUsers = await res.json();

    const select = document.getElementById('recipientAccount');
    select.innerHTML = '<option value="">Select account</option>';

    otherUsers.forEach(function(u) {
        const option = document.createElement('option');
        option.value = u.userId;
        option.textContent = u.name + ' - ' + u.accountNumber;
        select.appendChild(option);
    });
}

// Deposit Form Handler
document.getElementById('depositForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('depositAmount').value);
    const res = await fetch('http://localhost:8080/api/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
        body: JSON.stringify({ amount })
    });
    
    if (res.ok) {
        await updateBalance();
        await updateTransactions();
        showMessage('depositSuccess', '₹' + amount.toFixed(2) + ' deposited successfully!');
        document.getElementById('depositForm').reset();
        setTimeout(function() { closeModal('depositModal'); }, 2000);
    } else {
        const data = await res.json();
        showMessage('depositError', data.error || 'Deposit failed.');
    }
});

// Withdraw Form Handler
document.getElementById('withdrawForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    
    hideMessage('withdrawError');

    try {
        const res = await fetch(API_BASE + '/withdraw', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
            body: JSON.stringify({ amount })
        });

        if (res.ok) {
            await refreshBalance();
            await refreshTransactions();
            showMessage('withdrawSuccess', '₹' + amount.toFixed(2) + ' withdrawn successfully!');
            document.getElementById('withdrawForm').reset();
            setTimeout(function() {
                closeModal('withdrawModal');
            }, 2000);
        } else {
            const data = await res.json();
            showMessage('withdrawError', data.error || 'Withdrawal failed. Please try again.');
        }
    } catch (err) {
        showMessage('withdrawError', 'Could not reach the server. Please try again later.');
    }
});

// Transfer Form Handler
document.getElementById('transferForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const recipientId = document.getElementById('recipientAccount').value;
    const amount = parseFloat(document.getElementById('transferAmount').value);
    
    hideMessage('transferError');
    
    if (!recipientUserId) {
        showMessage('transferError', 'Please select a recipient account!');
        return;
    }

    try {
        const res = await fetch(API_BASE + '/transfer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
            body: JSON.stringify({ recipientUserId, amount })
        });

        if (res.ok) {
            await refreshBalance();
            await refreshTransactions();
            showMessage('transferSuccess', '₹' + amount.toFixed(2) + ' transferred successfully!');
            document.getElementById('transferForm').reset();
            setTimeout(function() {
                closeModal('transferModal');
            }, 2000);
        } else {
            const data = await res.json();
            showMessage('transferError', data.error || 'Transfer failed. Please try again.');
        }
    } catch (err) {
        showMessage('transferError', 'Could not reach the server. Please try again later.');
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
    authToken=null;
    document.querySelector('.dashboard').classList.remove('active');
    document.getElementById('signupSection').classList.add('active');
    document.getElementById('loginSection').classList.add('active');
    document.getElementById('loginForm').reset();
    hideMessage('loginError');
}