// Token verification and fixing utility
import { login } from '../features/auth/authSlice';

export const checkAndFixToken = () => {
  const knoxToken = localStorage.getItem('knoxToken');
  const user = localStorage.getItem('user');
  
  console.log('=== Token Debug Info ===');
  console.log('Knox Token exists:', !!knoxToken);
  console.log('Knox Token length:', knoxToken?.length || 0);
  console.log('Knox Token preview:', knoxToken ? knoxToken.substring(0, 20) + '...' : 'null');
  console.log('User data exists:', !!user);
  
  if (user) {
    try {
      const parsedUser = JSON.parse(user);
      console.log('User data:', {
        id: parsedUser.id,
        username: parsedUser.username,
        role: parsedUser.role,
        email: parsedUser.email
      });
    } catch (e) {
      console.log('User data parse error:', e.message);
    }
  }
  
  return {
    hasToken: !!knoxToken,
    hasUser: !!user,
    tokenLength: knoxToken?.length || 0
  };
};

export const simulateLogin = (dispatch) => {
  // For testing purposes, let's create a mock token and user
  const mockToken = 'test_token_' + Date.now();
  const mockUser = {
    id: 1,
    username: 'testuser',
    role: 'operator',
    email: 'test@example.com'
  };
  
  console.log('=== Simulating Login ===');
  console.log('Setting mock token:', mockToken);
  console.log('Setting mock user:', mockUser);
  
  localStorage.setItem('knoxToken', mockToken);
  localStorage.setItem('user', JSON.stringify(mockUser));
  
  if (dispatch) {
    dispatch(login(mockUser));
  }
  
  return { token: mockToken, user: mockUser };
};

export const clearAuth = () => {
  console.log('=== Clearing Auth Data ===');
  localStorage.removeItem('knoxToken');
  localStorage.removeItem('user');
  console.log('Auth data cleared');
};

// Auto-run debug check when this module is imported
console.log('=== Auto Token Check ===');
checkAndFixToken();
