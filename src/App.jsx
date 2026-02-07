// v01.27r12
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  Send, Image as ImageIcon, Sparkles, X, Copy, Settings, Trash2,
  BookOpen, ChevronLeft, Calendar, Eye, Plus, MessageCircle,
  FileText, RotateCcw, RotateCw, MoreVertical, GripVertical, Edit3,
  Type, Quote, Minus, MapPin, Link as LinkIcon, Camera, Music, Video,
  Monitor, Tablet, Smartphone, LogOut, Star, Moon, Sun, Search, ChevronDown
} from 'lucide-react';
import './index.css';
import HomeView from './HomeView';
import { useSupabase } from './hooks/useSupabase';
import { supabase } from './supabaseClient';
import SubscriptionModal from './components/SubscriptionModal';
import SubscriptionBadge from './components/SubscriptionBadge';
import * as PortOne from '@portone/browser-sdk/v2';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import RefundPage from './pages/RefundPage';

// Constants
const GEMINI_MODEL = "gemini-2.0-flash";
const IMAGE_MAX_SIZE = 1024; // Increased from 800 for better quality
const IMAGE_QUALITY = 0.7; // Increased from 0.6 for better quality
const IMAGE_COMPRESSION_TIMEOUT = 10000; // Increased from 5000ms to 10000ms

