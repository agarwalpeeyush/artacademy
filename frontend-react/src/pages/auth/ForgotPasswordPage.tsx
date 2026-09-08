import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Link,
} from '@mui/material';
import PaletteIcon from '@mui/icons-material/Palette';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/authService';

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await authService.forgotPassword(email.trim());
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 50%, #1565C0 100%)',
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 420, width: '100%', borderRadius: 3, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <CardContent sx={{ p: 4 }}>
          <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
              }}
            >
              <PaletteIcon sx={{ color: 'white', fontSize: 36 }} />
            </Box>
            <Typography variant="h5" fontWeight={700} color="primary.main">
              Forgot Password
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5} textAlign="center">
              Enter your email and we'll send you a reset token
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {submitted ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              If your email is registered, a reset token has been sent. Check your inbox.
            </Alert>
          ) : (
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <TextField
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                margin="normal"
                required
                disabled={loading}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading || !email.trim()}
                sx={{ mt: 3, mb: 2, py: 1.5, fontSize: 16, fontWeight: 600 }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Send Reset Token'}
              </Button>
            </Box>
          )}

          <Box textAlign="center">
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate('/login')}
              underline="hover"
            >
              Back to Sign In
            </Link>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ForgotPasswordPage;
