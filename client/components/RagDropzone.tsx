"use client";

import { useState, useCallback, ReactNode, useEffect } from 'react';
import { useDropzone, DropzoneOptions } from 'react-dropzone';
import { Box, Typography, CircularProgress, IconButton, Paper, List, ListItem, ListItemIcon, ListItemText, Snackbar, Alert, Button } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';

interface RequiredDropzoneOptions extends DropzoneOptions {
    onDrop?: (acceptedFiles: File[]) => void;
}

export default function RagDropzone({ onClose, userId }: { onClose?: () => void, userId: string }) {
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<{id: number, filename: string}[]>([]);
  const [notification, setNotification] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [clearing, setClearing] = useState(false);

  const fetchDocuments = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await axios.get(`/api/users/${userId}/documents`);
      setDocuments(res.data);
    } catch (err) {
      console.error("Failed to fetch documents", err);
    }
  }, [userId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    if (file.type !== 'application/pdf') {
      setNotification({ open: true, message: 'Only PDF files are allowed.', severity: 'error' });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post(`/api/users/${userId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await fetchDocuments();
      setNotification({ open: true, message: `${file.name} uploaded successfully!`, severity: 'success' });
    } catch (err: any) {
      console.error(err);
      setNotification({ open: true, message: `Failed to upload: ${err.message}`, severity: 'error' });
    } finally {
      setUploading(false);
    }
  }, [userId, fetchDocuments]);

  const handleClear = async () => {
    setClearing(true);
    try {
      await axios.delete(`/api/users/${userId}/documents`);
      setDocuments([]);
      setNotification({ open: true, message: 'Knowledge Base Cleared!', severity: 'success' });
    } catch (err: any) {
      setNotification({ open: true, message: 'Failed to clear KB.', severity: 'error' });
    } finally {
      setClearing(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1
  } as RequiredDropzoneOptions);

  return (
    <Box sx={{ width: { xs: '100%', md: 300 }, height: '100%', p: 2, display: 'flex', flexDirection: 'column', bgcolor: 'background.paper', borderLeft: { md: '1px solid' }, borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600}>
          Knowledge Base
        </Typography>
        {onClose && (
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      <Paper
        {...getRootProps()}
        variant="outlined"
        sx={{
          p: 3,
          textAlign: 'center',
          cursor: 'pointer',
          bgcolor: isDragActive ? 'action.hover' : 'surfaceContainer',
          borderColor: isDragActive ? 'primary.main' : 'divider',
          borderStyle: isDragActive ? 'solid' : 'dashed',
          borderRadius: 4,
          transition: 'all 0.2s ease',
          mb: 3,
          position: 'relative'
        }}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
            <CircularProgress size={32} sx={{ mb: 1.5 }} />
            <Typography variant="body2" color="text.secondary">Ingesting Document...</Typography>
          </Box>
        ) : (
          <Box sx={{ py: 1 }}>
            <CloudUploadIcon sx={{ fontSize: 40, color: isDragActive ? 'primary.main' : 'text.secondary', mb: 1 }} />
            <Typography variant="body2" color="text.primary" fontWeight={500}>
              {isDragActive ? "Drop PDF here" : "Drag & Drop PDF"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Limit 50MB
            </Typography>
          </Box>
        )}
      </Paper>

      {documents.length > 0 && (
        <Box sx={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, ml: 1 }}>
            <Typography variant="overline" color="text.secondary" fontWeight={600}>
              Uploaded Documents
            </Typography>
            <Button size="small" color="error" onClick={handleClear} disabled={clearing} startIcon={<DeleteIcon />}>
              Clear
            </Button>
          </Box>
          <List sx={{ pt: 0, flexGrow: 1 }}>
            {documents.map((doc) => (
              <ListItem key={doc.id} disablePadding sx={{ mb: 1 }}>
                <Paper variant="outlined" sx={{ width: '100%', p: 1, px: 1.5, borderRadius: 2, display: 'flex', alignItems: 'center', bgcolor: 'background.default' }}>
                  <InsertDriveFileIcon sx={{ color: 'error.light', mr: 1.5, fontSize: 20 }} />
                  <ListItemText 
                    primary={doc.filename} 
                    primaryTypographyProps={{ noWrap: true, variant: 'body2', fontWeight: 500 }} 
                  />
                  <CheckCircleIcon color="success" sx={{ fontSize: 16, ml: 1 }} />
                </Paper>
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      <Snackbar 
        open={notification.open} 
        autoHideDuration={4000} 
        onClose={() => setNotification({ ...notification, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setNotification({ ...notification, open: false })} severity={notification.severity} sx={{ width: '100%', borderRadius: 2 }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
