"use client";

import { Box, Typography, Button, Divider, IconButton, List, ListItem, ListItemButton, ListItemText, Drawer, useTheme, useMediaQuery } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CloseIcon from '@mui/icons-material/Close';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  onNewChat: () => void;
  chats: {id: string, title: string}[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
}

export default function Sidebar({ open, onClose, onNewChat, chats = [], activeChatId, onSelectChat }: SidebarProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const content = (
    <Box sx={{ width: 280, p: 2, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'surfaceContainer', borderRight: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, px: 1 }}>
          MindBot
        </Typography>
        {isMobile && (
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={onNewChat}
        fullWidth
        disableElevation
        sx={{
          justifyContent: 'flex-start',
          borderRadius: 4,
          py: 1.5,
          textTransform: 'none',
          fontWeight: 500,
          mb: 2,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          '&:hover': {
            bgcolor: 'primary.dark',
          }
        }}
      >
        New Chat
      </Button>

      <Typography variant="overline" sx={{ px: 2, color: 'text.secondary', fontWeight: 600, mb: 1 }}>
        Recent
      </Typography>

      <List sx={{ flexGrow: 1, overflowY: 'auto', px: 0 }}>
        {chats.map((chat) => (
          <ListItem key={chat.id} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton 
              selected={activeChatId === chat.id}
              onClick={() => onSelectChat(chat.id)}
              sx={{ borderRadius: 2 }}
            >
              <ChatBubbleOutlineIcon sx={{ mr: 2, fontSize: 20, color: activeChatId === chat.id ? 'primary.main' : 'text.secondary' }} />
              <ListItemText 
                primary={chat.title} 
                title={chat.title}
                primaryTypographyProps={{ 
                  noWrap: true, 
                  fontSize: '0.875rem',
                  color: activeChatId === chat.id ? 'primary.main' : 'text.primary',
                  fontWeight: activeChatId === chat.id ? 600 : 400
                }} 
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
      <Divider sx={{ my: 1 }} />
      <Box sx={{ p: 1, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          MindBot Prototype v2
        </Typography>
      </Box>
    </Box>
  );

  return (
    <>
      {isMobile ? (
        <Drawer anchor="left" open={open} onClose={onClose}>
          {content}
        </Drawer>
      ) : (
        <Box sx={{ 
          width: open ? 280 : 0, 
          height: '100%', 
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          overflow: 'hidden',
          flexShrink: 0
        }}>
          {content}
        </Box>
      )}
    </>
  );
}
