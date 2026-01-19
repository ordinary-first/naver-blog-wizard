import React, { useRef } from 'react';
import { Search, X, MessageCircle, Star, BookOpen, ChevronDown, Trash2 } from 'lucide-react';

const HomeView = ({
    naverUser,
    sessions,
    setSessions,
    sessionTab,
    setSessionTab,
    searchQuery,
    setSearchQuery,
    isSearchOpen,
    setIsSearchOpen,
    visibleCount,
    setVisibleCount,
    setCurrentSessionId,
    setView,
    setActiveTab,
    representativeIds,
    setRepresentativeIds,
    contextMenu,
    setContextMenu,
    toggleRepresentative
}) => {
    const longPressTimer = useRef(null);

    const published = sessions.filter(s => s.status === 'published');
    const active = sessions.filter(s => s.status === 'active');

    // Search Logic
    const allSessions = [...active, ...published];
    const normalizedQuery = searchQuery?.trim().toLowerCase() || '';
    const searchResults = normalizedQuery
        ? allSessions.filter(s => s.title.toLowerCase().includes(normalizedQuery) || s.messages.some(m => m.content && m.content.toLowerCase().includes(normalizedQuery)))
        : [];

    // Determine List
    let targetList = [];
    if (normalizedQuery) {
        targetList = searchResults;
    } else {
        targetList = sessionTab === 'active' ? active : published;
    }

    // Pagination
    const visibleList = targetList.slice(0, visibleCount);
    const hasMore = visibleList.length < targetList.length;

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
                <img src={naverUser?.profileImage || ''} style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid var(--naver-green)' }} alt="profile" />
                <div style={{ textAlign: 'left' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)', display: 'block' }}>안녕하세요,</span>
                    <h1 className="premium-gradient" style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>{naverUser?.blogTitle}님</h1>
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
                            onClick={() => { setCurrentSessionId(s.id); setView('editor'); setActiveTab(s.status === 'published' ? 'post' : 'chat'); }}
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

export default HomeView;
