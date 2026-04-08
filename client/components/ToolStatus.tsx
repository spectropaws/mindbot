"use client";

import { useState } from 'react';
import { Box, Typography, Collapse, IconButton, Paper } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import TerminalIcon from '@mui/icons-material/Terminal';
import SearchIcon from '@mui/icons-material/Search';
import CalculateIcon from '@mui/icons-material/Calculate';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

export interface ToolStep {
  tool: string;
  input: string;
  output: string;
}

interface ToolStatusProps {
  steps: ToolStep[];
}

export default function ToolStatus({ steps }: ToolStatusProps) {
  const [open, setOpen] = useState(false);

  if (!steps || steps.length === 0) return null;

  const getToolIcon = (toolName: string) => {
    switch (toolName.toLowerCase()) {
      case 'python_repl': return <TerminalIcon fontSize="small" sx={{ color: '#f3e032' }} />;
      case 'duckduckgo_search': return <SearchIcon fontSize="small" sx={{ color: '#ea4335' }} />;
      case 'calculator': return <CalculateIcon fontSize="small" sx={{ color: '#10b981' }} />;
      case 'calendar_api': return <CalendarMonthIcon fontSize="small" sx={{ color: '#3b82f6' }} />;
      default: return <BuildCircleIcon fontSize="small" color="secondary" />;
    }
  };

  const formatToolName = (name: string) => {
    return name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <Box sx={{ mb: 2, px: 1 }}>
      <Paper 
        variant="outlined" 
        sx={{ 
          borderRadius: 3, 
          overflow: 'hidden',
          bgcolor: 'background.default',
          borderColor: 'divider',
        }}
      >
        <Box 
          onClick={() => setOpen(!open)}
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            p: 1.5, 
            px: 2,
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' },
            transition: 'background-color 0.2s',
          }}
        >
          <BuildCircleIcon fontSize="small" color="primary" sx={{ mr: 1.5 }} />
          <Typography variant="body2" sx={{ flexGrow: 1, fontWeight: 500, color: 'text.secondary' }}>
            MindBot used {steps.length} tool{steps.length > 1 ? 's' : ''}
          </Typography>
          <IconButton size="small" disableRipple sx={{ p: 0 }}>
            {open ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
          </IconButton>
        </Box>
        
        <Collapse in={open}>
          <Box sx={{ p: 0, pb: open ? 1 : 0 }}>
            {steps.map((step, idx) => (
              <Box key={idx} sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', bgcolor: 'surfaceContainer', mr: 1.5 }}>
                    {getToolIcon(step.tool)}
                  </Box>
                  <Typography variant="body2" fontWeight={600}>
                    {formatToolName(step.tool)}
                  </Typography>
                </Box>
                
                <Box sx={{ ml: 4 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 500 }}>
                    INPUT
                  </Typography>
                  <Typography component="div" variant="body2" sx={{ fontFamily: 'monospace', bgcolor: 'surfaceContainer', p: 1, borderRadius: 1.5, mb: 1.5, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '0.75rem' }}>
                    {step.input}
                  </Typography>
                  
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 500 }}>
                    OUTPUT
                  </Typography>
                  <Typography component="div" variant="body2" sx={{ fontFamily: 'monospace', bgcolor: 'surfaceContainer', p: 1, borderRadius: 1.5, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '0.75rem' }}>
                    {step.output}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Collapse>
      </Paper>
    </Box>
  );
}
