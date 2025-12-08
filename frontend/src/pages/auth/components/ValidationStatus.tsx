import { Check, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ValidationStatusProps {
  type: 'email' | 'username';
  status: {
    isValidFormat: boolean;
    isAvailable: boolean | null;
    errorMessage: string | null;
  };
  error?: string;
  showIcon?: boolean;
  showMessage?: boolean;
}

export const ValidationStatus = ({ type, status, error, showIcon = true, showMessage = true }: ValidationStatusProps) => {
  // Show validation icon
  const showValidIcon = status.isValidFormat && status.isAvailable === true;
  const showErrorIcon = status.isAvailable === false;

  if (!showIcon && !showMessage) {
    return null;
  }

  return (
    <>
      {/* Show green checkmark when valid and available */}
      {showIcon && showValidIcon && (
        <Check size={20} className={`${type}-status-icon valid-icon`} />
      )}
      {/* Show warning icon when taken */}
      {showIcon && showErrorIcon && (
        <AlertTriangle size={20} className={`${type}-status-icon error-icon`} />
      )}
      {/* Show error message when taken */}
      {showMessage && status.isAvailable === false && status.errorMessage && (
        <p className="error-message">
          {type === 'email' && status.errorMessage.includes('Google') ? (
            status.errorMessage
          ) : type === 'email' ? (
            <>
              Một tài khoản với địa chỉ email này đã tồn tại.{" "}
              <Link to="/signin" className="error-link">
                Đăng nhập
              </Link>
            </>
          ) : (
            status.errorMessage
          )}
        </p>
      )}
      {/* Show format error from Zod */}
      {showMessage && error && (
        <p className="error-message">{error}</p>
      )}
    </>
  );
};

