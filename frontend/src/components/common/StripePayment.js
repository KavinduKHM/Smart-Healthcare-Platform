// src/components/common/StripePayment.js
import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { APPOINTMENT_API } from '../../services/api';

const stripePublicKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;

const PaymentForm = ({ appointmentId, amount, clientSecret, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!clientSecret) {
      const msg = 'Payment is not initialized (missing client secret). Please book the appointment first.';
      setError(msg);
      if (onError) onError(msg);
      return;
    }

    if (!stripe || !elements) return;

    setProcessing(true);
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement),
      }
    });

    if (result.error) {
      setError(result.error.message);
      if (onError) onError(result.error.message);
    } else {
      if (result.paymentIntent.status === 'succeeded') {
        // Confirm payment with your backend
        try {
          // Using APPOINTMENT_API ensures the Authorization header is sent
          await APPOINTMENT_API.post(`/${appointmentId}/confirm-payment`, {
            paymentIntentId: result.paymentIntent.id,
            transactionId: result.paymentIntent.id
          });
          if (onSuccess) onSuccess(result.paymentIntent);
        } catch (err) {
          console.error(err);
          const status = err?.response?.status;
          const backendMessage = err?.response?.data?.message || err?.response?.data?.error;
          const fallback = err?.message || 'Payment confirmed but backend update failed';
          setError(
            backendMessage
              ? `Payment confirmed but backend update failed (${status}): ${backendMessage}`
              : (status ? `Payment confirmed but backend update failed (${status}): ${fallback}` : fallback)
          );
        }
      }
    }
    setProcessing(false);
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': { color: '#aab7c4' },
      },
      invalid: { color: '#9e2146' },
    },
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardElement options={cardElementOptions} />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button type="submit" disabled={!stripe || processing || !clientSecret} style={{ marginTop: '1rem' }}>
        {processing ? 'Processing...' : `Pay ${amount}`}
      </button>
    </form>
  );
};

const StripePayment = ({ appointmentId, amount, clientSecret, onSuccess, onError }) => {
  const [stripeClient, setStripeClient] = React.useState(null);
  const [stripeLoadError, setStripeLoadError] = React.useState('');

  React.useEffect(() => {
    let mounted = true;
    if (!stripePublicKey) {
      setStripeLoadError('Stripe publishable key is missing. Set REACT_APP_STRIPE_PUBLISHABLE_KEY in frontend/.env and restart the dev server.');
      return () => { mounted = false; };
    }

    // loadStripe injects the remote Stripe.js script. Catch failures to avoid
    // an uncaught promise rejection (network/proxy/extension can block it).
    loadStripe(stripePublicKey)
      .then((client) => {
        if (!mounted) return;
        if (!client) {
          setStripeLoadError('Failed to initialize Stripe client.');
        } else {
          setStripeClient(client);
        }
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[Stripe] loadStripe failed:', err);
        if (!mounted) return;
        setStripeLoadError('Failed to load Stripe.js. Check network, adblockers, or firewall settings.');
      });

    return () => { mounted = false; };
  }, []);

  if (stripeLoadError) {
    return <p style={{ color: 'red' }}>{stripeLoadError}</p>;
  }

  if (!clientSecret) {
    return (
      <p style={{ color: 'red' }}>
        Payment is not initialized yet. Book the appointment to get a client secret.
      </p>
    );
  }

  if (!stripeClient) {
    return <p>Loading payment form…</p>;
  }

  return (
    <Elements stripe={stripeClient}>
      <PaymentForm
        appointmentId={appointmentId}
        amount={amount}
        clientSecret={clientSecret}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
};

export default StripePayment;