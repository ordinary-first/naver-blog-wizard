import React, { useRef, useState, useEffect } from 'react';
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
    toggleRepresentative,
    setHeaderVisible
}) => {
    const longPressTimer = useRef(null);
    const scrollContainerRef = useRef(null);
    const [lastScrollY, setLastScrollY] = useState(0);
    const [appHeaderVisible, setAppHeaderVisible] = useState(true);

    // Auto-hide App.jsx header on scroll
    useEffect(() => {
        const scrollContainer = scrollContainerRef.current;
        if (!scrollContainer) return;

        let ticking = false;

        const handleScroll = (e) => {
            // Never hide header when search is open
            if (isSearchOpen) {
                if (setHeaderVisible) setHeaderVisible(true);
                setAppHeaderVisible(true);
                return;
            }

            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const currentScrollY = e.target.scrollTop;

                    // Always show header at top
                    if (currentScrollY < 10) {
                        if (setHeaderVisible) setHeaderVisible(true);
                        setAppHeaderVisible(true);
                    }
                    // Scrolling down: hide header (only after 80px scroll)
                    else if (currentScrollY > lastScrollY && currentScrollY > 80) {
                        if (setHeaderVisible) setHeaderVisible(false);
                        setAppHeaderVisible(false);
                    }
                    // Scrolling up: show header immediately
                    else if (currentScrollY < lastScrollY) {
                        if (setHeaderVisible) setHeaderVisible(true);
                        setAppHeaderVisible(true);
                    }

                    setLastScrollY(currentScrollY);
                    ticking = false;
                });
                ticking = true;
            }
        };

        scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
        return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }, [lastScrollY, isSearchOpen, setHeaderVisible]);

    // Reset header visibility when search opens/closes
    const handleSearchOpen = () => {
        setIsSearchOpen(true);
        if (setHeaderVisible) setHeaderVisible(true);
        setAppHeaderVisible(true);
    };

    const handleSearchClose = () => {
        setIsSearchOpen(false);
        if (setHeaderVisible) setHeaderVisible(true);
        setAppHeaderVisible(true);
    };

    // Reset header when tab changes
    const handleTabChange = (tab) => {
        setSessionTab(tab);
        if (setHeaderVisible) setHeaderVisible(true);
        setAppHeaderVisible(true);
    };

    const active = sessions.filter(s => s.publishedDate === null);
    const published = sessions.filter(s => s.publishedDate !== null);
    const currentSessions = sessionTab === 'active' ? active : published;

    const filteredSessions = searchQuery.trim()
        ? currentSessions.filter((session) => {
            const title = session.title || '새로운 기록';
            return title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                   session.messages.some(m => m.text?.toLowerCase().includes(searchQuery.toLowerCase()));
        })
        : currentSessions;

    const handleLongPressStart = (sessionId, e) => {
        e.preventDefault();
        longPressTimer.current = setTimeout(() => {
            setContextMenu({ sessionId, x: e.clientX || e.touches[0].clientX, y: e.clientY || e.touches[0].clientY });
        }, 500);
    };

    const handleLongPressEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const handleDeleteSession = (sessionId) => {
        if (window.confirm('이 세션을 삭제하시겠습니까?')) {
            setSessions(prev => prev.filter(s => s.id !== sessionId));
        }
        setContextMenu(null);
    };

    return (
        <div style={{ position: 'relative', height: '100%', width: '100%', overflow: 'hidden' }}>
            {/* Fixed Header: Profile + Tabs */}
            <div style={{
                position: 'fixed',
                top: appHeaderVisible ? '60px' : '0px', // Moves up when App header hides
                left: 0,
                right: 0,
                zIndex: 90,
                background: 'var(--bg-main)',
                padding: '0.8rem 1rem 0.4rem',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'top 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
                {/* Profile Section */}
                <div style={{
                    marginBottom: '0.6rem',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: '0.8rem',
                    maxWidth: '850px',
                    margin: '0 auto 0.6rem'
                }}>
                    <img
                        src={naverUser?.profileImage || 'https://via.placeholder.com/40'}
                        style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid var(--naver-green)' }}
                        alt="profile"
                    />
                    <div style={{ textAlign: 'left' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', display: 'block' }}>안녕하세요,</span>
                        <h1 className="premium-gradient" style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>
                            {naverUser?.blogTitle}님
                        </h1>
                    </div>
                </div>

                {/* Tab & Search Navigation */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    maxWidth: '850px',
                    margin: '0 auto',
                    height: '44px',
                    position: 'relative'
                }}>
                    {/* Search Bar (Expanded) */}
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
                            style={{
                                flex: 1,
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-main)',
                                fontSize: '0.95rem',
                                outline: 'none'
                            }}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex'
                                }}
                            >
                                <X size={16} />
                            </button>
                        )}
                        <button
                            onClick={handleSearchClose}
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'var(--text-dim)',
                                cursor: 'pointer',
                                padding: '6px 12px',
                                fontSize: '0.8rem',
                                fontWeight: '600',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            닫기
                        </button>
                    </div>

                    {/* Tabs (Hidden when search is open) */}
                    <div style={{
                        display: 'flex',
                        width: '100%',
                        opacity: isSearchOpen ? 0 : 1,
                        transition: 'opacity 0.2s',
                        pointerEvents: isSearchOpen ? 'none' : 'auto'
                    }}>
                        <button
                            onClick={() => handleTabChange('active')}
                            style={{
                                flex: 1,
                                padding: '0.7rem',
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
                                padding: '0.7rem',
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
                        <button
                            onClick={handleSearchOpen}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-dim)',
                                cursor: 'pointer',
                                padding: '0.5rem 0.8rem',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'color 0.2s'
                            }}
                        >
                            <Search size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Scrollable Content */}
            <div
                ref={scrollContainerRef}
                style={{
                    height: '100%',
                    overflowY: 'auto',
                    paddingTop: '155px', // Profile + Tabs height (reduced)
                    paddingBottom: '100px'
                }}
            >
                <div style={{ maxWidth: '850px', margin: '0 auto', padding: '0 1rem' }}>
                    {filteredSessions.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            color: 'var(--text-dim)',
                            padding: '3rem 1rem',
                            fontSize: '0.95rem'
                        }}>
                            {searchQuery ? '검색 결과가 없습니다.' : '아직 작성된 글이 없습니다.'}
                        </div>
                    ) : (
                        <>
                            {filteredSessions.slice(0, visibleCount).map((session) => {
                                const isRepresentative = representativeIds.includes(session.id);
                                return (
                                    <div
                                        key={session.id}
                                        className="glass reveal"
                                        onMouseDown={(e) => handleLongPressStart(session.id, e)}
                                        onMouseUp={handleLongPressEnd}
                                        onMouseLeave={handleLongPressEnd}
                                        onTouchStart={(e) => handleLongPressStart(session.id, e)}
                                        onTouchEnd={handleLongPressEnd}
                                        onClick={(e) => {
                                            if (contextMenu) return;
                                            setCurrentSessionId(session.id);
                                            setActiveTab('chat');
                                            setView('editor');
                                        }}
                                        style={{
                                            padding: '1rem',
                                            marginBottom: '0.8rem',
                                            cursor: 'pointer',
                                            borderRadius: '12px',
                                            transition: 'all 0.2s ease',
                                            position: 'relative',
                                            border: isRepresentative ? '2px solid var(--naver-green)' : '1px solid rgba(255,255,255,0.05)'
                                        }}
                                    >
                                        {isRepresentative && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '0.5rem',
                                                right: '0.5rem',
                                                background: 'var(--naver-green)',
                                                borderRadius: '50%',
                                                width: '24px',
                                                height: '24px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <Star size={14} fill="white" color="white" />
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                            {session.publishedDate ? (
                                                <BookOpen size={16} color="var(--naver-green)" />
                                            ) : (
                                                <MessageCircle size={16} color="var(--text-dim)" />
                                            )}
                                            <h3 style={{
                                                margin: 0,
                                                fontSize: '1rem',
                                                fontWeight: '700',
                                                color: 'var(--text-main)',
                                                flex: 1,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {session.title || '새로운 기록'}
                                            </h3>
                                        </div>
                                        <div style={{
                                            fontSize: '0.8rem',
                                            color: 'var(--text-dim)',
                                            marginBottom: '0.3rem'
                                        }}>
                                            {new Date(session.createdAt).toLocaleDateString('ko-KR', {
                                                month: 'numeric',
                                                day: 'numeric'
                                            })}
                                        </div>
                                    </div>
                                );
                            })}

                            {visibleCount < filteredSessions.length && (
                                <button
                                    onClick={() => setVisibleCount(prev => prev + 10)}
                                    style={{
                                        width: '100%',
                                        padding: '0.8rem',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px',
                                        color: 'var(--text-dim)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        fontSize: '0.9rem',
                                        fontWeight: '600',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    더 보기 <ChevronDown size={16} />
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <>
                    <div
                        onClick={() => setContextMenu(null)}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 998
                        }}
                    />
                    <div
                        className="glass"
                        style={{
                            position: 'fixed',
                            top: contextMenu.y,
                            left: contextMenu.x,
                            zIndex: 999,
                            borderRadius: '12px',
                            padding: '0.5rem',
                            minWidth: '180px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
                        }}
                    >
                        <button
                            onClick={() => {
                                toggleRepresentative(contextMenu.sessionId);
                                setContextMenu(null);
                            }}
                            style={{
                                width: '100%',
                                padding: '0.7rem',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-main)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                borderRadius: '8px',
                                fontSize: '0.9rem',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <Star size={16} />
                            {representativeIds.includes(contextMenu.sessionId) ? '대표 해제' : '대표 설정'}
                        </button>
                        <button
                            onClick={() => handleDeleteSession(contextMenu.sessionId)}
                            style={{
                                width: '100%',
                                padding: '0.7rem',
                                background: 'transparent',
                                border: 'none',
                                color: '#ff4444',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                borderRadius: '8px',
                                fontSize: '0.9rem',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,68,68,0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <Trash2 size={16} />
                            삭제
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default HomeView;
