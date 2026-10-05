import { Link } from 'react-router-dom';

// Friendly, on-brand error panel for every API failure mode.
// status: 401 -> login nudge | 502/503 -> temporarily unavailable |
// 0 -> network down | otherwise the server's own message.
export default function ErrorState({ status, message, onRetry, compact = false }) {
  let title = 'Something went wrong';
  let body = message || 'Please try again in a moment.';
  let action = null;

  if (status === 401) {
    title = 'Please log in first';
    body = 'This part of MediCheck needs your account. It only takes a minute.';
    action = (
      <Link to="/login" className="mc-btn">
        Log in
      </Link>
    );
  } else if (status === 502 || status === 503) {
    title = 'Temporarily unavailable';
    body = message || 'This service is having a moment. Your data is safe — please try again shortly.';
    action = onRetry ? (
      <button type="button" onClick={onRetry} className="mc-btn">
        Try again
      </button>
    ) : null;
  } else if (status === 0) {
    title = 'Cannot reach the server';
    body = 'Check your internet connection and try again.';
    action = onRetry ? (
      <button type="button" onClick={onRetry} className="mc-btn">
        Retry
      </button>
    ) : null;
  } else if (onRetry) {
    action = (
      <button type="button" onClick={onRetry} className="mc-btn">
        Try again
      </button>
    );
  }

  return (
    <div className={`text-center ${compact ? 'py-8' : 'py-14'} px-6`}>
      <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-sand flex items-center justify-center">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B07818" strokeWidth="2.2" strokeLinecap="round">
          <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
        </svg>
      </div>
      <h3 className="font-serif text-xl font-bold mb-2">{title}</h3>
      <p className="text-sm text-muted max-w-sm mx-auto mb-5 leading-relaxed">{body}</p>
      {action}
    </div>
  );
}
