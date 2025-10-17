# Auth-Gated App Testing Playbook

## Step 1: Create Test User & Session

Use MongoDB to create a test user with proper credentials:

```bash
mongosh --eval "
use('hospital_inventory_db');
var userId = 'test-user-' + Date.now();
var email = 'test.user.' + Date.now() + '@example.com';

db.users.insertOne({
  id: userId,
  email: email,
  name: 'Test Staff User',
  password_hash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIeWz6zY3e',
  role: 'staff',
  picture: 'https://via.placeholder.com/150',
  created_at: new Date().toISOString()
});

print('Test user created:');
print('Email: ' + email);
print('Password: testpassword123');
print('User ID: ' + userId);
"
```

## Step 2: Test Backend API

Test authentication and protected endpoints:

```bash
# Test login
curl -X POST "https://your-app.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "YOUR_EMAIL", "password": "testpassword123"}'

# Test protected endpoint with token
curl -X GET "https://your-app.com/api/auth/me" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test inventory endpoint
curl -X GET "https://your-app.com/api/inventory" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Step 3: Browser Testing

Test authentication flow in browser:

```javascript
// Login and store token
await page.goto("https://your-app.com/login");
await page.fill('[data-testid="email-input"]', 'test@example.com');
await page.fill('[data-testid="password-input"]', 'testpassword123');
await page.click('[data-testid="login-button"]');

// Verify redirect to dashboard
await page.waitForURL('**/dashboard');
```

## Success Indicators

✅ Login returns valid JWT token
✅ /api/auth/me returns user data
✅ Dashboard loads without redirect
✅ Protected routes accessible with token
✅ Inventory and batch data loads correctly

## Failure Indicators

❌ "User not found" errors
❌ 401 Unauthorized responses  
❌ Token validation failures
❌ Redirect to login page when authenticated