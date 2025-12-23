const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginLink = document.getElementById('loginLink');
const registerLink = document.getElementById('registerLink');
const errorMessage = document.getElementById('errorMessage');

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
}

function hideError() {
  errorMessage.style.display = 'none';
}

loginLink?.addEventListener('click', (e) => {
  e.preventDefault();
  loginForm.style.display = 'block';
  registerForm.style.display = 'none';
  hideError();
});

registerLink?.addEventListener('click', (e) => {
  e.preventDefault();
  loginForm.style.display = 'none';
  registerForm.style.display = 'block';
  hideError();
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();
  
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      showError(data.error || 'Login failed');
      return;
    }
    
    window.location.href = '/admin';
  } catch (error) {
    showError('Network error. Please try again.');
  }
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();
  
  const username = document.getElementById('regUsername').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, email: email || null, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      showError(data.error || 'Registration failed');
      return;
    }
    
    window.location.href = '/admin';
  } catch (error) {
    showError('Network error. Please try again.');
  }
});
