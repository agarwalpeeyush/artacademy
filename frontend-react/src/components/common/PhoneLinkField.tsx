import React, { useState } from 'react';
import {
  Box, TextField, Typography, Chip, List, ListItemButton, ListItemText,
  Paper, CircularProgress, Link,
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import userService, { PersonLookupResult } from '../../services/userService';

interface PhoneLinkFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** The currently-linked Person id, if the provisioner has chosen to link. */
  linkedPersonId?: string;
  /** Set/clear the linked Person id. Passing undefined clears the link. */
  onLinkChange: (personId: string | undefined) => void;
  disabled?: boolean;
}

/**
 * Confirm-and-link (OQ1): on blur, looks up existing Persons sharing this phone
 * and offers them as candidates to link. Linking is always an explicit choice —
 * we never auto-merge. When linked, the phone field locks to the candidate's
 * number and shows a chip; unlinking restores free editing.
 */
const PhoneLinkField: React.FC<PhoneLinkFieldProps> = ({
  label, value, onChange, linkedPersonId, onLinkChange, disabled,
}) => {
  const [candidates, setCandidates] = useState<PersonLookupResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const linked = candidates.find(c => c.personId === linkedPersonId);

  const runLookup = async () => {
    const phone = value.trim();
    if (!phone || linkedPersonId) return;
    setLoading(true);
    try {
      const results = await userService.lookupByPhone(phone);
      setCandidates(results);
      setDismissed(false);
    } catch {
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLink = (c: PersonLookupResult) => {
    onLinkChange(c.personId);
    onChange(c.phoneNumber || value);
    setCandidates([c]); // keep the linked candidate so we can render its details
  };

  const handleUnlink = () => {
    onLinkChange(undefined);
    setCandidates([]);
    setDismissed(true);
  };

  if (linkedPersonId && linked) {
    return (
      <Box>
        <TextField label={label} value={value} fullWidth size="small" disabled />
        <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            icon={<LinkIcon />}
            color="success"
            size="small"
            label={`Linked: ${linked.firstName} ${linked.lastName}${linked.roles.length ? ` (${linked.roles.join(', ')})` : ''}`}
          />
          <Link component="button" type="button" variant="caption" onClick={handleUnlink}
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
            <LinkOffIcon fontSize="inherit" /> Unlink
          </Link>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <TextField
        label={label}
        value={value}
        onChange={(e) => { onChange(e.target.value); setDismissed(false); }}
        onBlur={runLookup}
        fullWidth
        size="small"
        disabled={disabled}
        InputProps={{
          endAdornment: loading ? <CircularProgress size={16} /> : undefined,
        }}
      />
      {!dismissed && candidates.length > 0 && (
        <Paper variant="outlined" sx={{ mt: 0.5, p: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            {candidates.length} existing {candidates.length === 1 ? 'person' : 'people'} share this phone.
            Link to reuse the same login instead of creating a duplicate.
          </Typography>
          <List dense disablePadding>
            {candidates.map(c => (
              <ListItemButton key={c.personId} onClick={() => handleLink(c)} sx={{ borderRadius: 1 }}>
                <ListItemText
                  primary={`${c.firstName} ${c.lastName}`}
                  secondary={`${c.loginId}${c.roles.length ? ` · ${c.roles.join(', ')}` : ''}`}
                />
                <LinkIcon fontSize="small" color="action" />
              </ListItemButton>
            ))}
          </List>
          <Link component="button" type="button" variant="caption" onClick={() => setDismissed(true)}>
            Keep as a new person
          </Link>
        </Paper>
      )}
    </Box>
  );
};

export default PhoneLinkField;
