// Account status error handling utilities
export const AccountErrorTypes = {
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  THERAPIST_DISABLED: 'THERAPIST_DISABLED',
  THERAPIST_INACTIVE: 'THERAPIST_INACTIVE',
  DRIVER_DISABLED: 'DRIVER_DISABLED',
  DRIVER_INACTIVE: 'DRIVER_INACTIVE',
  OPERATOR_DISABLED: 'OPERATOR_DISABLED',
  OPERATOR_INACTIVE: 'OPERATOR_INACTIVE',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED'
};

export const isDisabledAccountError = (error) => {
  if (!error) return false;
  
  const errorMessage = error.message || error.response?.data?.error || '';
  const errorCode = error.response?.data?.error;
  
  // Check for specific error codes
  if (Object.values(AccountErrorTypes).includes(errorCode)) {
    return true;
  }
  
  // Check for disabled/inactive keywords in message
  const disabledKeywords = ['disabled', 'inactive', 'suspended', 'locked', 'deactivated'];
  return disabledKeywords.some(keyword => 
    errorMessage.toLowerCase().includes(keyword)
  );
};

export const getAccountTypeFromError = (error) => {
  if (!error) return 'account';
  
  const errorMessage = (error.message || error.response?.data?.error || '').toLowerCase();
  const errorCode = error.response?.data?.error;
  
  // Check error code first
  if (errorCode?.includes('THERAPIST')) return 'therapist';
  if (errorCode?.includes('DRIVER')) return 'driver';
  if (errorCode?.includes('OPERATOR')) return 'operator';
  
  // Check error message
  if (errorMessage.includes('therapist')) return 'therapist';
  if (errorMessage.includes('driver')) return 'driver';
  if (errorMessage.includes('operator')) return 'operator';
  
  return 'account';
};

export const getDisabledAccountMessage = (error, accountType = 'account') => {
  if (!error) return 'Your account has been disabled.';
  
  const originalMessage = error.message || error.response?.data?.error || error.response?.data?.message;
  
  // If we already have a descriptive message, use it
  if (originalMessage && originalMessage.length > 20) {
    return originalMessage;
  }
  
  // Generate a user-friendly message based on account type
  const typeMessages = {
    therapist: 'Your therapist account is currently inactive. Please contact your supervisor for assistance.',
    driver: 'Your driver account is currently inactive. Please contact your supervisor for assistance.',
    operator: 'Your operator account is currently inactive. Please contact your administrator for assistance.',
    account: 'Your account has been disabled. Please contact support for assistance.'
  };
  
  return typeMessages[accountType] || typeMessages.account;
};

export const getContactInfo = (accountType = 'account') => {
  const contactMap = {
    therapist: {
      contact: 'your supervisor',
      email: 'supervisor@guitara.com',
      phone: '+1 (555) 123-4567'
    },
    driver: {
      contact: 'your supervisor',
      email: 'supervisor@guitara.com',
      phone: '+1 (555) 123-4567'
    },
    operator: {
      contact: 'the administrator',
      email: 'admin@guitara.com',
      phone: '+1 (555) 987-6543'
    },
    account: {
      contact: 'support',
      email: 'support@guitara.com',
      phone: '+1 (555) 456-7890'
    }
  };
  
  return contactMap[accountType] || contactMap.account;
};

export const handleAuthError = (error) => {
  const isDisabled = isDisabledAccountError(error);
  const accountType = getAccountTypeFromError(error);
  const message = getDisabledAccountMessage(error, accountType);
  const contactInfo = getContactInfo(accountType);
  
  return {
    isDisabled,
    accountType,
    message,
    contactInfo,
    originalError: error
  };
};