const App = () => {
  // React Router
  const navigate = useNavigate();
  const location = useLocation();

  // Derive view from URL path
  const getViewFromPath = () => {
    if (location.pathname.startsWith('/editor/')) return 'editor';
    if (location.pathname === '/settings') return 'settings';
    if (location.pathname === '/terms') return 'terms';
    if (location.pathname === '/privacy') return 'privacy';
    if (location.pathname === '/refund') return 'refund';
    return 'home';
  };
  const view = getViewFromPath();

  // Get sessionId from URL for editor view
  const getSessionIdFromPath = () => {
    if (location.pathname.startsWith('/editor/')) {
      return location.pathname.replace('/editor/', '');
    }
    return null;
  };

  // Navigation helper (backward compatible)
  const setView = useCallback((newView, sessionId = null) => {
    if (newView === 'home') {
      navigate('/');
    } else if (newView === 'editor' && sessionId) {
      navigate(`/editor/${sessionId}`);
    } else if (newView === 'settings') {
      navigate('/settings');
    } else if (newView === 'terms') {
      navigate('/terms');
    } else if (newView === 'privacy') {
      navigate('/privacy');
    } else if (newView === 'refund') {
      navigate('/refund');
    }
  }, [navigate]);

  // Navigation & Session State
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'post'
  const currentSessionId = getSessionIdFromPath();
  const [sessions, setSessions] = useState([]);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [hasNewPostContent, setHasNewPostContent] = useState(false);
  const [inputText, setInputText] = useState('');
  const [postEditInput, setPostEditInput] = useState('');
  const [editingBlockId, setEditingBlockId] = useState(null);
  const [previewMode, setPreviewMode] = useState('pc'); // 'pc' | 'tablet' | 'mobile'
  const [aiResponsesEnabled, setAiResponsesEnabled] = useState(true);
  const [isToolbarOpen, setIsToolbarOpen] = useState(false); // Floating toolbar toggle
  const [draggedBlockIndex, setDraggedBlockIndex] = useState(null); // Drag and drop state
  const [dragOverIndex, setDragOverIndex] = useState(null); // Index being hovered over
  const [dropPosition, setDropPosition] = useState(null); // 'above' | 'below' | null
  const [previewContent, setPreviewContent] = useState(null); // Temporary reordered array for preview

  // App Global States
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiKeys, setApiKeys] = useState({
    gemini: import.meta.env.VITE_GEMINI_API_KEY || '',
  });

  // Internal Configuration
  const NAVER_CLIENT_ID = import.meta.env.VITE_NAVER_SEARCH_CLIENT_ID || 'dkky2C4u82iO24wfSQ1J';
  const NAVER_CLIENT_SECRET = import.meta.env.VITE_NAVER_SEARCH_CLIENT_SECRET || 'Kz8Iw7_Cqc';
  const [naverUser, setNaverUser] = useState(null); // { nickname, blogTitle, profileImage, etc. }
  const [isAuthChecking, setIsAuthChecking] = useState(true); // 초기 인증 상태 확인 중

  // Home View State
  const [sessionTab, setSessionTab] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);
  const [showAllChats, setShowAllChats] = useState(false);
  const [showAllPosts, setShowAllPosts] = useState(false);
  const [contextMenu, setContextMenu] = useState({ visible: false, sessionId: null, x: 0, y: 0 });
  const [isSelectMode, setIsSelectMode] = useState(false);

  // Subscription State
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(false);

  // --- Supabase Integration ---
  const {
    isSupabaseReady,
    supabaseUserId,
    fetchSessions,
    saveSessionToSupabase,
    deleteSessionFromSupabase,
    uploadImageToSupabase,
    uploadFileDirectly,
    logErrorToSupabase,
    fetchSubscriptionStatus,
    checkBlogGenerationLimit,
    incrementBlogCount,
    initiatePayment,
  } = useSupabase(naverUser);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Load Subscription Status
  const loadSubscription = useCallback(async () => {
    const data = await fetchSubscriptionStatus();
    setSubscriptionData(data);
  }, [fetchSubscriptionStatus]);

  // Load Subscription Status on mount
  useEffect(() => {
    if (isSupabaseReady && supabaseUserId) {
      loadSubscription();

      // If payment was pending, show modal after login
      if (pendingPayment) {
        setPendingPayment(false);
        setShowSubscriptionModal(true);
      }
    }
  }, [isSupabaseReady, supabaseUserId, loadSubscription, pendingPayment]);

  // Handle payment success from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      loadSubscription();
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [loadSubscription]);

  // Load Sessions from Supabase (SINGLE SOURCE OF TRUTH)
  useEffect(() => {
    if (isSupabaseReady && supabaseUserId && !isDataLoaded) {
      console.log('Fetching sessions from Supabase...');
      fetchSessions().then(async data => {
        if (data && data.length > 0) {
          console.log('Loaded', data.length, 'sessions from Supabase');
          setSessions(data);
          localStorage.removeItem('wizard_sessions'); // Clean up old localStorage
        } else {
          // Check for localStorage migration (one-time)
          const savedSessions = localStorage.getItem('wizard_sessions');
          if (savedSessions) {
            try {
              console.log('Migrating localStorage to Supabase...');
              const localSessions = JSON.parse(savedSessions);
              const migratedSessions = localSessions.map(s => ({
                ...s,
                id: crypto.randomUUID(),
                publishedAt: null
              }));

              for (const session of migratedSessions) {
                await saveSessionToSupabase(session);
              }

              setSessions(migratedSessions);
              localStorage.removeItem('wizard_sessions');
              console.log('Migration complete');
            } catch (err) {
              console.error('Migration error:', err);
              createInitialSession();
            }
          } else {
            // New user - create initial session
            createInitialSession();
          }
        }
        setIsDataLoaded(true);
      });
    }

    function createInitialSession() {
      const initialSession = {
        id: crypto.randomUUID(),
        title: '나의 첫 기록 ✍️',
        status: 'active',
        publishedAt: null,
        messages: [{
          id: crypto.randomUUID(),
          sender: 'ai',
          type: 'text',
          content: '안녕하세요! 당신의 소중한 순간을 블로그로 만들어드릴 AI 위저드입니다. 사진이나 오늘 있었던 일들을 편하게 말씀해 주세요!',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }],
        post: { title: '', content: [], tags: [] },
        createdAt: new Date().toISOString()
      };
      setSessions([initialSession]);
      saveSessionToSupabase(initialSession);
    }
  }, [isSupabaseReady, supabaseUserId, isDataLoaded]);

  // Header auto-hide on scroll (mobile-friendly)
  useEffect(() => {
    const scrollContainer = document.querySelector('.scroll-container');
    if (!scrollContainer) return;

    let ticking = false;

    const handleScroll = (e) => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = e.target.scrollTop;

          // Show header when scrolling up or at top
          if (currentScrollY < lastScrollY || currentScrollY < 10) {
            setHeaderVisible(true);
          }
          // Hide header when scrolling down (only if scrolled more than 50px)
          else if (currentScrollY > 50 && currentScrollY > lastScrollY) {
            setHeaderVisible(false);
          }

          setLastScrollY(currentScrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, activeTab, view]); // Re-attach when tab/view changes

  // Auto-save session to Supabase when it changes (debounced)
  const saveTimeoutRef = useRef(null);

  // Sessions are saved ONLY to Supabase (no localStorage backup)

  // 2. Sync to Supabase (Debounced)
  useEffect(() => {
    if (!isSupabaseReady || !supabaseUserId || !currentSessionId) return;

    const currentSession = sessions.find(s => s.id === currentSessionId);
    if (currentSession) {
      // Debounce: save after 1 second of no changes
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        saveSessionToSupabase(currentSession);
      }, 1000);
    }

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [sessions, currentSessionId, isSupabaseReady, supabaseUserId]);
  // ----------------------------
  const longPressTimer = useRef(null);

  // Cleanup longPressTimer on component unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  // Undo/Redo History for Post Editor
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const chatEndRef = useRef(null);
  const postInputRef = useRef(null);

  // Style Cloning State
  const [representativeIds, setRepresentativeIds] = useState([]);
  const [userStylePrompt, setUserStylePrompt] = useState('');
  const [isAnalyzingStyle, setIsAnalyzingStyle] = useState(false);

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Load Initial Data
  useEffect(() => {
    // Load API settings with error handling
    const savedSettings = localStorage.getItem('wizard_settings');
    if (savedSettings) {
      try {
        setApiKeys(JSON.parse(savedSettings));
      } catch (err) {
        console.error('Failed to parse saved settings:', err);
        localStorage.removeItem('wizard_settings');
      }
    }

    // Load Naver user with error handling
    const savedNaverUser = localStorage.getItem('naver_user');
    if (savedNaverUser) {
      try {
        setNaverUser(JSON.parse(savedNaverUser));
      } catch (err) {
        console.error('Failed to parse naver user:', err);
        localStorage.removeItem('naver_user');
      }
    }

    // Load representative IDs with error handling
    const savedRepIds = localStorage.getItem('wizard_representative_ids');
    if (savedRepIds) {
      try {
        setRepresentativeIds(JSON.parse(savedRepIds));
      } catch (err) {
        console.error('Failed to parse representative IDs:', err);
        localStorage.removeItem('wizard_representative_ids');
      }
    }

    // Load style prompt (no JSON parsing needed)
    const savedStylePrompt = localStorage.getItem('wizard_user_style');
    if (savedStylePrompt) setUserStylePrompt(savedStylePrompt);

    // Load theme preference
    const savedTheme = localStorage.getItem('wizard_theme');
    if (savedTheme !== null) {
      setIsDarkMode(savedTheme === 'dark');
    }

    // Sessions are loaded from Supabase after login (see useEffect above)
    // Initial empty state - will be populated after Supabase fetch

    // 초기 인증 상태 확인 완료 (localStorage 체크 후 약간의 딜레이로 Supabase 세션 복원 대기)
    const timer = setTimeout(() => setIsAuthChecking(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // Apply theme to body
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.remove('light-mode');
    } else {
      document.body.classList.add('light-mode');
    }
    localStorage.setItem('wizard_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);



  // Naver OAuth callback handler - moved after processNaverLogin definition
  const handleNaverCallback = useCallback(async (code, state) => {
    try {
      // Note: In a real production app, token exchange MUST happen on the server to avoid CORS and protect Client Secret.
      const tokenUrl = `/oauth2.0/token?grant_type=authorization_code&client_id=${NAVER_CLIENT_ID}&client_secret=${NAVER_CLIENT_SECRET}&code=${code}&state=${state}`;

      const response = await fetch(tokenUrl);
      const data = await response.json();

      if (data.access_token) {
        const profileResponse = await fetch(`/v1/nid/me`, {
          headers: { Authorization: `Bearer ${data.access_token}` }
        });
        const profileData = await profileResponse.json();

        if (profileData.response) {
          const user = {
            id: profileData.response.id, // 네이버 고유 ID (필수!)
            nickname: profileData.response.nickname,
            profileImage: profileData.response.profile_image,
            blogTitle: `${profileData.response.nickname}님의 블로그`
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
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const savedState = localStorage.getItem('naver_auth_state');

    if (code && state && state === savedState) {
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      handleNaverCallback(code, state);
    }
  }, [handleNaverCallback]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSessionId, sessions, activeTab]);

  useEffect(() => {
    localStorage.setItem('wizard_representative_ids', JSON.stringify(representativeIds));
  }, [representativeIds]);

  const toggleRepresentative = (sessionId) => {
    setRepresentativeIds(prev =>
      prev.includes(sessionId)
        ? prev.filter(id => id !== sessionId)
        : [...prev, sessionId]
    );
  };

  const currentSession = sessions.find(s => s.id === currentSessionId);

  // --- Session Management ---
  const createNewSession = () => {
    const newSession = {
      id: crypto.randomUUID(), // Use UUID for Supabase compatibility
      title: '새로운 기록 💬',
      status: 'active',
      publishedAt: null,
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
    setActiveTab('chat');
    navigate(`/editor/${newSession.id}`);
  };

  // Helper for HomeView compatibility
  const setCurrentSessionId = (sessionId) => {
    if (sessionId) {
      navigate(`/editor/${sessionId}`);
    }
  };

  const deleteSession = (e, id) => {
    e.stopPropagation();
    if (!confirm('기록을 삭제할까요?')) return;
    setSessions(sessions.filter(s => s.id !== id));
    if (currentSessionId === id) setView('home');
  };

  // Delete a single message from chat (doesn't affect post)
  const deleteMessage = (messageId) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== currentSessionId) return s;
      return { ...s, messages: s.messages.filter(m => m.id !== messageId) };
    }));
  };

  // Auto-generate title from first user message
  const generateSessionTitle = (text, type = 'text') => {
    if (type === 'image') {
      return '📷 사진 기록';
    }
    // Clean and truncate text for title
    const cleanText = text.trim().replace(/\n/g, ' ');
    if (cleanText.length <= 25) {
      return cleanText;
    }
    return cleanText.substring(0, 25) + '...';
  };

  // --- Naver Login Logic ---
  const handleNaverLogin = () => {
    const state = Math.random().toString(36).substring(7);
    localStorage.setItem('naver_auth_state', state);
    const callbackUrl = encodeURIComponent(window.location.origin);
    const authUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${NAVER_CLIENT_ID}&redirect_uri=${callbackUrl}&state=${state}`;
    window.location.href = authUrl;
  };

  const handleNaverLogout = () => {
    // 1. React state 초기화 - 다른 계정 로그인 시 이전 데이터 표시 방지
    setNaverUser(null);
    setSessions([]);
    setCurrentSessionId(null);
    setRepresentativeIds([]);
    setUserStylePrompt('');
    setIsDataLoaded(false);
    setApiKeys({ gemini: import.meta.env.VITE_GEMINI_API_KEY || '' }); // API 키 초기화

    // 2. localStorage 완전 정리
    localStorage.removeItem('naver_user');
    localStorage.removeItem('naver_auth_state');
    localStorage.removeItem('wizard_representative_ids');
    localStorage.removeItem('wizard_user_style');
    localStorage.removeItem('wizard_sessions'); // 레거시 데이터도 정리
    localStorage.removeItem('wizard_settings'); // API 키 설정 제거
    localStorage.removeItem('wizard_theme'); // 테마 설정도 초기화

    // 3. Supabase 로그아웃
    if (isSupabaseReady) {
      supabase.auth.signOut();
    }

    // 4. 홈으로 리디렉션
    navigate('/');
  };

  // --- Chat Logic ---
  const handleSendMessage = async (text, type = 'text') => {
    if (!text || (typeof text === 'string' && text.trim() === '')) return;
    if (!currentSessionId) return;

    const userMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      type: type,
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // 1. Show user message IMMEDIATELY + auto-generate title if needed
    setSessions(prev => prev.map(s => {
      if (s.id !== currentSessionId) return s;

      // Auto-generate title if still default
      const shouldUpdateTitle = s.title === '새로운 기록 💬' || s.title === '새로운 기록';
      const newTitle = shouldUpdateTitle ? generateSessionTitle(text, type) : s.title;

      return { ...s, title: newTitle, messages: [...s.messages, userMessage] };
    }));

    // 2. Then get AI response (async, non-blocking for UI)
    if (aiResponsesEnabled && apiKeys.gemini) {
      try {
        const genAI = new GoogleGenerativeAI(apiKeys.gemini);
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        const reactionPrompt = `다정한 친구이자 블로그 도우미로서 자연스러운 리액션을 해주세요. 1~2문장 정도로 부드럽게 공감해 주되, 너무 길지는 않게 답변하세요. 질문은 하지 마세요. 사용자 메시지: ${type === 'text' ? text : '[사진을 보냈습니다]'}`;
        const result = await model.generateContent(reactionPrompt);
        const aiMessage = {
          id: crypto.randomUUID(),
          sender: 'ai',
          type: 'text',
          content: result.response.text(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        // 3. Add AI response after it arrives
        setSessions(prev => prev.map(s => s.id === currentSessionId ?
          { ...s, messages: [...s.messages, aiMessage] } : s));
      } catch (err) {
        console.error('AI response error:', err);
        const errorMessage = {
          id: crypto.randomUUID(),
          sender: 'ai',
          type: 'text',
          content: '죄송합니다, 응답 생성 중 오류가 발생했습니다.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setSessions(prev => prev.map(s => s.id === currentSessionId ?
          { ...s, messages: [...s.messages, errorMessage] } : s));
      }
    }
  };

  // Compress image heavily optimized for mobile compatibility (especially iOS)
  const compressImage = (file, maxSize = IMAGE_MAX_SIZE, quality = IMAGE_QUALITY) => {
    return new Promise((resolve) => {
      // iOS Safari has a limit of ~16 megapixels for canvas
      const IOS_MAX_PIXELS = 4096 * 4096; // Safe limit for iOS

      const img = new Image();
      // Required for iOS CORS
      img.crossOrigin = 'anonymous';

      // Create URL safely
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        try {
          console.log(`Image loaded: ${img.width}x${img.height}, file type: ${file.type}`);

          // Check if image exceeds iOS limit and reduce more aggressively
          const totalPixels = img.width * img.height;
          let effectiveMaxSize = maxSize;
          if (totalPixels > IOS_MAX_PIXELS) {
            console.log('Large image detected, reducing size for iOS compatibility');
            effectiveMaxSize = Math.min(maxSize, 800); // More aggressive for large images
          }

          // If image is small enough, use original (performance optimization)
          if (img.width <= effectiveMaxSize && img.height <= effectiveMaxSize && file.size < 500 * 1024) {
            URL.revokeObjectURL(objectUrl);
            // Convert file to base64 for consistency
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => {
              console.error('FileReader error for small image');
              resolve('ERROR_SMALL_IMAGE');
            };
            reader.readAsDataURL(file);
            return;
          }

          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { willReadFrequently: true }); // Optimization hint

          if (!ctx) {
            console.error('Failed to get canvas context');
            // Fallback to FileReader
            URL.revokeObjectURL(objectUrl);
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
            return;
          }

          let { width, height } = img;

          // Aggressive resizing for mobile (use effectiveMaxSize for iOS compatibility)
          if (width > height && width > effectiveMaxSize) {
            height = (height * effectiveMaxSize) / width;
            width = effectiveMaxSize;
          } else if (height > effectiveMaxSize) {
            width = (width * effectiveMaxSize) / height;
            height = effectiveMaxSize;
          }

          // Round dimensions to integers (required for canvas)
          width = Math.round(width);
          height = Math.round(height);

          canvas.width = width;
          canvas.height = height;

          // Clear canvas to prevent black background transparency issues
          ctx.clearRect(0, 0, width, height);

          // Draw with white background first (for HEIC/transparent images)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Force JPEG to avoid transparency issues rendering as black
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          console.log(`Compressed to ${width}x${height}, data length: ${compressedDataUrl.length}`);

          URL.revokeObjectURL(objectUrl);
          resolve(compressedDataUrl);
        } catch (err) {
          console.error("Compression Canvas Error:", err);
          // Fallback: Just try to read original file as DataURL
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(file);
        }
      };

      img.onerror = (err) => {
        console.error("Image Load Error:", err);
        // Fallback: Read original file as base64 directly
        URL.revokeObjectURL(objectUrl);
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target.result) {
            resolve(e.target.result);
          } else {
            console.error('FileReader returned empty result');
            resolve('ERROR_LOADING_IMAGE');
          }
        };
        reader.onerror = () => {
          console.error('FileReader error in onerror fallback');
          resolve('ERROR_LOADING_IMAGE');
        };
        reader.readAsDataURL(file);
      };

      img.src = objectUrl;
    });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // iOS detection for better error handling
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    console.log('[iOS Debug] Device:', isIOS ? 'iOS' : 'Other', 'UserAgent:', navigator.userAgent);

    for (const file of files) {
      try {
        console.log(`[Upload] Start: ${file.name} (${file.type}, ${file.size} bytes)`);
        console.log('[Upload] Supabase ready:', isSupabaseReady, 'userId:', supabaseUserId);

        let imageUrl = null;

        // Strategy 1: Try direct file upload first (most reliable for iOS)
        // Skip compression entirely - Supabase handles it well
        console.log('[Upload] Trying direct upload (Strategy 1)...');
        imageUrl = await uploadFileDirectly(file);

        if (imageUrl) {
          console.log('[Upload] Direct upload SUCCESS:', imageUrl);
          handleSendMessage(imageUrl, 'image');
          continue; // Success, move to next file
        }

        // Strategy 2: If direct upload failed, try compressed base64 approach
        console.log('[Upload] Direct upload failed, trying compressed upload (Strategy 2)...');

        const timeoutPromise = new Promise(resolve =>
          setTimeout(() => {
            console.warn("[Upload] Compression timeout");
            resolve('ERROR_TIMEOUT');
          }, IMAGE_COMPRESSION_TIMEOUT)
        );

        const compressedImage = await Promise.race([
          compressImage(file, IMAGE_MAX_SIZE, IMAGE_QUALITY),
          timeoutPromise
        ]);

        console.log('[Upload] Compression result:', compressedImage ?
          (compressedImage.startsWith('data:') ? `OK (${compressedImage.length} chars)` : compressedImage)
          : 'null');

        if (compressedImage && compressedImage !== 'ERROR_LOADING_IMAGE' &&
            compressedImage !== 'ERROR_TIMEOUT' && compressedImage.startsWith('data:')) {
          imageUrl = await uploadImageToSupabase(compressedImage);

          if (imageUrl) {
            console.log('[Upload] Compressed upload SUCCESS:', imageUrl);
            handleSendMessage(imageUrl, 'image');
            continue;
          }
        }

        // Both strategies failed - log to Supabase for remote debugging
        console.error('[Upload] All strategies failed');
        const errorDetails = {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          isSupabaseReady,
          supabaseUserId: supabaseUserId ? 'exists' : 'null',
          isIOS,
          compressedResult: compressedImage ? compressedImage.substring(0, 100) : 'null'
        };
        console.error('[Upload] Error details:', errorDetails);

        // Save error to Supabase for remote debugging
        await logErrorToSupabase('IMAGE_UPLOAD_FAILED', 'Both direct and compressed upload strategies failed', errorDetails);

        if (isIOS) {
          alert('iOS에서 이미지 업로드에 실패했습니다.\n\n해결 방법:\n1. Safari 설정 > 개인정보 보호에서 "크로스 사이트 추적 방지" 끄기\n2. 앱을 다시 로그인\n3. 다른 이미지로 시도');
        } else {
          alert('이미지 업로드에 실패했습니다. 다시 시도해주세요.');
        }
      } catch (err) {
        console.error('[Upload] Exception:', err.message, err);
        await logErrorToSupabase('IMAGE_UPLOAD_EXCEPTION', err.message, {
          stack: err.stack,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size
        });
        alert('사진을 불러오는데 실패했습니다. 다시 시도해주세요.');
      }
    }
    e.target.value = '';
  };

  // --- Style Analysis Logic ---
  const analyzeUserStyle = async () => {
    if (!apiKeys.gemini) { alert('서비스 설정 오류: API 키가 구성되지 않았습니다.'); return; }

    // 대표글로 지정된 세션의 본문 텍스트 추출
    const repSessions = sessions.filter(s => representativeIds.includes(s.id));
    const validRefs = repSessions.map(s =>
      s.post.content.filter(b => b.type === 'text').map(b => b.value).join('\n')
    ).filter(text => text.trim().length > 50);

    if (validRefs.length === 0) {
      alert('분석할 대표글을 최소 1개 이상 지정해주세요. (홈 화면의 발행한 글 섹션에서 별 아이콘 클릭)');
      return;
    }

    setIsAnalyzingStyle(true);
    try {
      const genAI = new GoogleGenerativeAI(apiKeys.gemini);
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

      const prompt = `
당신은 최고의 문체 분석가입니다. 다음 텍스트들은 사용자가 직접 쓴 블로그 글입니다.
이 사용자의 **고유한 글쓰기 스타일(Tone & Manner)**을 심층 분석해서 '스타일 가이드'를 작성해주세요.

[분석 포인트]
1. **어조**: (예: ~해요, ~합니다, ~했음 등 종결어미의 특징)
2. **감정 표현**: (담백한지, 감성적인지, 유머러스한지)
3. **포맷**: (줄바꿈 간격, 문단 길이, 이모지 사용 빈도 및 종류)
4. **특이사항**: (자주 쓰는 단어, 강조 방식)

[입력 텍스트]
${validRefs.map((t, i) => `--- 글 #${i + 1} ---\n${t}`).join('\n\n')}

[출력 형식]
다른 AI가 이 가이드만 보고도 사용자의 스타일을 완벽히 모사할 수 있도록 구체적인 지시문을 작성하세요. (단, 분석 결과만 출력하고 부가적인 말은 하지 마세요)`;

      const result = await model.generateContent(prompt);
      const styleGuide = result.response.text();

      setUserStylePrompt(styleGuide);
      localStorage.setItem('wizard_user_style', styleGuide);

      alert('✅ 스타일 분석이 완료되었습니다! 이제부터 AI가 회원님의 말투를 따라합니다.');
    } catch (err) {
      console.error('Style analysis failed:', err);
      alert('스타일 분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzingStyle(false);
    }
  };


  // --- Blog Generation ---
  const generateBlogPost = async () => {
    // Check subscription limit FIRST
    const limitCheck = await checkBlogGenerationLimit();
    if (!limitCheck.allowed) {
      setShowSubscriptionModal(true);
      return;
    }

    if (!apiKeys.gemini) { alert('서비스 설정 오류: API 키가 구성되지 않았습니다.'); return; }
    if (!currentSession) { alert('세션을 불러오는 중입니다. 잠시 후 다시 시도해주세요.'); return; }
    setIsGenerating(true);
    try {
      const genAI = new GoogleGenerativeAI(apiKeys.gemini);
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const userMessages = currentSession.messages.filter(m => m.sender === 'user');
      const chatSummary = userMessages.map(m => m.type === 'text' ? `[TEXT]: ${m.content}` : `[IMAGE]`).join('\n');

      const prompt = `
당신은 '나(사용자)'의 입장에서 기록을 정리해주는 **나의 분신**입니다.
가장 중요한 원칙은 **"진실성 있는 경험(Authenticity)"**입니다.
AI가 쓴 티가 나는 "정보성 어투(~에 대해 알아봅시다)"나 "기계적인 텐션"은 절대 금지입니다. 🚫

${userStylePrompt ? `
[⭐⭐⭐ 특별 지시: 사용자 스타일 적용 ⭐⭐⭐]
다음은 사용자의 평소 글쓰기 스타일입니다. 이 스타일을 **반드시** 따르세요.
${userStylePrompt}
` : `
[작성 원칙]
1. **나의 이야기로 쓰세요**: 제 3자가 설명하는 글이 아니라, 내가 직접 겪고 느낀 것처럼 **1인칭 시점**("저", "제가")으로 쓰세요.
2. **팩트에 감성을 더하세요**: 
   - ✖️ "커피를 마셨습니다. 맛있었습니다." (너무 딱딱함)
   - ✖️ "최고급 원두의 황홀한 맛이 혀끝을 감쌌습니다." (없는 사실/과장 금지)
   - ⭕️ "오랜만에 따뜻한 커피 한 잔 마시니 마음까지 차분해지는 기분이었어요. ☕️" (팩트+자연스러운 감정)
3. **간단한 메모도 정성스럽게**: 사용자가 "친구랑 밥 먹음"이라고만 해도, "좋은 사람과 함께하는 한 끼는 언제나 즐겁죠."처럼 문맥을 부드럽게 이어주세요.
`}
4. **구성**:
   - 억지스러운 서론/결론 배제.
   - 자연스러운 흐름으로 이어지게.

다음 대화 내용을 바탕으로 블로그 포스트를 JSON 형식으로 작성하세요.
형식: { "title": "꾸미지 않은 듯 감각적인 제목", "content_blocks": ["(소제목 선택사항) 문단1", "문단2", ...], "tags": ["태그1", "태그2"] }

대화 내용:
${chatSummary}`;

      const result = await model.generateContent(prompt);
      let text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) text = jsonMatch[0].replace(/```json/g, '').replace(/```/g, '').trim();

      // Parse and validate JSON response
      let data;
      try {
        data = JSON.parse(text);
        // Validate required fields
        if (!data.title || !Array.isArray(data.content_blocks) || !Array.isArray(data.tags)) {
          throw new Error('AI 응답 형식이 올바르지 않습니다.');
        }
      } catch (parseErr) {
        console.error('Failed to parse AI response:', parseErr);
        alert('AI 응답 형식이 올바르지 않습니다. 다시 시도해주세요.');
        return;
      }

      const chatImages = userMessages.filter(m => m.type === 'image');
      const finalContent = [];

      data.content_blocks.forEach((textVal, idx) => {
        finalContent.push({ id: `text-${Date.now()}-${idx}`, type: 'text', value: textVal });

        // Add image only if available and not repeated
        if (idx < chatImages.length) {
          finalContent.push({
            id: `img-${Date.now()}-${idx}`,
            type: 'image',
            value: chatImages[idx].content
          });
        }
      });

      // Append remaining images if any
      if (chatImages.length > data.content_blocks.length) {
        for (let i = data.content_blocks.length; i < chatImages.length; i++) {
          finalContent.push({
            id: `img-${Date.now()}-${i}`,
            type: 'image',
            value: chatImages[i].content
          });
        }
      }

      const newPost = { title: data.title, content: finalContent, tags: data.tags };

      // Create system message
      const systemMsg = {
        id: Date.now() + 2,
        sender: 'ai',
        type: 'text',
        content: '✨ 정리 완료! 입력하신 내용을 바탕으로 글을 다듬었습니다.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      // Update sessions with new post AND system message in one go
      const finalSessions = sessions.map(s =>
        s.id === currentSessionId
          ? { ...s, post: newPost, title: data.title, messages: [...s.messages, systemMsg] }
          : s
      );

      // State updates
      setSessions(finalSessions);
      setHasNewPostContent(true);
      pushToHistory(newPost);

      // Increment blog count after successful generation
      await incrementBlogCount();

      // Note: localStorage saving is handled automatically by the useEffect hook
    } catch (err) {
      console.error('Blog generation error:', err);
      alert(`블로그 생성 오류: ${err.message || '알 수 없는 오류가 발생했습니다.'}`);
    } finally { setIsGenerating(false); }
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
    // Use structuredClone if available, fallback to JSON parse/stringify
    const clonedPost = typeof structuredClone !== 'undefined'
      ? structuredClone(post)
      : JSON.parse(JSON.stringify(post));
    newHistory.push(clonedPost);
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

  // Drag and Drop handlers
  const resetDragState = () => {
    setDraggedBlockIndex(null);
    setDragOverIndex(null);
    setDropPosition(null);
    setPreviewContent(null);
  };

  const handleDragStart = (e, index) => {
    setDraggedBlockIndex(index);
    setPreviewContent([...currentSession.post.content]);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnter = (e, index) => {
    e.preventDefault();
    if (draggedBlockIndex === null || draggedBlockIndex === index) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const mouseY = e.clientY;
    const blockMiddle = rect.top + rect.height / 2;

    setDragOverIndex(index);
    setDropPosition(mouseY < blockMiddle ? 'above' : 'below');
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggedBlockIndex === null || draggedBlockIndex === index) return;

    // Calculate drop position
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseY = e.clientY;
    const blockMiddle = rect.top + rect.height / 2;
    const newPosition = mouseY < blockMiddle ? 'above' : 'below';

    if (newPosition !== dropPosition || index !== dragOverIndex) {
      setDropPosition(newPosition);
      setDragOverIndex(index);

      // Generate preview array
      const content = [...currentSession.post.content];
      const draggedBlock = content[draggedBlockIndex];

      let targetIndex = index;
      if (newPosition === 'below' && index < draggedBlockIndex) targetIndex++;
      if (newPosition === 'above' && index > draggedBlockIndex) targetIndex--;

      const preview = [...content];
      preview.splice(draggedBlockIndex, 1);
      preview.splice(targetIndex, 0, draggedBlock);

      setPreviewContent(preview);
    }
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedBlockIndex === null) return;

    const finalContent = previewContent || [...currentSession.post.content];

    const updatedPost = { ...currentSession.post, content: finalContent };
    setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, post: updatedPost } : s));
    pushToHistory(updatedPost);

    resetDragState();
  };

  const handleDragEnd = (e) => {
    resetDragState();
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
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const currentPost = currentSession?.post;

      // Add null check for currentPost
      if (!currentPost || !currentPost.content) {
        console.error('Post data not available');
        throw new Error('포스트 데이터를 찾을 수 없습니다.');
      }

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
    } catch (err) {
      console.error('Edit request error:', err);
      alert(err.message || '수정 중 오류가 발생했습니다. 다시 시도해주세요.');
      // Remove the user message on error
      setSessions(prev => prev.map(s => s.id === currentSessionId ?
        { ...s, messages: s.messages.slice(0, -1) } : s));
    } finally {
      setEditingBlockId(null);
      setIsEditing(false);
    }
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

  const InternalHomeView = () => { // Deprecated: Moved to HomeView.jsx
    // 1. Data Prep
    const published = sessions.filter(s => s.status === 'published');
    const active = sessions.filter(s => s.status === 'active');

    // 2. Search Logic
    const allSessions = [...active, ...published];
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const searchResults = normalizedQuery
      ? allSessions.filter(s => s.title.toLowerCase().includes(normalizedQuery) || s.messages.some(m => m.content && m.content.toLowerCase().includes(normalizedQuery)))
      : [];

    // 3. Determine List to Show
    let targetList = [];
    if (normalizedQuery) {
      targetList = searchResults;
    } else {
      targetList = sessionTab === 'active' ? active : published;
    }

    // 4. Pagination (Load More)
    const visibleList = targetList.slice(0, visibleCount);
    const hasMore = visibleList.length < targetList.length;

    // 5. Handlers
    const handleTabChange = (tab) => {
      setSessionTab(tab);
      setVisibleCount(5);
      setIsSearchOpen(false);
      setSearchQuery('');
    };

    return (
      <div className="reveal" style={{ padding: '1rem 1.2rem', height: '100%', overflowY: 'auto', paddingBottom: '160px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Compact Header */}
        <div style={{ marginBottom: '1.5rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '0.8rem' }}>
          <img src={naverUser.profileImage || 'https://via.placeholder.com/40'} style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid var(--naver-green)' }} alt="profile" />
          <div style={{ textAlign: 'left' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)', display: 'block' }}>안녕하세요,</span>
            <h1 className="premium-gradient" style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>{naverUser.blogTitle}님</h1>
          </div>
        </div>

        {/* Tab & Search Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: '850px', marginBottom: '1.5rem', height: '46px', position: 'relative' }}>

          {/* A. Search Bar (Expanded) */}
          <div style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-card)',
            borderRadius: '12px',
            padding: '0 0.5rem',
            gap: '0.5rem',
            opacity: isSearchOpen ? 1 : 0,
            pointerEvents: isSearchOpen ? 'auto' : 'none',
            transform: isSearchOpen ? 'scale(1)' : 'scale(0.95)',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            border: '1px solid var(--naver-green)',
            zIndex: 10,
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            <Search size={18} color="var(--naver-green)" />
            <input
              autoFocus={isSearchOpen}
              placeholder="글 제목, 내용 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.95rem', outline: 'none' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex' }}><X size={16} /></button>
            )}
            <button
              onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: 'var(--text-dim)', cursor: 'pointer', padding: '6px 12px', fontSize: '0.8rem', fontWeight: '600', whiteSpace: 'nowrap' }}
            >
              닫기
            </button>
          </div>

          {/* B. Tabs (Hidden when search is open) */}
          <div style={{
            display: 'flex',
            width: '100%',
            opacity: isSearchOpen ? 0 : 1,
            transition: 'opacity 0.2s',
            pointerEvents: isSearchOpen ? 'none' : 'auto',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}>
            <button
              onClick={() => handleTabChange('active')}
              style={{
                flex: 1,
                padding: '0.8rem',
                background: 'transparent',
                border: 'none',
                borderBottom: sessionTab === 'active' ? '2px solid var(--naver-green)' : '2px solid transparent',
                color: sessionTab === 'active' ? 'var(--text-main)' : 'var(--text-dim)',
                fontSize: '0.95rem',
                fontWeight: sessionTab === 'active' ? '800' : '500',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              작성 중 ({active.length})
            </button>
            <button
              onClick={() => handleTabChange('published')}
              style={{
                flex: 1,
                padding: '0.8rem',
                background: 'transparent',
                border: 'none',
                borderBottom: sessionTab === 'published' ? '2px solid var(--naver-green)' : '2px solid transparent',
                color: sessionTab === 'published' ? 'var(--text-main)' : 'var(--text-dim)',
                fontSize: '0.95rem',
                fontWeight: sessionTab === 'published' ? '800' : '500',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              발행됨 ({published.length})
            </button>

            {/* Search Trigger Button */}
            <button
              className="button-hover"
              onClick={() => { setIsSearchOpen(true); setVisibleCount(5); }}
              style={{
                padding: '0 1rem',
                background: 'transparent',
                border: 'none',
                borderBottom: '2px solid transparent',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Search size={20} />
            </button>
          </div>
        </div>

        {/* List Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', width: '100%', maxWidth: '850px' }}>

          {/* Empty States */}
          {targetList.length === 0 && (
            <div className="glass" style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-dim)', borderRadius: '16px' }}>
              {normalizedQuery ? (
                <p style={{ fontSize: '0.9rem' }}>'{searchQuery}'에 대한 검색 결과가 없습니다.</p>
              ) : sessionTab === 'active' ? (
                <>
                  <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>작성 중인 글이 없습니다.</p>
                  <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>아래 + 버튼을 눌러 새로운 글을 써보세요!</p>
                </>
              ) : (
                <p style={{ fontSize: '0.9rem' }}>아직 발행된 글이 없습니다.</p>
              )}
            </div>
          )}

          {/* List Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {visibleList.map(s => (
              <div
                key={s.id}
                className="session-item reveal glass"
                style={{
                  padding: '0.8rem',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.8rem',
                  border: s.status === 'published' && representativeIds.includes(s.id) ? '1px solid rgba(255, 215, 0, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all 0.2s ease',
                  backgroundColor: 'var(--glass)'
                }}
                onClick={() => { setActiveTab(s.status === 'published' ? 'post' : 'chat'); navigate(`/editor/${s.id}`); }}
                onTouchStart={(e) => {
                  if (s.status === 'published') {
                    longPressTimer.current = setTimeout(() => {
                      const rect = e.target.getBoundingClientRect();
                      setContextMenu({ visible: true, sessionId: s.id, x: rect.left + rect.width / 2, y: rect.top });
                    }, 500);
                  }
                }}
                onTouchEnd={() => clearTimeout(longPressTimer.current)}
                onTouchCancel={() => clearTimeout(longPressTimer.current)}
                onContextMenu={(e) => {
                  if (s.status === 'published') {
                    e.preventDefault();
                    setContextMenu({ visible: true, sessionId: s.id, x: e.clientX, y: e.clientY });
                  }
                }}
              >
                <div style={{ background: s.status === 'published' && representativeIds.includes(s.id) ? 'rgba(255, 215, 0, 0.15)' : 'rgba(3, 199, 90, 0.1)', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {s.status === 'active' ? <MessageCircle size={18} color="var(--naver-green)" /> :
                    representativeIds.includes(s.id) ? <Star size={18} color="#FFD700" fill="#FFD700" /> : <BookOpen size={18} color="var(--naver-green)" />}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '0.2rem', color: 'var(--text-main)' }}>{s.title}</h3>
                  {s.status === 'active' ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.messages[s.messages.length - 1]?.content}</p>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(s.publishedAt).toLocaleDateString()}</span>
                      {representativeIds.includes(s.id) && <span style={{ fontSize: '0.7rem', color: '#FFD700', background: 'rgba(255, 215, 0, 0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: '500' }}>대표글</span>}
                    </div>
                  )}
                </div>

                {s.status === 'active' && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(s.createdAt).toLocaleDateString([], { month: 'numeric', day: 'numeric' })}</span>}
              </div>
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <button
              className="button-hover"
              onClick={() => setVisibleCount(prev => prev + 5)}
              style={{
                width: '100%',
                padding: '1rem',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--glass-border)',
                borderRadius: '16px',
                color: 'var(--text-dim)',
                fontWeight: '700',
                marginTop: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: 'pointer'
              }}
            >
              더 보기 <ChevronDown size={16} />
            </button>
          )}

        </div>

        {/* Context Menu Popup */}
        {contextMenu.visible && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)'
            }}
            onClick={() => setContextMenu({ visible: false, sessionId: null, x: 0, y: 0 })}
          >
            <div
              className="glass-heavy"
              style={{
                padding: '0.8rem',
                borderRadius: '16px',
                minWidth: '180px',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: '0.4rem 0.6rem', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                {sessions.find(s => s.id === contextMenu.sessionId)?.title || '선택된 글'}
              </div>
              <button
                className="button-hover"
                onClick={() => {
                  toggleRepresentative(contextMenu.sessionId);
                  setContextMenu({ visible: false, sessionId: null, x: 0, y: 0 });
                }}
                style={{
                  width: '100%',
                  padding: '0.7rem 0.8rem',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  textAlign: 'left'
                }}
              >
                <Star size={16} color="#FFD700" fill={representativeIds.includes(contextMenu.sessionId) ? '#FFD700' : 'none'} />
                {representativeIds.includes(contextMenu.sessionId) ? '대표글 해제' : '대표글로 설정'}
              </button>
              <button
                className="button-hover"
                onClick={() => {
                  if (confirm('이 글을 삭제하시겠습니까?')) {
                    setSessions(prev => prev.filter(s => s.id !== contextMenu.sessionId));
                    setRepresentativeIds(prev => prev.filter(id => id !== contextMenu.sessionId));
                  }
                  setContextMenu({ visible: false, sessionId: null, x: 0, y: 0 });
                }}
                style={{
                  width: '100%',
                  padding: '0.7rem 0.8rem',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#ef4444',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  textAlign: 'left'
                }}
              >
                <Trash2 size={16} />
                삭제
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const LoginView = () => {
    const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [authError, setAuthError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // 이메일 검증
    const validateEmail = (email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    // 비밀번호 강도 검증
    const validatePassword = (password) => {
      const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
      return passwordRegex.test(password);
    };

    // 이메일 로그인
    const handleEmailLogin = async () => {
      setAuthError('');
      setIsLoading(true);

      if (!validateEmail(email)) {
        setAuthError('올바른 이메일 형식이 아닙니다');
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        // 이메일 로그인 사용자도 naverUser 설정 (앱 진입용)
        const emailUser = {
          id: data.user.id,
          nickname: data.user.user_metadata?.nickname || data.user.user_metadata?.username || email.split('@')[0],
          profileImage: null,
          blogTitle: `${data.user.user_metadata?.nickname || email.split('@')[0]}님의 블로그`
        };
        setNaverUser(emailUser);
        localStorage.setItem('naver_user', JSON.stringify(emailUser));

        setIsLoading(false);
      } catch (error) {
        console.error('로그인 에러:', error);
        if (error.message.includes('Invalid login credentials')) {
          setAuthError('이메일 또는 비밀번호가 잘못되었습니다');
        } else {
          setAuthError(error.message || '로그인에 실패했습니다');
        }
        setIsLoading(false);
      }
    };

    // 이메일 회원가입
    const handleEmailSignUp = async () => {
      setAuthError('');
      setIsLoading(true);

      if (!validateEmail(email)) {
        setAuthError('올바른 이메일 형식이 아닙니다');
        setIsLoading(false);
        return;
      }

      if (!validatePassword(password)) {
        setAuthError('비밀번호는 최소 8자, 영문과 숫자를 포함해야 합니다');
        setIsLoading(false);
        return;
      }

      if (password !== passwordConfirm) {
        setAuthError('비밀번호가 일치하지 않습니다');
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: { username: email.split('@')[0] }
          }
        });

        if (error) throw error;

        // profiles 테이블 생성
        const userId = data.user?.id;
        if (userId) {
          await supabase.from('profiles').upsert({
            id: userId,
            naver_id: null,
            username: email.split('@')[0],
            avatar_url: null,
            blog_title: null,
            updated_at: new Date()
          });

          // 회원가입 사용자도 naverUser 설정 (앱 진입용)
          const emailUser = {
            id: userId,
            nickname: email.split('@')[0],
            profileImage: null,
            blogTitle: `${email.split('@')[0]}님의 블로그`
          };
          setNaverUser(emailUser);
          localStorage.setItem('naver_user', JSON.stringify(emailUser));
        }

        setIsLoading(false);
      } catch (error) {
        console.error('회원가입 에러:', error);
        if (error.message.includes('already registered')) {
          setAuthError('이미 가입된 이메일입니다');
        } else {
          setAuthError(error.message || '회원가입에 실패했습니다');
        }
        setIsLoading(false);
      }
    };

    return (
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

          {/* 네이버 로그인 버튼 */}
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

          {/* 구분선 */}
          <div style={{ display: 'flex', alignItems: 'center', margin: '2rem 0 1.5rem', gap: '1rem' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              또는 이메일로 계속하기
            </span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
          </div>

          {/* 이메일 입력 */}
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '1rem',
              color: 'white',
              fontSize: '0.95rem',
              marginBottom: '0.8rem',
              outline: 'none'
            }}
          />

          {/* 비밀번호 입력 */}
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '1rem',
              color: 'white',
              fontSize: '0.95rem',
              marginBottom: authMode === 'signup' ? '0.8rem' : '0',
              outline: 'none'
            }}
          />

          {/* 회원가입 모드: 비밀번호 확인 */}
          {authMode === 'signup' && (
            <input
              type="password"
              placeholder="비밀번호 확인"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '1rem',
                color: 'white',
                fontSize: '0.95rem',
                outline: 'none'
              }}
            />
          )}

          {/* 에러 메시지 */}
          {authError && (
            <p style={{
              color: '#ef4444',
              fontSize: '0.8rem',
              marginTop: '0.8rem',
              textAlign: 'left'
            }}>
              {authError}
            </p>
          )}

          {/* 로그인/회원가입 버튼 */}
          <button
            onClick={authMode === 'login' ? handleEmailLogin : handleEmailSignUp}
            disabled={isLoading}
            style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              padding: '1rem',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              fontWeight: '700',
              fontSize: '0.95rem',
              marginTop: '1rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1
            }}
          >
            {isLoading
              ? (authMode === 'login' ? '로그인 중...' : '회원가입 중...')
              : (authMode === 'login' ? '로그인' : '회원가입')}
          </button>

          {/* 모드 전환 */}
          <p style={{
            marginTop: '1.5rem',
            fontSize: '0.85rem',
            color: 'var(--text-dim)'
          }}>
            {authMode === 'login'
              ? '계정이 없으신가요? '
              : '이미 계정이 있으신가요? '}
            <span
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              style={{
                color: 'var(--naver-green)',
                cursor: 'pointer',
                fontWeight: '700'
              }}
            >
              {authMode === 'login' ? '회원가입' : '로그인'}
            </span>
          </p>

          <div style={{ marginTop: '2rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            AI 기반 자동 블로그 글 생성 도구
          </div>
        </div>
      </div>
    );
  };

  const settingsView = (
    <div className="reveal" style={{ padding: '2rem 1.5rem', height: '100%', overflowY: 'auto', paddingBottom: '160px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '600px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
          <button onClick={() => setView('home')} className="button-hover glass" style={{ padding: '0.4rem', borderRadius: '50%', color: 'white', border: 'none', display: 'flex' }}>
            <ChevronLeft size={18} />
          </button>
          <h1 style={{ fontSize: '1.3rem', fontWeight: '900', margin: 0 }}>서비스 설정</h1>
        </div>

        {/* Theme Toggle Section */}
        <section className="glass" style={{ padding: '1.2rem', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {isDarkMode ? <Moon size={16} color="var(--naver-green)" /> : <Sun size={16} color="var(--naver-green)" />}
              <h2 style={{ fontSize: '1rem', fontWeight: '800', margin: 0 }}>화면 테마</h2>
            </div>
            <div
              onClick={() => setIsDarkMode(!isDarkMode)}
              style={{
                width: '52px',
                height: '28px',
                backgroundColor: isDarkMode ? 'var(--naver-green)' : 'rgba(0,0,0,0.2)',
                borderRadius: '100px',
                position: 'relative',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isDarkMode ? '0 0 12px rgba(3, 199, 90, 0.25)' : 'none'
              }}
            >
              <div style={{
                position: 'absolute',
                top: '3px',
                left: isDarkMode ? '27px' : '3px',
                width: '22px',
                height: '22px',
                backgroundColor: 'white',
                borderRadius: '50%',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                {isDarkMode ? <Moon size={12} color="var(--naver-green)" /> : <Sun size={12} color="#f59e0b" />}
              </div>
            </div>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.6rem', lineHeight: '1.4' }}>
            {isDarkMode ? '다크 모드가 적용 중입니다.' : '라이트 모드가 적용 중입니다.'}
          </p>
        </section>

        {/* Style Learning Section */}
        <section className="glass" style={{ padding: '1.2rem', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Edit3 size={16} color="var(--naver-green)" />
              <h2 style={{ fontSize: '1rem', fontWeight: '800', margin: 0 }}>내 스타일 학습시키기</h2>
            </div>
            {userStylePrompt && <span style={{ fontSize: '0.65rem', color: 'var(--naver-green)', background: 'rgba(3,199,90,0.1)', padding: '2px 8px', borderRadius: '100px', fontWeight: '700' }}>학습 완료</span>}
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '1.2rem', lineHeight: '1.5' }}>
            나의 문체가 잘 드러나는 발행글을 대표글로 지정해주세요. <br />
            AI가 해당 글들을 분석하여 회원님의 말투로 글을 작성해드립니다.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {sessions.filter(s => representativeIds.includes(s.id)).length === 0 ? (
              <div className="glass" style={{ padding: '1.5rem 1rem', textAlign: 'center', color: 'var(--text-dim)', borderRadius: '14px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <p style={{ fontSize: '0.8rem', margin: 0, lineHeight: '1.5' }}>
                  아직 지정된 대표글이 없습니다.<br />
                  <span style={{ color: 'var(--naver-green)', fontWeight: '700' }}>홈 화면의 '발행한 글'</span>에서 별 아이콘을 눌러 지정해주세요.
                </p>
              </div>
            ) : (
              sessions.filter(s => representativeIds.includes(s.id)).map(s => (
                <div key={s.id} className="session-item glass button-hover" style={{ padding: '0.7rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.6rem', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }} onClick={() => { setActiveTab('post'); navigate(`/editor/${s.id}`); }}>
                  <div style={{ background: 'rgba(3, 199, 90, 0.1)', width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <BookOpen size={14} color="var(--naver-green)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '0.1rem', color: 'white' }}>{s.title}</h3>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(s.publishedAt).toLocaleDateString()} 발행</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRepresentative(s.id);
                    }}
                    style={{ background: 'transparent', border: 'none', color: '#FFD700', padding: '0.3rem', display: 'flex' }}
                  >
                    <Star size={14} fill="#FFD700" />
                  </button>
                </div>
              ))
            )}
          </div>

          <button
            onClick={analyzeUserStyle}
            className="button-hover"
            disabled={isAnalyzingStyle}
            style={{
              width: '100%',
              marginTop: '1.2rem',
              padding: '0.9rem',
              background: isAnalyzingStyle ? 'rgba(255,255,255,0.05)' : 'var(--naver-green)',
              color: 'white',
              fontWeight: '900',
              borderRadius: '14px',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: !isAnalyzingStyle ? '0 6px 20px rgba(3, 199, 90, 0.2)' : 'none',
              fontSize: '0.9rem'
            }}
          >
            {isAnalyzingStyle ? (
              '스타일 분석 중...'
            ) : (
              <>
                <Sparkles size={16} />
                {userStylePrompt ? '스타일 다시 분석하기' : '내 스타일 분석 시작하기'}
              </>
            )}
          </button>
        </section>

        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.6rem' }}>
          <button
            className="button-hover glass"
            style={{ flex: 1, padding: '0.9rem', color: 'white', borderRadius: '14px', fontWeight: '800', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.85rem' }}
            onClick={() => setView('home')}
          >
            홈으로 돌아가기
          </button>
          <button
            className="button-hover"
            style={{
              flex: 1.5,
              padding: '0.9rem',
              background: 'white',
              color: 'black',
              fontWeight: '900',
              borderRadius: '14px',
              border: 'none',
              fontSize: '0.9rem'
            }}
            onClick={() => {
              alert('설정이 안전하게 저장되었습니다.');
              setView('home');
            }}
          >
            설정 저장하기
          </button>
        </div>
      </div>
    </div>
  );

  // 초기 인증 체크 중에는 빈 화면 (깜빡임 방지)
  if (isAuthChecking) return <div style={{ height: '100vh', backgroundColor: 'var(--bg-dark)' }} />;

  if (!naverUser && !isSupabaseReady) return <LoginView />;

  return (
    <div className="app-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-dark)' }}>
      <header className="glass" style={{ margin: '0.6rem', padding: '0.5rem 0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '12px', zIndex: 100, position: 'sticky', top: 0, backgroundColor: 'var(--bg-dark)', transform: headerVisible ? 'translateY(0)' : 'translateY(-120%)', transition: 'transform 0.3s ease-in-out' }}>
        <div
          className="button-hover"
          onClick={() => setView('home')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
        >
          <div style={{ background: 'var(--naver-green)', width: '26px', height: '26px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><Sparkles size={14} fill="white" /></div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
            <h1 className="premium-gradient" style={{ fontWeight: '900', fontSize: '1rem', letterSpacing: '-0.5px', margin: 0 }}>TalkLog</h1>
            <span className="version-badge" style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontWeight: '600' }}>01.30</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          {subscriptionData && (
            <div
              className="subscription-badge-wrapper"
              onClick={() => setShowSubscriptionModal(true)}
              style={{
                cursor: 'pointer',
                transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
              title="무제한으로 계속하기"
            >
              <SubscriptionBadge
                tier={subscriptionData.tier}
                count={subscriptionData.blogCount}
                limit={30}
              />
            </div>
          )}
          {naverUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '16px' }}>
              <img src={naverUser.profileImage || '/default-avatar.svg'} style={{ width: '20px', height: '20px', borderRadius: '50%' }} alt="profile" />
              <span className="mobile-hide-text" style={{ fontSize: '0.75rem', color: 'white', fontWeight: 'bold' }}>{naverUser.nickname}</span>
              <button
                onClick={handleNaverLogout}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '0.65rem', cursor: 'pointer', padding: '0 2px', display: 'flex', alignItems: 'center', gap: '2px' }}
                title="로그아웃"
              >
                <LogOut size={12} /> <span className="mobile-hide-text">로그아웃</span>
              </button>
            </div>
          )}
          {view !== 'home' && (
            <button className="glass button-hover" onClick={() => setView('home')} style={{ padding: '0.35rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'white', borderRadius: '10px' }}>
              <ChevronLeft size={14} /> <span className="mobile-hide-text" style={{ fontSize: '0.75rem' }}>홈으로</span>
            </button>
          )}
          <button className="glass button-hover" onClick={() => setView('settings')} style={{ padding: '0.35rem', color: view === 'settings' ? 'var(--naver-green)' : 'var(--text-dim)', borderRadius: '50%' }}><Settings size={16} /></button>
        </div>
      </header>

      <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {view === 'home' ? <HomeView
          naverUser={naverUser} sessions={sessions} setSessions={setSessions}
          sessionTab={sessionTab} setSessionTab={setSessionTab}
          searchQuery={searchQuery} setSearchQuery={setSearchQuery}
          isSearchOpen={isSearchOpen} setIsSearchOpen={setIsSearchOpen}
          visibleCount={visibleCount} setVisibleCount={setVisibleCount}
          setCurrentSessionId={setCurrentSessionId} setView={setView}
          setActiveTab={setActiveTab} representativeIds={representativeIds}
          setRepresentativeIds={setRepresentativeIds} contextMenu={contextMenu}
          setContextMenu={setContextMenu} toggleRepresentative={toggleRepresentative}
          isSelectMode={isSelectMode} setIsSelectMode={setIsSelectMode}
          deleteSessionFromSupabase={deleteSessionFromSupabase}
        /> : view === 'settings' ? settingsView : view === 'terms' ? <TermsPage /> : view === 'privacy' ? <PrivacyPage /> : view === 'refund' ? <RefundPage /> : (
          <div className="reveal" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
            {/* Fixed Tab Container */}
            <div
              className="tab-container"
              style={{
                position: 'fixed',
                top: headerVisible ? '46px' : '0px',
                left: '0.6rem',
                right: '0.6rem',
                zIndex: 100,
                transition: 'top 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                background: 'var(--bg-dark)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
              }}
            >
              <div className={`tab ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}><MessageCircle size={14} /> 대화</div>
              <div className={`tab ${activeTab === 'post' ? 'active' : ''} ${hasNewPostContent ? 'has-new' : ''}`} onClick={() => { setActiveTab('post'); setHasNewPostContent(false); }}><FileText size={14} /> 글</div>
            </div>

            {activeTab === 'chat' ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                <div className="scroll-container" style={{ flex: 1, overflowY: 'auto', padding: '0 1rem 0' }}>
                  <div className="chat-window" style={{ maxWidth: '750px', margin: '0 auto', width: '100%', paddingBottom: '160px', paddingTop: '106px' }}>
                    <div className="glass-heavy reveal" style={{ padding: '0.5rem 0.8rem', marginBottom: '1rem', display: 'flex', gap: '0.6rem', alignItems: 'center', border: '1px solid var(--nave-green)', justifyContent: 'space-between', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', minWidth: 0 }}>
                        <div className="floating-action" style={{ background: aiResponsesEnabled ? 'var(--naver-green)' : 'var(--text-muted)', width: '28px', height: '28px', minWidth: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}><Sparkles size={14} color="white" /></div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: '700', fontSize: '0.8rem' }}>AI 위저드 {aiResponsesEnabled ? '대화 중' : '휴식 중'}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{aiResponsesEnabled ? '사진을 보내거나 일상을 들려주세요.' : 'AI 답변 없이 기록만.'}</div>
                        </div>
                      </div>
                      <div
                        onClick={() => setAiResponsesEnabled(!aiResponsesEnabled)}
                        style={{
                          width: '44px',
                          height: '24px',
                          backgroundColor: aiResponsesEnabled ? 'var(--naver-green)' : 'rgba(255,255,255,0.1)',
                          borderRadius: '100px',
                          position: 'relative',
                          cursor: 'pointer',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: aiResponsesEnabled ? '0 0 10px rgba(3, 199, 90, 0.3)' : 'none'
                        }}
                      >
                        <div style={{
                          position: 'absolute',
                          top: '2px',
                          left: aiResponsesEnabled ? '22px' : '2px',
                          width: '20px',
                          height: '20px',
                          backgroundColor: 'white',
                          borderRadius: '50%',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}>
                          <Sparkles size={10} color={aiResponsesEnabled ? 'var(--naver-green)' : '#ccc'} />
                        </div>
                      </div>
                    </div>
                    {currentSession?.messages.map((m) => {
                      // Determine if this is an image message
                      const contentStr = typeof m.content === 'string' ? m.content : '';
                      const isImage = m.type === 'image' || contentStr.startsWith('data:image');

                      // Skip rendering if content is empty/invalid
                      if (!m.content) return null;

                      return (
                        <div key={m.id} className={`message ${m.sender} reveal`} style={{ position: 'relative', paddingLeft: m.sender === 'user' ? '30px' : '0' }}>
                          {m.sender === 'user' && (
                            <button
                              onClick={() => deleteMessage(m.id)}
                              className="msg-del-btn"
                              style={{ position: 'absolute', top: '4px', left: '0', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: 0.4 }}
                            >
                              <X size={12} color="var(--text-dim)" />
                            </button>
                          )}
                          {isImage ? (
                            <div className="message-image">
                              <img
                                src={m.content}
                                alt="upload"
                                onLoad={() => console.log('Image loaded:', m.id)}
                                onError={(e) => {
                                  console.error('Image load failed:', m.id);
                                  e.target.style.opacity = '0.3';
                                  e.target.alt = '이미지를 불러올 수 없습니다';
                                }}
                              />
                            </div>
                          ) : (
                            <div className="bubble">
                              <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                            </div>
                          )}
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start', padding: '4px 8px' }}>{m.timestamp}</span>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>
                </div>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, var(--bg-dark) 80%, transparent)', padding: '1.5rem 1rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem' }}>
                  {!isGenerating && currentSession?.messages.filter(m => m.sender === 'user').length > 0 && <button className="button-hover reveal cta-style" onClick={generateBlogPost} style={{ background: 'var(--naver-green)', color: 'white', padding: '1rem 2.5rem', borderRadius: '50px', fontWeight: '900', border: 'none', display: 'flex', alignItems: 'center', gap: '0.8rem' }}><Sparkles size={20} /> AI 블로그 포스팅 생성</button>}
                  <div className="glass-heavy input-glow chat-input-bar" style={{ maxWidth: '750px', width: '100%', borderRadius: '50px', display: 'flex', alignItems: 'center', padding: '0.6rem 1rem', gap: '0.8rem', border: '1px solid var(--glass-border)' }}>
                    <label className="button-hover image-upload-btn" style={{ padding: '0.5rem', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex', flexShrink: 0 }}><ImageIcon size={22} /><input type="file" accept="image/*" multiple hidden onChange={handleImageUpload} /></label>
                    <input type="text" placeholder={window.innerWidth < 600 ? "오늘 무엇을 하셨나요?" : "오늘 무엇을 하셨나요? AI가 블로그 글로 만들어드릴게요."} style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', color: 'var(--text-main)', padding: '0.6rem 0', fontSize: '1rem', outline: 'none' }} value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (handleSendMessage(inputText), setInputText(''))} />
                    <button className="button-hover send-btn" style={{ background: 'var(--naver-green)', color: 'white', padding: '0.7rem', borderRadius: '50%', border: 'none', display: 'flex', flexShrink: 0 }} onClick={() => { handleSendMessage(inputText); setInputText(''); }} disabled={!inputText.trim()}><Send size={20} /></button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                <div className="scroll-container" style={{ flex: 1, overflowY: 'auto', padding: '0.8rem 0 140px', display: 'flex', justifyContent: 'center' }}>
                  <div style={{
                    width: previewMode === 'mobile' ? '400px' : previewMode === 'tablet' ? '768px' : '100%',
                    maxWidth: '960px',
                    margin: '0 auto',
                    padding: previewMode === 'mobile' ? '106px 1rem 0' : '106px 2rem 0', // Added top padding here
                    transition: 'width 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', marginTop: '0' }}>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button className="button-hover glass" onClick={undo} disabled={historyIndex <= 0} style={{ padding: '0.5rem', opacity: historyIndex <= 0 ? 0.2 : 0.8, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}>
                          <RotateCcw size={18} color="white" />
                        </button>
                        <button className="button-hover glass" onClick={redo} disabled={historyIndex >= history.length - 1} style={{ padding: '0.5rem', opacity: historyIndex >= history.length - 1 ? 0.2 : 0.8, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}>
                          <RotateCw size={18} color="white" />
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="button-hover glass" onClick={handleCopyForNaver} style={{ padding: '0.6rem 1rem', borderRadius: '12px', fontWeight: '800', border: 'none', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Copy size={16} />
                          <span className="mobile-hide-text">복사</span>
                        </button>
                        <button className="button-hover" onClick={publishSession} style={{ background: 'var(--naver-green)', color: 'white', padding: '0.6rem 1rem', borderRadius: '12px', fontWeight: '900', border: 'none', boxShadow: '0 8px 16px rgba(3, 199, 90, 0.2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <BookOpen size={16} />
                          <span className="mobile-hide-text">발행</span>
                        </button>
                      </div>
                    </div>

                    <input className="seamless-title" value={currentSession?.post.title} onChange={(e) => setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, post: { ...s.post, title: e.target.value } } : s))} placeholder="제목을 입력하세요" style={{ fontSize: 'clamp(1.4rem, 4vw, 2.8rem)', marginBottom: '1rem' }} />

                    {isGenerating ? <div style={{ textAlign: 'center', padding: '6rem 0' }}><div className="floating-action" style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🪄</div><p style={{ color: 'var(--text-dim)' }}>AI가 블로그 거장을 위한 글을 빚고 있습니다...</p></div> :
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {(previewContent || currentSession?.post.content).map((block, idx) => {
                          const isDragging = draggedBlockIndex === idx;
                          const isDragOver = dragOverIndex === idx;
                          const isAbove = isDragOver && dropPosition === 'above';
                          const isBelow = isDragOver && dropPosition === 'below';

                          return (
                          <div
                            key={block.id}
                            className={`editor-block reveal
                              ${editingBlockId === block.id ? 'active' : ''}
                              ${isDragging ? 'dragging' : ''}
                              ${isDragOver ? 'drag-over' : ''}
                              ${isAbove ? 'drag-over-above' : ''}
                              ${isBelow ? 'drag-over-below' : ''}
                            `}
                            onClick={() => setEditingBlockId(block.id === editingBlockId ? null : block.id)}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, idx)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => handleDragOver(e, idx)}
                            onDragEnter={(e) => handleDragEnter(e, idx)}
                            onDrop={(e) => handleDrop(e, idx)}
                            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                          >
                            {/* Drag Handle */}
                            <div
                              style={{
                                position: 'absolute',
                                left: '-20px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                opacity: 0,
                                transition: 'opacity 0.2s',
                                cursor: 'grab',
                                color: 'var(--text-muted)',
                              }}
                              className="drag-handle"
                            >
                              <GripVertical size={18} />
                            </div>

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
                              <div contentEditable suppressContentEditableWarning onBlur={(e) => updateBlock(block.id, e.currentTarget.innerText)} onClick={(e) => e.stopPropagation()} style={{ width: '100%', outline: 'none', color: 'var(--text-main)', fontSize: previewMode === 'mobile' ? '1.05rem' : previewMode === 'tablet' ? '1.15rem' : '1.2rem', lineHeight: '1.8', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{block.value}</div>
                            )}

                            {block.type === 'image' && (
                              <div style={{ borderRadius: '12px', overflow: 'hidden', transition: 'all 0.3s' }}>
                                <img src={block.value || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1000&auto=format'} style={{ width: '100%', display: 'block' }} alt="img" />
                              </div>
                            )}

                            {block.type === 'quote' && (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1rem', textAlign: 'center' }}>
                                <div style={{ color: 'var(--naver-green)', fontSize: previewMode === 'mobile' ? '1.5rem' : '2rem', marginBottom: '0.5rem', fontWeight: '900' }}>"</div>
                                <div contentEditable suppressContentEditableWarning onBlur={(e) => updateBlock(block.id, e.currentTarget.innerText)} onClick={(e) => e.stopPropagation()} style={{ fontSize: previewMode === 'mobile' ? '1.1rem' : previewMode === 'tablet' ? '1.3rem' : '1.4rem', fontWeight: '800', color: 'var(--text-main)', outline: 'none', fontStyle: 'italic', maxWidth: '80%', lineHeight: '1.6' }}>{block.value}</div>
                                <div style={{ color: 'var(--naver-green)', fontSize: previewMode === 'mobile' ? '1.5rem' : '2rem', marginTop: '0.5rem', fontWeight: '900' }}>"</div>
                              </div>
                            )}

                            {block.type === 'divider' && (
                              <div style={{ display: 'flex', justifyContent: 'center', padding: '2.5rem 0' }}>
                                <div style={{ width: '120px', height: '1px', background: 'linear-gradient(to right, transparent, var(--glass-border), transparent)' }} />
                              </div>
                            )}
                          </div>
                          );
                        })}
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

                {/* Collapsible Floating Action Button (FAB) */}
                <div style={{
                  position: 'fixed',
                  bottom: '140px',
                  right: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  zIndex: 2000,
                }}>
                  {/* Expanded Toolbar */}
                  <div style={{
                    display: isToolbarOpen ? 'flex' : 'none',
                    gap: '0.4rem',
                    padding: '0.5rem',
                    borderRadius: '20px',
                    background: 'rgba(20, 24, 32, 0.95)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    animation: isToolbarOpen ? 'slideInRight 0.3s ease-out' : 'none',
                  }}>
                    {[
                      { icon: Type, label: '텍스트', type: 'text' },
                      { icon: Camera, label: '사진', type: 'image' },
                      { icon: Quote, label: '인용구', type: 'quote' },
                      { icon: Minus, label: '구분선', type: 'divider' },
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        className="button-hover glass"
                        onClick={() => { addBlock(item.type); setIsToolbarOpen(false); }}
                        style={{ padding: '0.6rem', borderRadius: '12px', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title={item.label}
                      >
                        <item.icon size={18} />
                      </button>
                    ))}
                    <button
                      className="button-hover"
                      style={{ padding: '0.6rem', borderRadius: '12px', color: 'var(--naver-green)', background: 'rgba(3, 199, 90, 0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="AI 글감"
                    >
                      <Sparkles size={18} />
                    </button>
                  </div>

                  {/* FAB Toggle Button */}
                  <button
                    className="button-hover"
                    onClick={() => setIsToolbarOpen(!isToolbarOpen)}
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '50%',
                      background: isToolbarOpen ? 'var(--glass-heavy)' : 'var(--naver-green)',
                      color: 'white',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                      transition: 'all 0.3s ease',
                      transform: isToolbarOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                    }}
                  >
                    <Plus size={24} />
                  </button>
                </div>

                {/* View Mode Toggle - Hidden on small physical screens */}
                {window.innerWidth >= 1024 && (
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
                )}

                {/* AI Edit Input Bar */}
                <div className="edit-input-gradient" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, var(--bg-dark) 85%, transparent)', padding: '2rem', display: 'flex', justifyContent: 'center', zIndex: 10, pointerEvents: 'none' }}>
                  <div className="glass-heavy input-glow edit-input-bar" style={{ pointerEvents: 'auto', maxWidth: '800px', width: '100%', borderRadius: '50px', display: 'flex', alignItems: 'center', padding: '0.7rem 1.2rem', gap: '1rem', border: editingBlockId ? '2px solid var(--naver-green)' : '1px solid var(--glass-border)' }}>
                    <Sparkles className="sparkles-icon" size={22} color="var(--naver-green)" />
                    <input ref={postInputRef} type="text" placeholder={editingBlockId ? (window.innerWidth < 600 ? "어떻게 고칠까요?" : "선택한 문단을 어떻게 고칠까요?") : "수정 사항 입력"} style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-main)', padding: '0.6rem', fontSize: '1rem', outline: 'none' }} value={postEditInput} onChange={(e) => setPostEditInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handlePostEditRequest()} />
                    <button className="button-hover" style={{ background: 'var(--naver-green)', color: 'white', padding: '0.7rem 1.5rem', borderRadius: '30px', border: 'none', fontWeight: '900', fontSize: '1rem' }} onClick={() => handlePostEditRequest()} disabled={!postEditInput.trim() || isGenerating}>수정</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'home' && !isSelectMode && (
          <button className="cta-button button-hover reveal" onClick={createNewSession} style={{ animationDelay: '0.3s', padding: '0.8rem 1.5rem', fontSize: '0.9rem', borderRadius: '16px' }}>
            <Plus size={18} />
            일상을 기록하기
          </button>
        )}
      </main>

      {/* Subscription Modal */}
      {showSubscriptionModal && (
        <SubscriptionModal
          isOpen={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
          onSubscribe={async (phoneNumber) => {
            // Check if user is logged in
            if (!isSupabaseReady || !supabaseUserId) {
              alert('결제를 진행하려면 네이버 로그인이 필요합니다.\n로그인 후 다시 시도해주세요.');
              setPendingPayment(true);
              setShowSubscriptionModal(false);
              setView('home'); // This will trigger LoginView since naverUser is null
              return;
            }
            if (!phoneNumber) {
              alert('휴대폰 번호를 입력해주세요.');
              return;
            }

            try {
              // Get payment data from backend
              const paymentData = await initiatePayment('premium');

              if (!paymentData || !paymentData.storeId || !paymentData.paymentId) {
                throw new Error('결제 정보를 가져오지 못했습니다');
              }

              // Open PortOne payment window
              const response = await PortOne.requestPayment({
                storeId: paymentData.storeId,
                paymentId: paymentData.paymentId,
                orderName: paymentData.orderName || '네이버 블로그 위저드 프리미엄',
                totalAmount: paymentData.amount || 2000,
                currency: 'KRW',
                channelKey: import.meta.env.VITE_PORTONE_CHANNEL_KEY || '',
                payMethod: 'CARD',
                customer: {
                  fullName: paymentData.customerName || '사용자',
                  email: paymentData.customerEmail || '',
                  phoneNumber,
                  phoneNumber: '01000000000',
                },
                redirectUrl: `${window.location.origin}/payment/complete`,
                noticeUrls: [
                  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payment-webhook`
                ],
              });

              // Handle payment result
              if (response.code === 'FAILURE_TYPE_PG') {
                alert(`결제 실패: ${response.message}`);
              } else if (response.code) {
                alert(`결제 중 오류가 발생했습니다: ${response.message}`);
              } else {
                // Payment initiated successfully
                // Close modal and wait for webhook to update subscription
                setShowSubscriptionModal(false);
                alert('결제가 진행 중입니다. 완료되면 프리미엄이 활성화됩니다.');

                // Refresh subscription status after a delay
                setTimeout(async () => {
                  await loadSubscription();
                }, 3000);
              }
            } catch (error) {
              console.error('Payment error:', error);
              alert('결제 시작에 실패했습니다: ' + error.message);
            }
          }}
          remainingCount={subscriptionData?.remaining || 0}
        />
      )}
    </div>
  );
};

export default App;
