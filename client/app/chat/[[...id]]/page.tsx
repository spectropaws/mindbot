"use client";

import remarkGfm from 'remark-gfm';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../../components/AuthProvider';
import { useRouter, useParams } from 'next/navigation';
import {
  Box, Typography, TextField, IconButton,
  Avatar, AppBar, Toolbar, CircularProgress,
  useTheme, CssBaseline, InputAdornment, useMediaQuery,
  FormControlLabel, Checkbox, Tooltip, Chip
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import MenuIcon from '@mui/icons-material/Menu';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import ImageIcon from '@mui/icons-material/Image';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

import Sidebar from '../../../components/Sidebar';
import RagDropzone from '../../../components/RagDropzone';
import ToolStatus, { ToolStep } from '../../../components/ToolStatus';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  tool_steps?: ToolStep[];
  imagePreview?: string; // for local preview of sent images
};

export default function ChatPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const params = useParams();

  const paramId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const chatId = paramId || null;

  const activeChatId = useRef<string | null>(chatId);
  const isOptimisticNav = useRef(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mounted, setMounted] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi there! I am MindBot. I have tools enabled (Search, Calculator, Python, Calendar). What can I do for you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ragOpen, setRagOpen] = useState(false);
  const [useKnowledgeBase, setUseKnowledgeBase] = useState(false);
  const [chats, setChats] = useState<{ id: string; title: string }[]>([]);

  // --- Voice recording state ---
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // --- Image attachment state ---
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchChats = async () => {
    if (!user) return;
    try {
      const res = await axios.get(`/api/users/${user.id}/chats`);
      setChats(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setChats([]);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    setMounted(true);
    setSidebarOpen(!isMobile);
    setRagOpen(!isMobile);
  }, []);

  useEffect(() => {
    if (mounted) {
      setSidebarOpen(!isMobile);
      setRagOpen(!isMobile);
    }
  }, [isMobile, mounted]);

  useEffect(() => {
    if (user) fetchChats();
  }, [user]);

  useEffect(() => {
    activeChatId.current = chatId;
  }, [chatId]);

  useEffect(() => {
    if (!chatId) {
      setMessages([{ role: 'assistant', content: 'Hi there! I am MindBot. I have tools enabled (Search, Calculator, Python, Calendar). What can I do for you today?' }]);
      return;
    }
    if (isOptimisticNav.current) {
      isOptimisticNav.current = false;
      return;
    }
    const loadConversation = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/api/chats/${chatId}/messages`);
        setMessages(
          res.data.map((m: any) => ({ role: m.role, content: m.content }))
        );
      } catch (err) {
        console.error('Message load error:', err);
      } finally {
        setLoading(false);
      }
    };
    loadConversation();
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // --- Image attachment handlers ---
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    // Reset file input so same file can be re-selected
    e.target.value = '';
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  // Convert File to pure base64 string (strip the data:...;base64, prefix)
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // --- Voice recording handlers ---
  const handleMicClick = async () => {
    if (isRecording) {
      // Stop recording
      mediaRecorderRef.current?.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Stop all microphone tracks
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
        setIsTranscribing(true);

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const formData = new FormData();
        formData.append('audio', audioBlob, `recording.${mimeType.split('/')[1]}`);

        try {
          const res = await axios.post(`/api/users/${user?.id}/voice`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          const transcript: string = res.data?.transcript || '';
          if (transcript.trim()) {
            // Auto-send the transcript as a message
            await handleSend(undefined, transcript.trim());
          }
        } catch (err) {
          console.error('Transcription error:', err);
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access denied:', err);
    }
  };

  // --- Send handler (accepts optional override message for voice use) ---
  const handleSend = async (e?: React.FormEvent, overrideMessage?: string) => {
    if (e) e.preventDefault();
    const userMessage = overrideMessage ?? input.trim();
    if (!userMessage || loading) return;

    // Capture image before clearing state
    const imageToBeSent = selectedImage;
    const imagePreviewToBeSent = imagePreview;

    if (!overrideMessage) setInput('');
    clearImage();

    // 1. Build optimistic image base64 if present
    let imageBase64: string | null = null;
    if (imageToBeSent) {
      try {
        imageBase64 = await fileToBase64(imageToBeSent);
      } catch {
        console.error('Failed to encode image');
      }
    }

    // 2. Instantly update UI
    const optimisticMessages: Message[] = [
      ...messages,
      {
        role: 'user',
        content: userMessage,
        imagePreview: imagePreviewToBeSent ?? undefined,
      },
    ];
    setMessages(optimisticMessages);
    setLoading(true);

    let currentChatId = activeChatId.current;

    if (!currentChatId) {
      currentChatId = crypto.randomUUID();
      activeChatId.current = currentChatId;
      isOptimisticNav.current = true;
      window.history.pushState(null, '', `/chat/${currentChatId}`);
    }

    // 3. Make API call
    try {
      const payload: Record<string, any> = {
        chatId: currentChatId,
        message: userMessage,
        useRag: useKnowledgeBase,
      };
      if (imageBase64) payload.imageBase64 = imageBase64;

      const response = await axios.post(`/api/users/${user?.id}/chats`, payload);

      setMessages([
        ...optimisticMessages,
        {
          role: 'assistant',
          content: response.data.reply,
          tool_steps: response.data.tool_steps,
        },
      ]);
      fetchChats();
    } catch (err) {
      console.error(err);
      setMessages([
        ...optimisticMessages,
        { role: 'assistant', content: 'Connection error: Unable to reach MindBot.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    router.push('/chat');
    if (isMobile) setSidebarOpen(false);
  };

  if (authLoading || !mounted) {
    return (
      <Box sx={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) return null;

  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', bgcolor: 'background.default' }}>
      <CssBaseline />

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={handleNewChat}
        chats={chats}
        activeChatId={chatId}
        onSelectChat={(id) => {
          router.push(`/chat/${id}`);
          if (isMobile) setSidebarOpen(false);
        }}
      />

      {/* Center Chat Area */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Toolbar sx={{ minHeight: 64, px: { xs: 1, sm: 2 } }}>
            <IconButton edge="start" onClick={() => setSidebarOpen(!sidebarOpen)} sx={{ mr: 1, display: { md: 'none' } }}>
              <MenuIcon />
            </IconButton>

            <Avatar sx={{ bgcolor: 'primary.main', mr: 1.5, width: 36, height: 36 }}>
              <SmartToyIcon fontSize="small" />
            </Avatar>
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                MindBot
              </Typography>
            </Box>

            <FormControlLabel
              control={
                <Checkbox
                  checked={useKnowledgeBase}
                  onChange={(e) => setUseKnowledgeBase(e.target.checked)}
                  size="small"
                />
              }
              label={
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, display: { xs: 'none', sm: 'block' } }}>
                  Use KB
                </Typography>
              }
              sx={{ mr: 1 }}
            />

            <IconButton onClick={() => setRagOpen(!ragOpen)} sx={{ mr: 1 }} color={ragOpen ? 'primary' : 'default'}>
              <AutoStoriesIcon />
            </IconButton>
            <IconButton onClick={() => signOut()} title="Logout">
              <MoreVertIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* Messages Area */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: { xs: 1, md: 3 }, display: 'flex', justifyContent: 'center' }}>
          <Box sx={{ width: '100%', maxWidth: 800, display: 'flex', flexDirection: 'column', gap: 2, pb: 4 }}>
            <Typography variant="caption" align="center" color="text.secondary" sx={{ my: 2 }}>
              Chat started
            </Typography>

            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <Box key={idx} sx={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', mb: 1 }}>
                  {!isUser && msg.tool_steps && msg.tool_steps.length > 0 && (
                    <Box sx={{ ml: 6, mb: 1, width: '100%', maxWidth: '85%' }}>
                      <ToolStatus steps={msg.tool_steps} />
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', width: '100%', justifyContent: isUser ? 'flex-end' : 'flex-start', px: 1 }}>
                    {!isUser && (
                      <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32, mr: 2, mt: 0.5 }}>
                        <SmartToyIcon fontSize="small" />
                      </Avatar>
                    )}

                    <Box
                      className={isUser ? '' : 'markdown-body'}
                      sx={{
                        p: 1.5,
                        px: 2.5,
                        maxWidth: '85%',
                        borderRadius: isUser ? '24px 4px 24px 24px' : '4px 24px 24px 24px',
                        bgcolor: isUser ? 'primary.main' : 'surfaceContainer',
                        color: isUser ? 'primary.contrastText' : 'text.primary',
                        boxShadow: 'none',
                        lineHeight: 1.5,
                        '& p': { m: 0, '&:not(:last-child)': { mb: 1 } },
                        '& pre': {
                          bgcolor: 'background.paper',
                          p: 1.5,
                          borderRadius: 2,
                          overflowX: 'auto',
                          my: 1,
                          filter: isUser ? 'invert(1)' : 'none',
                        },
                        '& code': { fontFamily: 'monospace', fontSize: '0.85em' },
                      }}
                    >
                      {/* Image preview for user messages */}
                      {isUser && msg.imagePreview && (
                        <Box sx={{ mb: 1 }}>
                          <img
                            src={msg.imagePreview}
                            alt="Attached"
                            style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, display: 'block' }}
                          />
                        </Box>
                      )}
                      {isUser ? (
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {msg.content}
                        </Typography>
                      ) : (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      )}
                    </Box>
                  </Box>
                </Box>
              );
            })}

            {(loading || isTranscribing) && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', px: 1, mb: 1 }}>
                <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32, mr: 2, mt: 0.5 }}>
                  <SmartToyIcon fontSize="small" />
                </Avatar>
                <Box sx={{ p: 2, px: 3, borderRadius: '4px 24px 24px 24px', bgcolor: 'surfaceContainer', display: 'flex', alignItems: 'center' }}>
                  <CircularProgress size={20} color="primary" sx={{ mr: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    {isTranscribing ? 'Transcribing audio...' : 'Thinking...'}
                  </Typography>
                </Box>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>
        </Box>

        {/* Bottom Input Area */}
        <Box sx={{ p: { xs: 2, md: 3 }, pt: 1, bgcolor: 'background.default', display: 'flex', justifyContent: 'center' }}>
          <Box sx={{ width: '100%', maxWidth: 800 }}>

            {/* Image preview chip above input */}
            {imagePreview && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
                <Box
                  sx={{
                    position: 'relative',
                    display: 'inline-flex',
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '2px solid',
                    borderColor: 'primary.main',
                  }}
                >
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{ height: 60, width: 'auto', maxWidth: 120, display: 'block', objectFit: 'cover' }}
                  />
                  <IconButton
                    size="small"
                    onClick={clearImage}
                    sx={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      bgcolor: 'rgba(0,0,0,0.55)',
                      color: 'white',
                      borderRadius: 0,
                      p: 0.25,
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
                <Chip
                  icon={<ImageIcon fontSize="small" />}
                  label="Image attached"
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Box>
            )}

            {/* Hidden file input */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageSelect}
            />

            <TextField
              fullWidth
              multiline
              maxRows={6}
              placeholder={isRecording ? 'Recording… click Stop when done' : 'Message MindBot...'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isRecording || isTranscribing}
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ alignSelf: 'flex-end', mb: 1, ml: 0.5 }}>
                    {/* Attach image button */}
                    <Tooltip title="Attach image">
                      <IconButton
                        size="small"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={isRecording || isTranscribing}
                        color={selectedImage ? 'primary' : 'default'}
                        sx={{ mr: 0.5 }}
                      >
                        <AttachFileIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end" sx={{ alignSelf: 'flex-end', mb: 1, gap: 0.5 }}>
                    {/* Mic / Stop button */}
                    <Tooltip title={isRecording ? 'Stop recording' : 'Voice input'}>
                      <IconButton
                        onClick={handleMicClick}
                        disabled={loading || isTranscribing}
                        sx={{
                          color: isRecording ? 'error.main' : 'text.secondary',
                          animation: isRecording ? 'pulse 1.2s infinite' : 'none',
                          '@keyframes pulse': {
                            '0%': { opacity: 1 },
                            '50%': { opacity: 0.4 },
                            '100%': { opacity: 1 },
                          },
                        }}
                      >
                        {isRecording ? <StopIcon fontSize="small" /> : <MicIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>

                    {/* Send button */}
                    <IconButton
                      color="primary"
                      onClick={() => handleSend()}
                      disabled={(!input.trim() && !selectedImage) || loading || isRecording || isTranscribing}
                      sx={{
                        bgcolor: (input.trim() || selectedImage) && !loading && !isRecording ? 'primary.main' : 'transparent',
                        color: (input.trim() || selectedImage) && !loading && !isRecording ? 'primary.contrastText' : 'action.disabled',
                        '&:hover': { bgcolor: 'primary.dark' },
                        transition: 'all 0.2s',
                      }}
                    >
                      <SendIcon fontSize="small" />
                 </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 4,
                  bgcolor: 'surfaceContainer',
                  pr: 1,
                  py: 1.5,
                  '& fieldset': { border: 'none' },
                },
              }}
            />
            <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1, color: 'text.secondary' }}>
              MindBot may make mistakes. Consider verifying important information.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Right RAG Context Panel */}
      {ragOpen && (
        <Box sx={{
          position: isMobile ? 'absolute' : 'relative',
          top: 0, right: 0, bottom: 0,
          zIndex: 10,
          flexShrink: 0,
        }}>
          <RagDropzone onClose={isMobile ? () => setRagOpen(false) : undefined} userId={user.id} />
        </Box>
      )}
    </Box>
  );
}