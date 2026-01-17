import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  Send, Image as ImageIcon, Sparkles, X, Copy, Settings, Trash2,
  BookOpen, ChevronLeft, Calendar, Eye, Plus, MessageCircle,
  FileText, RotateCcw, RotateCw, MoreVertical, GripVertical, Edit3,
  Type, Quote, Minus, MapPin, Link as LinkIcon, Camera, Music, Video,
  Monitor, Tablet, Smartphone
} from 'lucide-react';
import './index.css';

const App = () => {
  // Navigation & Session State
  const [view, setView] = useState('home'); // 'home' | 'editor'
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'post'
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [hasNewPostContent, setHasNewPostContent] = useState(false);
  const [inputText, setInputText] = useState('');
  const [postEditInput, setPostEditInput] = useState('');
  const [editingBlockId, setEditingBlockId] = useState(null);
  const [previewMode, setPreviewMode] = useState('pc'); // 'pc' | 'tablet' | 'mobile'
  const [aiResponsesEnabled, setAiResponsesEnabled] = useState(true);

  // App Global States
  const [showSettings, setShowSettings] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiKeys, setApiKeys] = useState({
    gemini: import.meta.env.VITE_GEMINI_API_KEY || '',
  });

  // Internal Configuration
  const NAVER_CLIENT_ID = import.meta.env.VITE_NAVER_SEARCH_CLIENT_ID || 'dkky2C4u82iO24wfSQ1J';
  const NAVER_CLIENT_SECRET = import.meta.env.VITE_NAVER_SEARCH_CLIENT_SECRET || 'Kz8Iw7_Cqc';
  const [naverUser, setNaverUser] = useState(null); // { nickname, blogTitle, profileImage, etc. }

  // Home View State
  const [showAllChats, setShowAllChats] = useState(false);
  const [showAllPosts, setShowAllPosts] = useState(false);

  // Undo/Redo History for Post Editor
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const chatEndRef = useRef(null);
  const postInputRef = useRef(null);

  // Load Initial Data
  useEffect(() => {
    const savedSettings = localStorage.getItem('wizard_settings');
    if (savedSettings) setApiKeys(JSON.parse(savedSettings));

    const savedNaverUser = localStorage.getItem('naver_user');
    if (savedNaverUser) setNaverUser(JSON.parse(savedNaverUser));

    const savedSessions = localStorage.getItem('wizard_sessions');
    if (savedSessions) {
      setSessions(JSON.parse(savedSessions));
    } else {
      const initialSession = {
        id: Date.now(),
        title: '나의 첫 기록 ✍️',
        status: 'active',
        messages: [{
          id: 1,
          sender: 'ai',
          type: 'text',
          content: '안녕하세요! 당신의 소중한 순간을 블로그로 만들어드릴 AI 위저드입니다. 사진이나 오늘 있었던 일들을 편하게 말씀해 주세요!',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }],
        post: { title: '', content: [], tags: [] },
        createdAt: new Date().toISOString()
      };
      setSessions([initialSession]);
    }
  }, []);

  // Save Sessions whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('wizard_sessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const savedState = localStorage.getItem('naver_auth_state');

    if (code && state && state === savedState) {
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      processNaverLogin(code, state);
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSessionId, sessions, activeTab]);

  const currentSession = sessions.find(s => s.id === currentSessionId);

  // --- Session Management ---
  const createNewSession = () => {
    const newSession = {
      id: Date.now(),
      title: '새로운 기록 💬',
      status: 'active',
      messages: [{
        id: Date.now() + 1,
        sender: 'ai',
        type: 'text',
        content: '새로운 기록을 시작합니다! 사진이나 메시지를 보내주시면 정성껏 블로그 글을 써볼게요.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }],
      post: { title: '', content: [], tags: [] },
      createdAt: new Date().toISOString()
    };
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newSession.id);
    setView('editor');
    setActiveTab('chat');
  };

  const deleteSession = (e, id) => {
    e.stopPropagation();
    if (!confirm('기록을 삭제할까요?')) return;
    setSessions(sessions.filter(s => s.id !== id));
    if (currentSessionId === id) setView('home');
  };

  // --- Naver Login Logic ---
  const handleNaverLogin = () => {
    const state = Math.random().toString(36).substring(7);
    localStorage.setItem('naver_auth_state', state);
    const callbackUrl = encodeURIComponent(window.location.origin);
    const authUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${NAVER_CLIENT_ID}&redirect_uri=${callbackUrl}&state=${state}`;
    window.location.href = authUrl;
  };

  const processNaverLogin = async (code, state) => {
    try {
      // Note: In a real production app, token exchange MUST happen on the server to avoid CORS and protect Client Secret.
      // For this wizard, we'll try to fetch via a proxy or provide a clear instruction.
      // Use local Vite proxy to avoid CORS
      const tokenUrl = `/oauth2.0/token?grant_type=authorization_code&client_id=${NAVER_CLIENT_ID}&client_secret=${NAVER_CLIENT_SECRET}&code=${code}&state=${state}`;

      const response = await fetch(tokenUrl);
      const data = await response.json();

      if (data.access_token) {
        // Use /v1 proxy for profile fetching
        const profileResponse = await fetch(`/v1/nid/me`, {
          headers: { Authorization: `Bearer ${data.access_token}` }
        });
        const profileData = await profileResponse.json();

        if (profileData.response) {
          const user = {
            nickname: profileData.response.nickname,
            profileImage: profileData.response.profile_image,
            blogTitle: `${profileData.response.nickname}님의 블로그` // Placeholder as direct blog name fetch needs search API
          };
          setNaverUser(user);
          localStorage.setItem('naver_user', JSON.stringify(user));
          alert(`${user.nickname}님, 환영합니다!`);
        }
      }
    } catch (err) {
      console.error('Naver Login Error:', err);
      alert('네이버 로그인 처리 중 오류가 발생했습니다. CORS 제약으로 인해 서버 프록시가 필요할 수 있습니다.');
    }
  };

  const handleNaverLogout = () => {
    setNaverUser(null);
    localStorage.removeItem('naver_user');
    localStorage.removeItem('naver_auth_state');
  };

  // --- Chat Logic ---
  const handleSendMessage = async (text, type = 'text') => {
    if (!text && type === 'text') return;
    if (!currentSessionId) return;

    const newMessage = {
      id: Date.now(),
      sender: 'user',
      type: type,
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: [...s.messages, newMessage] } : s));

    if (aiResponsesEnabled && apiKeys.gemini) {
      try {
        const genAI = new GoogleGenerativeAI(apiKeys.gemini);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const reactionPrompt = `다정한 친구이자 블로그 도우미로서 자연스러운 리액션을 해주세요. 1~2문장 정도로 부드럽게 공감해 주되, 너무 길지는 않게 답변하세요. 질문은 하지 마세요. 사용자 메시지: ${type === 'text' ? text : '[사진을 보냈습니다]'}`;
        const result = await model.generateContent(reactionPrompt);
        const aiMessage = {
          id: Date.now() + 1,
          sender: 'ai',
          type: 'text',
          content: result.response.text(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: [...s.messages, aiMessage] } : s));
      } catch (err) { console.error(err); }
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => handleSendMessage(ev.target.result, 'image');
      reader.readAsDataURL(file);
    });
  };

  // --- Blog Generation ---
  const generateBlogPost = async () => {
    if (!apiKeys.gemini) { alert('설정에서 API 키를 등록해주세요!'); setShowSettings(true); return; }
    setIsGenerating(true);
    try {
      const genAI = new GoogleGenerativeAI(apiKeys.gemini);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const userMessages = currentSession.messages.filter(m => m.sender === 'user');
      const chatSummary = userMessages.map(m => m.type === 'text' ? `[TEXT]: ${m.content}` : `[IMAGE]`).join('\n');
      const prompt = `네이버 블로그 마케터로서 대화 내용을 바탕으로 블로그 포스트를 JSON 형식으로 작성하세요. { "title": "제목", "content_blocks": ["문단1", "문단2"], "tags": ["태그1"] } 대화: ${chatSummary}`;
      const result = await model.generateContent(prompt);
      let text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) text = jsonMatch[0].replace(/```json/g, '').replace(/```/g, '').trim();
      const data = JSON.parse(text);

      const chatImages = userMessages.filter(m => m.type === 'image');
      const finalContent = [];
      data.content_blocks.forEach((textVal, idx) => {
        finalContent.push({ id: `text-${Date.now()}-${idx}`, type: 'text', value: textVal });
        if (chatImages[idx % chatImages.length]) {
          finalContent.push({ id: `img-${Date.now()}-${idx}`, type: 'image', value: chatImages[idx % chatImages.length].content });
        }
      });
      const newPost = { title: data.title, content: finalContent, tags: data.tags };
      setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, post: newPost, title: data.title } : s));
      setHasNewPostContent(true);
      pushToHistory(newPost);
      const systemMsg = { id: Date.now() + 2, sender: 'ai', type: 'text', content: '✨ 블로그 글이 생성되었습니다! 상단의 [글] 탭에서 확인해보세요.', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: [...s.messages, systemMsg] } : s));
    } catch (err) { console.error(err); alert('오류 발생'); } finally { setIsGenerating(false); }
  };

  // --- Blog Generation ---
  const handleCopyForNaver = async () => {
    if (!currentSession?.post) return;

    let htmlContent = `<div style="text-align: left; max-width: 880px; margin: 0 auto; font-family: 'Namum Gothic', sans-serif;">`;
    // Title
    htmlContent += `<h1 style="font-size: 38px; font-weight: bold; margin-bottom: 40px;">${currentSession.post.title}</h1>`;

    currentSession.post.content.forEach(block => {
      if (block.type === 'text') {
        htmlContent += `<p style="font-size: 16px; line-height: 1.8; color: #333; margin-bottom: 20px;">${block.value.replace(/\n/g, '<br>')}</p>`;
        htmlContent += `<br>`;
      } else if (block.type === 'image') {
        htmlContent += `<div style="margin: 30px 0; text-align: center;"><img src="${block.value}" style="max-width: 100%; border-radius: 8px; display: inline-block;" /></div>`;
        htmlContent += `<br>`;
      } else if (block.type === 'quote') {
        htmlContent += `<div style="margin: 40px 0; padding: 20px; text-align: center;"><span style="font-size: 30px; color: #03c75a; display: block; margin-bottom: 10px;">"</span><div style="font-size: 18px; font-weight: bold; color: #333;">${block.value}</div><span style="font-size: 30px; color: #03c75a; display: block; margin-top: 10px;">"</span></div>`;
        htmlContent += `<br>`;
      } else if (block.type === 'divider') {
        htmlContent += `<hr style="border: none; border-top: 1px solid #eee; margin: 40px 0;" />`;
        htmlContent += `<br>`;
      }
    });

    // Add hashtags
    if (currentSession.post.tags && currentSession.post.tags.length > 0) {
      htmlContent += `<div style="margin-top: 40px; color: #666;">${currentSession.post.tags.map(tag => `#${tag}`).join(' ')}</div>`;
    }
    htmlContent += `</div>`;

    try {
      const blobHtml = new Blob([htmlContent], { type: "text/html" });
      const blobText = new Blob([currentSession.post.title + '\n\n' + currentSession.post.content.map(b => b.type === 'text' || b.type === 'quote' ? b.value : '').join('\n\n')], { type: "text/plain" });

      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": blobHtml,
          "text/plain": blobText,
        }),
      ]);
      alert("✨ 블로그용 복사 완료! 네이버 블로그 글쓰기 화면에 '붙여넣기' 하세요.");
    } catch (err) {
      console.error('Copy failed', err);
      alert("⚠️ 복사에 실패했습니다. HTTPS 환경이 아니거나 브라우저 권한이 필요합니다.");
    }
  };

  // --- Editor Logic ---
  const pushToHistory = (post) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(post)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };
  const undo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setSessions(prevSessions => prevSessions.map(s => s.id === currentSessionId ? { ...s, post: prev } : s));
      setHistoryIndex(historyIndex - 1);
    }
  };
  const redo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setSessions(prevSessions => prevSessions.map(s => s.id === currentSessionId ? { ...s, post: next } : s));
      setHistoryIndex(historyIndex + 1);
    }
  };
  const updateBlock = (id, newValue) => {
    const updatedPost = { ...currentSession.post, content: currentSession.post.content.map(b => b.id === id ? { ...b, value: newValue } : b) };
    setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, post: updatedPost } : s));
  };
  const deleteBlock = (id) => {
    const updatedPost = { ...currentSession.post, content: currentSession.post.content.filter(b => b.id !== id) };
    setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, post: updatedPost } : s));
    pushToHistory(updatedPost);
  };

  const addBlock = (type) => {
    const newBlock = {
      id: `${type}-${Date.now()}`,
      type,
      value: type === 'text' ? '새로운 문단을 입력하세요.' :
        type === 'quote' ? '인용구 내용을 입력하세요.' : '',
    };
    const updatedPost = { ...currentSession.post, content: [...currentSession.post.content, newBlock] };
    setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, post: updatedPost } : s));
    pushToHistory(updatedPost);
  };
  const aiEditBlock = (block) => {
    setEditingBlockId(block.id);
    setPostEditInput(`"${block.value.slice(0, 50)}..." 부분을 `);
    setTimeout(() => postInputRef.current?.focus(), 100);
  };

  const [isEditing, setIsEditing] = useState(false);
  const handlePostEditRequest = async (presetPrompt = null) => {
    const request = presetPrompt || postEditInput;
    if (!request.trim() || !apiKeys.gemini || isEditing) return;
    setPostEditInput('');
    setIsEditing(true);
    const userMsg = { id: Date.now(), sender: 'user', type: 'text', content: `[글 수정 요청] ${request}`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: [...s.messages, userMsg] } : s));
    try {
      const genAI = new GoogleGenerativeAI(apiKeys.gemini);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const currentPost = currentSession?.post;
      if (editingBlockId) {
        const targetBlock = currentPost.content.find(b => b.id === editingBlockId);
        const prompt = `블로그 에디터 AI입니다. 수정 대상을 요청에 따라 고치세요. 대상: ${targetBlock.value} 요청: ${request}. 수정본만 출력하세요.`;
        const result = await model.generateContent(prompt);
        const newContent = result.response.text().trim().replace(/^"|"$/g, '');
        const updatedPost = { ...currentPost, content: currentPost.content.map(b => b.id === editingBlockId ? { ...b, value: newContent } : b) };
        setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, post: updatedPost } : s));
        pushToHistory(updatedPost);
      } else {
        const fullText = currentPost.content.filter(b => b.type === 'text').map(b => b.value).join('\n\n---BLOCK_SEPARATOR---\n\n');
        const prompt = `전체 글을 수정하세요. 각 블록은 ---BLOCK_SEPARATOR---로 유지하세요. 요청: ${request}\n본문:\n${fullText}`;
        const result = await model.generateContent(prompt);
        const modifiedBlocks = result.response.text().trim().split(/---BLOCK_SEPARATOR---/).map(s => s.trim()).filter(s => s);
        let blockIndex = 0;
        const updatedContent = currentPost.content.map(b => (b.type === 'text' && blockIndex < modifiedBlocks.length) ? { ...b, value: modifiedBlocks[blockIndex++] } : b);
        const updatedPost = { ...currentPost, content: updatedContent };
        setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, post: updatedPost } : s));
        pushToHistory(updatedPost);
      }
      const aiMsg = { id: Date.now() + 1, sender: 'ai', type: 'text', content: '✅ 수정 완료!', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: [...s.messages, aiMsg] } : s));
    } catch (err) { console.error(err); } finally { setEditingBlockId(null); setIsEditing(false); }
  };

  const addTag = () => {
    const newTag = prompt('태그 입력');
    if (newTag?.trim()) {
      const tag = newTag.trim().replace(/^#/, '');
      const updatedPost = { ...currentSession.post, tags: [...new Set([...currentSession.post.tags, tag])] };
      setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, post: updatedPost } : s));
      pushToHistory(updatedPost);
    }
  };
  const removeTag = (tag) => {
    const updatedPost = { ...currentSession.post, tags: currentSession.post.tags.filter(t => t !== tag) };
    setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, post: updatedPost } : s));
    pushToHistory(updatedPost);
  };
  const publishSession = () => {
    setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, status: 'published', publishedAt: new Date().toISOString() } : s));
    setView('home');
    alert('발행 완료!');
  };

  const HomeView = () => {
    const published = sessions.filter(s => s.status === 'published');
    const active = sessions.filter(s => s.status === 'active');

    // Lists to display based on expansion state
    const visibleActive = showAllChats ? active : active.slice(0, 3);
    const visiblePublished = showAllPosts ? published : published.slice(0, 3);

    return (
      <div className="reveal" style={{ padding: '2rem 1.5rem', height: '100%', overflowY: 'auto', paddingBottom: '160px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Compact Header */}
        <div style={{ marginBottom: '3rem', textAlign: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '0.8rem' }}>
            <img src={naverUser.profileImage} style={{ width: '60px', height: '60px', borderRadius: '50%', border: '3px solid var(--naver-green)', boxShadow: '0 0 15px rgba(3, 199, 90, 0.2)' }} alt="profile" />
            <div style={{ textAlign: 'left' }}>
              <h1 style={{ fontSize: '1.8rem', fontWeight: '950', letterSpacing: '-1px', margin: 0, lineHeight: 1 }}>안녕하세요,</h1>
              <h1 className="premium-gradient" style={{ fontSize: '1.8rem', fontWeight: '950', letterSpacing: '-1px', margin: 0, lineHeight: 1 }}>{naverUser.blogTitle}님!</h1>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '3.5rem', width: '100%', maxWidth: '850px' }}>

          {/* Ongoing Chats Section */}
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', margin: 0 }}>
                <MessageCircle size={18} color="var(--naver-green)" /> 진행 중인 대화
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: '600', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px' }}>{active.length}</span>
              </h2>
            </div>

            {active.length === 0 ? (
              <div className="glass" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)', borderRadius: '24px' }}>
                <p>진행 중인 대화가 없습니다.</p>
                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>새로운 주제로 대화를 시작해보세요!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {visibleActive.map(s => (
                  <div key={s.id} className="session-item reveal glass" onClick={() => { setCurrentSessionId(s.id); setView('editor'); }} style={{ padding: '1rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ background: 'rgba(3, 199, 90, 0.1)', minWidth: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MessageCircle size={22} color="var(--naver-green)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '0.2rem' }}>{s.title}</h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.messages[s.messages.length - 1]?.content}</p>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(s.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  </div>
                ))}
                {active.length > 3 && (
                  <button
                    onClick={() => setShowAllChats(!showAllChats)}
                    className="button-hover"
                    style={{ width: '100%', padding: '0.8rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '16px', color: 'var(--text-dim)', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', marginTop: '0.5rem' }}
                  >
                    {showAllChats ? '접기' : `더보기 (${active.length - 3}개)`}
                  </button>
                )}
              </div>
            )}
          </section>

          {/* Published Posts Section */}
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', margin: 0 }}>
                <BookOpen size={18} color="var(--naver-green)" /> 발행한 글
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: '600', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px' }}>{published.length}</span>
              </h2>
            </div>

            {published.length === 0 ? (
              <div className="glass" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)', borderRadius: '24px' }}>
                <p>아직 발행된 글이 없습니다.</p>
                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>AI와 함께 멋진 글을 작성해보세요.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                {visiblePublished.map(s => (
                  <div key={s.id} className="session-item reveal" onClick={() => { setCurrentSessionId(s.id); setView('editor'); setActiveTab('post'); }} style={{ position: 'relative', borderRadius: '24px', overflow: 'hidden', aspectRatio: '21/9', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', cursor: 'pointer' }}>
                    <img src={s.post.content.find(b => b.type === 'image')?.value || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&auto=format'} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }} alt="post cover" className="hover-scale" />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1.5rem', background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                      <h3 style={{ color: 'white', fontSize: '1.3rem', fontWeight: '800', lineHeight: '1.4', marginBottom: '0.5rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{s.title}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>{new Date(s.publishedAt).toLocaleDateString()}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--naver-green)', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '8px', fontWeight: '600' }}>발행 완료</span>
                      </div>
                    </div>
                  </div>
                ))}
                {published.length > 3 && (
                  <button
                    onClick={() => setShowAllPosts(!showAllPosts)}
                    className="button-hover"
                    style={{ width: '100%', padding: '0.8rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '16px', color: 'var(--text-dim)', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', marginTop: '0.5rem' }}
                  >
                    {showAllPosts ? '접기' : `더보기 (${published.length - 3}개)`}
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    );
  };

  const LoginView = () => (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)', padding: '2rem' }}>
      <div className="glass reveal" style={{ width: 'min(440px, 100%)', padding: '3.5rem 2.5rem', textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.4)', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ background: 'var(--naver-green)', width: '64px', height: '64px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', margin: '0 auto 1.5rem', boxShadow: '0 10px 20px rgba(3, 199, 90, 0.2)' }}>
          <Sparkles size={32} fill="white" />
        </div>
        <h1 className="premium-gradient" style={{ fontWeight: '900', fontSize: '2.4rem', letterSpacing: '-1.5px', marginBottom: '1rem' }}>TalkLog</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '2.5rem', fontWeight: '500' }}>
          기록은 톡로그에게 맡기고<br />
          당신은 경험에 집중하세요.
        </p>
        <button
          onClick={handleNaverLogin}
          className="button-hover"
          style={{
            width: '100%',
            backgroundColor: '#03C75A',
            color: 'white',
            padding: '1.2rem',
            borderRadius: '16px',
            border: 'none',
            fontWeight: '800',
            fontSize: '1.05rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            boxShadow: '0 10px 25px rgba(3, 199, 90, 0.2)'
          }}
        >
          <div style={{ width: '22px', height: '22px', backgroundColor: 'white', color: '#03C75A', borderRadius: '4px', fontSize: '15px', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>N</div>
          네이버로 시작하기
        </button>
        <div style={{ marginTop: '2rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          AI 기반 자동 블로그 글 생성 도구
        </div>
      </div>
    </div>
  );

  if (!naverUser) return <LoginView />;

  return (
    <div className="app-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-dark)' }}>
      <header className="glass" style={{ margin: '1rem', padding: '0.8rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '16px', zIndex: 100 }}>
        <div
          className="button-hover"
          onClick={() => setView('home')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer' }}
        >
          <div style={{ background: 'var(--naver-green)', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><Sparkles size={18} fill="white" /></div>
          <div><h1 className="premium-gradient" style={{ fontWeight: '900', fontSize: '1.2rem', letterSpacing: '-0.5px', margin: 0 }}>TalkLog</h1></div>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
          {naverUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.05)', borderRadius: '24px' }}>
              <img src={naverUser.profileImage} style={{ width: '24px', height: '24px', borderRadius: '50%' }} alt="profile" />
              <span style={{ fontSize: '0.85rem', color: 'white', fontWeight: 'bold' }}>{naverUser.nickname}</span>
              <button
                onClick={handleNaverLogout}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '0.7rem', cursor: 'pointer', padding: '0 4px' }}
                title="로그아웃"
              >로그아웃</button>
            </div>
          )}
          {view === 'editor' && <button className="glass button-hover" onClick={() => setView('home')} style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white' }}><ChevronLeft size={18} /> 홈으로</button>}
          <button className="glass button-hover" onClick={() => setShowSettings(true)} style={{ padding: '0.5rem', color: 'var(--text-dim)' }}><Settings size={20} /></button>
        </div>
      </header>

      <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {view === 'home' ? <HomeView /> : (
          <div className="reveal" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="tab-container" style={{ marginBottom: '1.5rem' }}>
              <div className={`tab ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}><MessageCircle size={18} /> 대화</div>
              <div className={`tab ${activeTab === 'post' ? 'active' : ''} ${hasNewPostContent ? 'has-new' : ''}`} onClick={() => { setActiveTab('post'); setHasNewPostContent(false); }}><FileText size={18} /> 글</div>
            </div>

            {activeTab === 'chat' ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 1rem' }}>
                  <div className="chat-window" style={{ maxWidth: '750px', margin: '0 auto', width: '100%', paddingBottom: '160px' }}>
                    <div className="glass-heavy reveal" style={{ padding: '1.2rem 1.5rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center', border: '1px solid var(--nave-green)', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div className="floating-action" style={{ background: aiResponsesEnabled ? 'var(--naver-green)' : 'var(--text-muted)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}><Sparkles size={20} color="white" /></div>
                        <div>
                          <div style={{ fontWeight: '800', fontSize: '0.95rem' }}>AI 위저드 {aiResponsesEnabled ? '대화 중' : '휴식 중'}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{aiResponsesEnabled ? '사진을 보내거나 일상을 들려주세요.' : 'AI 답변 없이 오직 기록에만 집중합니다.'}</div>
                        </div>
                      </div>
                      <div
                        onClick={() => setAiResponsesEnabled(!aiResponsesEnabled)}
                        style={{
                          width: '56px',
                          height: '30px',
                          backgroundColor: aiResponsesEnabled ? 'var(--naver-green)' : 'rgba(255,255,255,0.1)',
                          borderRadius: '100px',
                          position: 'relative',
                          cursor: 'pointer',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: aiResponsesEnabled ? '0 0 15px rgba(3, 199, 90, 0.3)' : 'none'
                        }}
                      >
                        <div style={{
                          position: 'absolute',
                          top: '3px',
                          left: aiResponsesEnabled ? '29px' : '3px',
                          width: '24px',
                          height: '24px',
                          backgroundColor: 'white',
                          borderRadius: '50%',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}>
                          <Sparkles size={12} color={aiResponsesEnabled ? 'var(--naver-green)' : '#ccc'} />
                        </div>
                      </div>
                    </div>
                    {currentSession?.messages.map((m) => (
                      <div key={m.id} className={`message ${m.sender} reveal`}>
                        <div className="bubble">{m.type === 'text' ? <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div> : <div className="message-image"><img src={m.content} alt="upload" /></div>}</div>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start', padding: '4px 8px' }}>{m.timestamp}</span>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                </div>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, var(--bg-dark) 80%, transparent)', padding: '1.5rem 1rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem' }}>
                  {!isGenerating && currentSession?.messages.filter(m => m.sender === 'user').length > 0 && <button className="button-hover reveal cta-style" onClick={generateBlogPost} style={{ background: 'var(--naver-green)', color: 'white', padding: '1rem 2.5rem', borderRadius: '50px', fontWeight: '900', border: 'none', display: 'flex', alignItems: 'center', gap: '0.8rem' }}><Sparkles size={20} /> AI 블로그 포스팅 생성</button>}
                  <div className="glass-heavy input-glow" style={{ maxWidth: '750px', width: '100%', borderRadius: '50px', display: 'flex', alignItems: 'center', padding: '0.6rem 1rem', gap: '0.8rem', border: '1px solid var(--glass-border)' }}>
                    <label className="button-hover" style={{ padding: '0.5rem', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex' }}><ImageIcon size={22} /><input type="file" multiple hidden onChange={handleImageUpload} /></label>
                    <input type="text" placeholder="오늘 무엇을 하셨나요? AI가 블로그 글로 만들어드릴게요." style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', padding: '0.6rem', fontSize: '1rem', outline: 'none' }} value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (handleSendMessage(inputText), setInputText(''))} />
                    <button className="button-hover" style={{ background: 'var(--naver-green)', color: 'white', padding: '0.7rem', borderRadius: '50%', border: 'none', display: 'flex' }} onClick={() => { handleSendMessage(inputText); setInputText(''); }} disabled={!inputText.trim()}><Send size={20} /></button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 140px', display: 'flex', justifyContent: 'center' }}>
                  <div style={{
                    width: previewMode === 'mobile' ? '400px' : previewMode === 'tablet' ? '768px' : '100%',
                    maxWidth: '960px',
                    margin: '0 auto',
                    padding: previewMode === 'mobile' ? '0 1rem' : '0 2rem',
                    transition: 'width 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', marginTop: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="button-hover glass" onClick={undo} disabled={historyIndex <= 0} style={{ padding: '0.6rem', opacity: historyIndex <= 0 ? 0.2 : 0.8, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <RotateCcw size={20} color="white" />
                        </button>
                        <button className="button-hover glass" onClick={redo} disabled={historyIndex >= history.length - 1} style={{ padding: '0.6rem', opacity: historyIndex >= history.length - 1 ? 0.2 : 0.8, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <RotateCw size={20} color="white" />
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: '0.8rem' }}>
                        <button className="button-hover glass" onClick={handleCopyForNaver} style={{ padding: '0.8rem 1.5rem', borderRadius: '16px', fontWeight: '800', border: 'none', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Copy size={18} />
                          블로그 복사
                        </button>
                        <button className="button-hover" onClick={publishSession} style={{ background: 'var(--naver-green)', color: 'white', padding: '0.8rem 2rem', borderRadius: '16px', fontWeight: '900', border: 'none', boxShadow: '0 10px 20px rgba(3, 199, 90, 0.2)' }}>발행하기</button>
                      </div>
                    </div>

                    <input className="seamless-title" value={currentSession?.post.title} onChange={(e) => setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, post: { ...s.post, title: e.target.value } } : s))} placeholder="제목을 입력하세요" style={{ fontSize: previewMode === 'mobile' ? '1.8rem' : previewMode === 'tablet' ? '2.4rem' : '2.8rem' }} />

                    {isGenerating ? <div style={{ textAlign: 'center', padding: '6rem 0' }}><div className="floating-action" style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🪄</div><p style={{ color: 'var(--text-dim)' }}>AI가 블로그 거장을 위한 글을 빚고 있습니다...</p></div> :
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {currentSession?.post.content.map((block, idx) => (
                          <div key={block.id} className={`editor-block reveal ${editingBlockId === block.id ? 'active' : ''}`} onClick={() => setEditingBlockId(block.id === editingBlockId ? null : block.id)}>
                            <div className="block-type-badge">{
                              block.type === 'text' ? `문단` :
                                block.type === 'image' ? `이미지` :
                                  block.type === 'quote' ? `인용구` : `구분선`
                            }</div>

                            <div className="block-toolbar">
                              {block.type === 'text' && (
                                <>
                                  <button className="button-hover glass" onClick={(e) => { e.stopPropagation(); setEditingBlockId(block.id); handlePostEditRequest("더 감성적으로"); }} style={{ padding: '4px 10px', fontSize: '0.7rem', color: 'var(--text-dim)', border: 'none', borderRadius: '8px' }}>✨ 감성</button>
                                  <button className="button-hover glass" onClick={(e) => { e.stopPropagation(); setEditingBlockId(block.id); handlePostEditRequest("내용 확장"); }} style={{ padding: '4px 10px', fontSize: '0.7rem', color: 'var(--text-dim)', border: 'none', borderRadius: '8px' }}>➕ 확장</button>
                                  <button className="button-hover" onClick={(e) => { e.stopPropagation(); aiEditBlock(block); }} style={{ background: 'var(--naver-green)', color: 'white', padding: '4px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '800', border: 'none' }}>AI 수정</button>
                                </>
                              )}
                              <button className="button-hover" onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }} style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '4px', borderRadius: '8px', border: 'none' }}><Trash2 size={14} /></button>
                            </div>

                            {block.type === 'text' && (
                              <div contentEditable suppressContentEditableWarning onBlur={(e) => updateBlock(block.id, e.currentTarget.innerText)} onClick={(e) => e.stopPropagation()} style={{ width: '100%', outline: 'none', color: '#f1f5f9', fontSize: previewMode === 'mobile' ? '1.05rem' : previewMode === 'tablet' ? '1.15rem' : '1.2rem', lineHeight: '1.8', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{block.value}</div>
                            )}

                            {block.type === 'image' && (
                              <div style={{ borderRadius: '12px', overflow: 'hidden', transition: 'all 0.3s' }}>
                                <img src={block.value || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1000&auto=format'} style={{ width: '100%', display: 'block' }} alt="img" />
                              </div>
                            )}

                            {block.type === 'quote' && (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1rem', textAlign: 'center' }}>
                                <div style={{ color: 'var(--naver-green)', fontSize: previewMode === 'mobile' ? '1.5rem' : '2rem', marginBottom: '0.5rem', fontWeight: '900' }}>"</div>
                                <div contentEditable suppressContentEditableWarning onBlur={(e) => updateBlock(block.id, e.currentTarget.innerText)} onClick={(e) => e.stopPropagation()} style={{ fontSize: previewMode === 'mobile' ? '1.1rem' : previewMode === 'tablet' ? '1.3rem' : '1.4rem', fontWeight: '800', color: 'white', outline: 'none', fontStyle: 'italic', maxWidth: '80%', lineHeight: '1.6' }}>{block.value}</div>
                                <div style={{ color: 'var(--naver-green)', fontSize: previewMode === 'mobile' ? '1.5rem' : '2rem', marginTop: '0.5rem', fontWeight: '900' }}>"</div>
                              </div>
                            )}

                            {block.type === 'divider' && (
                              <div style={{ display: 'flex', justifyContent: 'center', padding: '2.5rem 0' }}>
                                <div style={{ width: '120px', height: '1px', background: 'linear-gradient(to right, transparent, var(--glass-border), transparent)' }} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    }

                    <div style={{ marginTop: '4rem', padding: '2rem 0', borderTop: '1px solid var(--glass-border)' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '800', marginBottom: '1rem' }}>추천 태그</div>
                      <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                        {currentSession?.post.tags.map((tag, i) => (<span key={i} className="button-hover" onClick={() => removeTag(tag)} style={{ background: 'rgba(3, 199, 90, 0.1)', color: 'var(--naver-green)', padding: '8px 16px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '800', border: '1px solid rgba(3, 199, 90, 0.2)', display: 'flex', alignItems: 'center', gap: '6px' }}>#{tag} <X size={12} /></span>))}
                        <button className="button-hover glass" onClick={addTag} style={{ padding: '8px 12px', borderRadius: '12px' }}><Plus size={16} /></button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Floating Menu like Naver */}
                <div className="glass-heavy reveal" style={{
                  position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)',
                  display: 'flex', padding: '0.8rem', borderRadius: '24px', gap: '1rem',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
                  zIndex: 2000
                }}>
                  <button className="button-hover glass" onClick={() => addBlock('text')} style={{ padding: '0.8rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', color: 'white', border: 'none' }}>
                    <Type size={18} /><span style={{ fontSize: '0.6rem' }}>텍스트</span>
                  </button>
                  <button className="button-hover glass" onClick={() => addBlock('image')} style={{ padding: '0.8rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', color: 'white', border: 'none' }}>
                    <Camera size={18} /><span style={{ fontSize: '0.6rem' }}>사진</span>
                  </button>
                  <button className="button-hover glass" onClick={() => addBlock('quote')} style={{ padding: '0.8rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', color: 'white', border: 'none' }}>
                    <Quote size={18} /><span style={{ fontSize: '0.6rem' }}>인용구</span>
                  </button>
                  <button className="button-hover glass" onClick={() => addBlock('divider')} style={{ padding: '0.8rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', color: 'white', border: 'none' }}>
                    <Minus size={18} /><span style={{ fontSize: '0.6rem' }}>구분선</span>
                  </button>
                  <button className="button-hover glass" style={{ padding: '0.8rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', border: 'none' }}>
                    <MapPin size={18} /><span style={{ fontSize: '0.6rem' }}>장소</span>
                  </button>
                  <div style={{ width: '1px', background: 'var(--glass-border)', margin: '0.5rem 0' }} />
                  <button className="button-hover" style={{ padding: '0.8rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', color: 'var(--naver-green)', background: 'rgba(3, 199, 90, 0.1)', border: 'none' }}>
                    <Sparkles size={18} /><span style={{ fontSize: '0.6rem' }}>AI글감</span>
                  </button>
                </div>

                {/* View Mode Toggle */}
                <div className="glass-heavy reveal" style={{
                  position: 'fixed', bottom: '30px', right: '30px',
                  display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px', borderRadius: '16px',
                  zIndex: 2000
                }}>
                  <button onClick={() => setPreviewMode('pc')} className="button-hover" style={{
                    padding: '10px', borderRadius: '12px', border: 'none',
                    background: previewMode === 'pc' ? 'var(--naver-green)' : 'transparent',
                    color: previewMode === 'pc' ? 'white' : 'var(--text-dim)'
                  }} title="PC 화면">
                    <Monitor size={20} />
                  </button>
                  <button onClick={() => setPreviewMode('tablet')} className="button-hover" style={{
                    padding: '10px', borderRadius: '12px', border: 'none',
                    background: previewMode === 'tablet' ? 'var(--naver-green)' : 'transparent',
                    color: previewMode === 'tablet' ? 'white' : 'var(--text-dim)'
                  }} title="태블릿 화면">
                    <Tablet size={20} />
                  </button>
                  <button onClick={() => setPreviewMode('mobile')} className="button-hover" style={{
                    padding: '10px', borderRadius: '12px', border: 'none',
                    background: previewMode === 'mobile' ? 'var(--naver-green)' : 'transparent',
                    color: previewMode === 'mobile' ? 'white' : 'var(--text-dim)'
                  }} title="모바일 화면">
                    <Smartphone size={20} />
                  </button>
                </div>

                {/* AI Edit Input Bar */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, var(--bg-dark) 85%, transparent)', padding: '2rem', display: 'flex', justifyContent: 'center', zIndex: 10, pointerEvents: 'none' }}>
                  <div className="glass-heavy input-glow" style={{ pointerEvents: 'auto', maxWidth: '800px', width: '100%', borderRadius: '50px', display: 'flex', alignItems: 'center', padding: '0.7rem 1.2rem', gap: '1rem', border: editingBlockId ? '2px solid var(--naver-green)' : '1px solid var(--glass-border)' }}>
                    <Sparkles size={22} color="var(--naver-green)" />
                    <input ref={postInputRef} type="text" placeholder={editingBlockId ? "선택한 문단을 어떻게 고칠까요?" : "수정 사항을 입력하세요."} style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', padding: '0.6rem', fontSize: '1rem', outline: 'none' }} value={postEditInput} onChange={(e) => setPostEditInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handlePostEditRequest()} />
                    <button className="button-hover" style={{ background: 'var(--naver-green)', color: 'white', padding: '0.7rem 1.5rem', borderRadius: '30px', border: 'none', fontWeight: '900' }} onClick={() => handlePostEditRequest()} disabled={!postEditInput.trim() || isGenerating}>AI 수정</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'home' && (
          <button className="cta-button button-hover reveal" onClick={createNewSession} style={{ animationDelay: '0.3s' }}>
            <Plus size={24} />
            일상을 기록하기
          </button>
        )}
      </main>

      {showSettings && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 17, 21, 0.95)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass reveal" style={{ width: 'min(420px, 90%)', padding: '2.5rem' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.4rem', fontWeight: '800' }}>🚀 서비스 설정</h2>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>Gemini API Key</label>
              <input type="password" className="glass" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', padding: '1rem', color: 'white' }} value={apiKeys.gemini} onChange={(e) => setApiKeys({ ...apiKeys, gemini: e.target.value })} placeholder="AI 글 생성을 위해 필요합니다." />
            </div>

            <div style={{ marginTop: '3rem', display: 'flex', gap: '1.2rem' }}>
              <button className="button-hover" style={{ flex: 1, padding: '1rem', background: 'var(--naver-green)', color: 'white', fontWeight: '800', borderRadius: '12px', border: 'none' }} onClick={() => { localStorage.setItem('wizard_settings', JSON.stringify(apiKeys)); setShowSettings(false); }}>저장</button>
              <button className="button-hover glass" style={{ flex: 1, padding: '1rem', color: 'white', borderRadius: '12px' }} onClick={() => setShowSettings(false)}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default App;
