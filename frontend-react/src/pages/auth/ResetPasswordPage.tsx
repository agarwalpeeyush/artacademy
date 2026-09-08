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
  InputAdornment,
  IconButton,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import PaletteIcon from '@mui/icons-material/Palette';
import { useNavigate, useSearchParams } from 'react-router-dom';
import authService from '../../services/authService';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState(searchParams.get('token') ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authService.resetPassword(token.trim(), newPassword);
      setSuccess(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Invalid or expired token. Please request a new reset.';
      setError(msg);
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
              Reset Password
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5} textAlign="center">
              Enter the token from your email and choose a new password
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {success ? (
            <>
              <Alert severity="success" sx={{ mb: 2 }}>
                Password reset successful! You can now sign in with your new password.
              </Alert>
              <Button fullWidth variant="contained" onClick={() => navigate('/login')} sx={{ mt: 1 }}>
                Go to Sign In
              </Button>
            </>
          ) : (
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <TextField
                label="Reset Token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                fullWidth
                margin="normal"
                required
                disabled={loading}
                placeholder="Paste the token from your email"
              />
              <TextField
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                fullWidth
                margin="normal"
                required
                disabled={loading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Confirm Password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                disabled={loading || !token.trim() || !newPassword || !confirmPassword}
                sx={{ mt: 3, mb: 2, py: 1.5, fontSize: 16, fontWeight: 600 }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Reset Password'}
              </Button>
            </Box>
          )}

          {!success && (
            <Box textAlign="center">
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate('/forgot-password')}
                underline="hover"
              >
                Request a new token
              </Link>
              {' · '}
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate('/login')}
                underline="hover"
              >
                Back to Sign In
              </Link>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ResetPasswordPage;
