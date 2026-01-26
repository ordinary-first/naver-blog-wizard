import React, { useRef, useState, useEffect } from 'react';
import { Search, X, MessageCircle, Star, BookOpen, ChevronDown, Trash2, CheckCircle, Circle } from 'lucide-react';

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
    setHeaderVisible,
    isSelectMode,
    setIsSelectMode,
    deleteSessionFromSupabase
}) => {
    const longPressTimer = useRef(null);
    const scrollContainerRef = useRef(null);
    const [lastScrollY, setLastScrollY] = useState(0);
    const [appHeaderVisible, setAppHeaderVisible] = useState(true);
    const [selectedIds, setSelectedIds] = useState([]);

    // Smooth scroll-based header control
    useEffect(() => {
        const scrollContainer = scrollContainerRef.current;
        if (!scrollContainer) return;

        let ticking = false;

        const handleScroll = (e) => {
            if (isSearchOpen) {
                if (setHeaderVisible) setHeaderVisible(true);
                setAppHeaderVisible(true);
                return;
            }

            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const currentScrollY = e.target.scrollTop;

                    if (currentScrollY < 5) {
                        // Always show at top
                        if (setHeaderVisible) setHeaderVisible(true);
                        setAppHeaderVisible(true);
                    } else if (currentScrollY > lastScrollY && currentScrollY > 50) {
                        // Hide on scroll down (reduced threshold: 80→50)
                        if (setHeaderVisible) setHeaderVisible(false);
                        setAppHeaderVisible(false);
                    } else if (currentScrollY < lastScrollY) {
                        // Show on ANY scroll up
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

    const handleTabChange = (tab) => {
        setSessionTab(tab);
        if (setHeaderVisible) setHeaderVisible(true);
        setAppHeaderVisible(true);
    };

    const active = sessions.filter(s => !s.publishedAt);
    const published = sessions.filter(s => !!s.publishedAt);
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
        const touch = e.touches?.[0] || e;
        const x = touch.clientX || touch.pageX;
        const y = touch.clientY || touch.pageY;

        longPressTimer.current = setTimeout(() => {
            // Show context menu on long press
            setContextMenu({ visible: true, sessionId, x, y });
        }, 400);
    };

    const handleLongPressEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const toggleSelectItem = (sessionId) => {
        setSelectedIds(prev =>
            prev.includes(sessionId)
                ? prev.filter(id => id !== sessionId)
                : [...prev, sessionId]
        );
    };

    const exitSelectMode = () => {
        setIsSelectMode(false);
        setSelectedIds([]);
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return;
        if (window.confirm(`${selectedIds.length}개의 세션을 삭제하시겠습니까?`)) {
            console.log('Deleting sessions:', selectedIds);
            const deletedIds = [];

            // Delete from Supabase
            for (const id of selectedIds) {
                const success = await deleteSessionFromSupabase(id);
                if (success !== false) {
                    deletedIds.push(id);
                }
            }

            console.log('Successfully deleted:', deletedIds);

            // Update local state only for successfully deleted items
            if (deletedIds.length > 0) {
                setSessions(prev => prev.filter(s => !deletedIds.includes(s.id)));
            }

            if (deletedIds.length < selectedIds.length) {
                alert(`${selectedIds.length - deletedIds.length}개의 세션 삭제에 실패했습니다.`);
            }

            exitSelectMode();
        }
    };

    const handleDeleteSession = async (sessionId) => {
        if (window.confirm('이 세션을 삭제하시겠습니까?')) {
            console.log('Deleting single session:', sessionId);
            const success = await deleteSessionFromSupabase(sessionId);
            if (success !== false) {
                setSessions(prev => prev.filter(s => s.id !== sessionId));
            } else {
                alert('세션 삭제에 실패했습니다.');
            }
        }
        setContextMenu({ visible: false, sessionId: null, x: 0, y: 0 });
    };

    // Context menu positioning
    const getContextMenuStyle = () => {
        if (!contextMenu?.visible) return {};

        const menuWidth = 180;
        const menuHeight = 100;
        const padding = 10;

        let x = contextMenu.x;
        let y = contextMenu.y;

        // Keep menu on screen
        if (x + menuWidth > window.innerWidth) {
            x = window.innerWidth - menuWidth - padding;
        }
        if (y + menuHeight > window.innerHeight) {
            y = window.innerHeight - menuHeight - padding;
        }

        return { top: y, left: x };
    };

    return (
        <div style={{ position: 'relative', height: '100%', width: '100%', overflow: 'hidden' }}>
            {/* Fixed Header: Profile + Tabs */}
            <div style={{
                position: 'fixed',
                top: appHeaderVisible ? '60px' : '0px',
                left: 0,
                right: 0,
                zIndex: 90,
                background: 'var(--bg-main)',
                padding: '0.7rem 1rem 0',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'top 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
                {/* Compact Profile */}
                <div style={{
                    marginBottom: '0.5rem',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    maxWidth: '850px',
                    margin: '0 auto 0.5rem'
                }}>
                    <img
                        src={naverUser?.profileImage || 'https://via.placeholder.com/36'}
                        style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            border: '2px solid var(--naver-green)'
                        }}
                        alt="profile"
                    />
                    <h1 className="premium-gradient" style={{
                        fontSize: '1rem',
                        fontWeight: '800',
                        margin: 0,
                        letterSpacing: '-0.3px'
                    }}>
                        {naverUser?.blogTitle}
                    </h1>
                </div>

                {/* Tabs & Search */}
                <div style={{
                    display: 'flex',
                    alignItems: 'stretch',
                    width: '100%',
                    maxWidth: '850px',
                    margin: '0 auto',
                    height: '42px',
                    position: 'relative'
                }}>
                    {/* Search Bar (Overlay) */}
                    <div style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        background: 'var(--bg-card)',
                        borderRadius: '10px',
                        padding: '0 0.6rem',
                        gap: '0.4rem',
                        opacity: isSearchOpen ? 1 : 0,
                        pointerEvents: isSearchOpen ? 'auto' : 'none',
                        transform: isSearchOpen ? 'scale(1)' : 'scale(0.96)',
                        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                        border: '1px solid var(--naver-green)',
                        zIndex: 10,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
                    }}>
                        <Search size={17} color="var(--naver-green)" />
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
                                fontSize: '0.9rem',
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
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '4px',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <X size={15} />
                            </button>
                        )}
                        <button
                            onClick={handleSearchClose}
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: 'none',
                                borderRadius: '6px',
                                color: 'var(--text-dim)',
                                cursor: 'pointer',
                                padding: '5px 10px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        >
                            닫기
                        </button>
                    </div>

                    {/* Tabs */}
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
                                padding: '0 0.5rem',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: sessionTab === 'active' ? '2.5px solid var(--naver-green)' : '2.5px solid transparent',
                                color: sessionTab === 'active' ? 'var(--text-main)' : 'var(--text-dim)',
                                fontSize: '0.9rem',
                                fontWeight: sessionTab === 'active' ? '800' : '500',
                                cursor: 'pointer',
                                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => {
                                if (sessionTab !== 'active') {
                                    e.currentTarget.style.color = 'var(--text-main)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (sessionTab !== 'active') {
                                    e.currentTarget.style.color = 'var(--text-dim)';
                                }
                            }}
                        >
                            작성 중 ({active.length})
                        </button>
                        <button
                            onClick={() => handleTabChange('published')}
                            style={{
                                flex: 1,
                                padding: '0 0.5rem',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: sessionTab === 'published' ? '2.5px solid var(--naver-green)' : '2.5px solid transparent',
                                color: sessionTab === 'published' ? 'var(--text-main)' : 'var(--text-dim)',
                                fontSize: '0.9rem',
                                fontWeight: sessionTab === 'published' ? '800' : '500',
                                cursor: 'pointer',
                                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => {
                                if (sessionTab !== 'published') {
                                    e.currentTarget.style.color = 'var(--text-main)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (sessionTab !== 'published') {
                                    e.currentTarget.style.color = 'var(--text-dim)';
                                }
                            }}
                        >
                            발행됨 ({published.length})
                        </button>
                        <button
                            onClick={handleSearchOpen}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                borderBottom: '2.5px solid transparent',
                                color: 'var(--text-dim)',
                                cursor: 'pointer',
                                padding: '0 0.7rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = 'var(--naver-green)';
                                e.currentTarget.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = 'var(--text-dim)';
                                e.currentTarget.style.transform = 'scale(1)';
                            }}
                        >
                            <Search size={17} />
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
                    paddingTop: '130px', // Reduced: 155→130
                    paddingBottom: '80px'
                }}
            >
                <div style={{ maxWidth: '850px', margin: '0 auto', padding: '0 1rem' }}>
                    {filteredSessions.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            color: 'var(--text-dim)',
                            padding: '3rem 1rem',
                            fontSize: '0.9rem'
                        }}>
                            {searchQuery ? '검색 결과가 없습니다.' : '아직 작성된 글이 없습니다.'}
                        </div>
                    ) : (
                        <>
                            {filteredSessions.slice(0, visibleCount).map((session) => {
                                const isRepresentative = representativeIds.includes(session.id);
                                const isSelected = selectedIds.includes(session.id);
                                return (
                                    <div
                                        key={session.id}
                                        className="glass reveal"
                                        onMouseDown={(e) => !isSelectMode && handleLongPressStart(session.id, e)}
                                        onMouseUp={handleLongPressEnd}
                                        onMouseLeave={handleLongPressEnd}
                                        onTouchStart={(e) => !isSelectMode && handleLongPressStart(session.id, e)}
                                        onTouchEnd={handleLongPressEnd}
                                        onClick={(e) => {
                                            if (contextMenu?.visible) return;
                                            if (isSelectMode) {
                                                toggleSelectItem(session.id);
                                                return;
                                            }
                                            setCurrentSessionId(session.id);
                                            setActiveTab('chat');
                                            setView('editor');
                                        }}
                                        style={{
                                            padding: '1rem',
                                            paddingLeft: isSelectMode ? '3rem' : '1rem',
                                            marginBottom: '0.6rem',
                                            cursor: 'pointer',
                                            borderRadius: '12px',
                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                            position: 'relative',
                                            border: isSelected ? '2px solid var(--naver-green)' : isRepresentative ? '2px solid var(--naver-green)' : '1px solid rgba(255,255,255,0.05)',
                                            background: isSelected ? 'rgba(3,199,90,0.1)' : undefined,
                                            transform: 'translateY(0)',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isSelectMode) {
                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                                e.currentTarget.style.boxShadow = '0 4px 16px rgba(3,199,90,0.15)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                                        }}
                                    >
                                        {/* Select checkbox */}
                                        {isSelectMode && (
                                            <div style={{
                                                position: 'absolute',
                                                left: '0.8rem',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                color: isSelected ? 'var(--naver-green)' : 'var(--text-dim)'
                                            }}>
                                                {isSelected ? <CheckCircle size={20} /> : <Circle size={20} />}
                                            </div>
                                        )}
                                        {isRepresentative && !isSelectMode && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '0.5rem',
                                                right: '0.5rem',
                                                background: 'var(--naver-green)',
                                                borderRadius: '50%',
                                                width: '22px',
                                                height: '22px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                boxShadow: '0 2px 8px rgba(3,199,90,0.3)'
                                            }}>
                                                <Star size={12} fill="white" color="white" />
                                            </div>
                                        )}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            marginBottom: '0.4rem'
                                        }}>
                                            {session.publishedAt ? (
                                                <BookOpen size={15} color="var(--naver-green)" />
                                            ) : (
                                                <MessageCircle size={15} color="var(--text-dim)" />
                                            )}
                                            <h3 style={{
                                                margin: 0,
                                                fontSize: '0.95rem',
                                                fontWeight: '700',
                                                color: 'var(--text-main)',
                                                flex: 1,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                letterSpacing: '-0.2px'
                                            }}>
                                                {session.title || '새로운 기록'}
                                            </h3>
                                        </div>
                                        <div style={{
                                            fontSize: '0.75rem',
                                            color: 'var(--text-dim)'
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
                                        padding: '0.75rem',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '10px',
                                        color: 'var(--text-dim)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.4rem',
                                        fontSize: '0.85rem',
                                        fontWeight: '600',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                    }}
                                >
                                    더 보기 <ChevronDown size={15} />
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Select Mode Action Bar */}
            {isSelectMode && (
                <div style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'var(--bg-dark)',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    padding: '0.8rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    zIndex: 100,
                    backdropFilter: 'blur(10px)'
                }}>
                    <button
                        onClick={exitSelectMode}
                        style={{
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: 'var(--text-main)',
                            padding: '0.6rem 1rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '600'
                        }}
                    >
                        취소
                    </button>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                        {selectedIds.length}개 선택됨
                    </span>
                    <button
                        onClick={handleDeleteSelected}
                        disabled={selectedIds.length === 0}
                        style={{
                            background: selectedIds.length > 0 ? '#ff4444' : 'rgba(255,68,68,0.3)',
                            border: 'none',
                            color: 'white',
                            padding: '0.6rem 1rem',
                            borderRadius: '8px',
                            cursor: selectedIds.length > 0 ? 'pointer' : 'not-allowed',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                        }}
                    >
                        <Trash2 size={16} /> 삭제
                    </button>
                </div>
            )}

            {/* Context Menu */}
            {contextMenu?.visible && !isSelectMode && (
                <>
                    <div
                        onClick={() => setContextMenu({ visible: false, sessionId: null, x: 0, y: 0 })}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 998,
                            background: 'rgba(0,0,0,0.2)',
                            backdropFilter: 'blur(2px)',
                            animation: 'fadeIn 0.15s ease'
                        }}
                    />
                    <div
                        className="glass"
                        style={{
                            position: 'fixed',
                            ...getContextMenuStyle(),
                            zIndex: 999,
                            borderRadius: '10px',
                            padding: '0.4rem',
                            minWidth: '170px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                            animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                    >
                        <button
                            onClick={() => {
                                toggleRepresentative(contextMenu.sessionId);
                                setContextMenu({ visible: false, sessionId: null, x: 0, y: 0 });
                            }}
                            style={{
                                width: '100%',
                                padding: '0.65rem 0.7rem',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-main)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                fontWeight: '500',
                                transition: 'background 0.15s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <Star size={15} />
                            {representativeIds.includes(contextMenu.sessionId) ? '대표 해제' : '대표 설정'}
                        </button>
                        <button
                            onClick={() => handleDeleteSession(contextMenu.sessionId)}
                            style={{
                                width: '100%',
                                padding: '0.65rem 0.7rem',
                                background: 'transparent',
                                border: 'none',
                                color: '#ff4444',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                fontWeight: '500',
                                transition: 'background 0.15s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,68,68,0.12)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <Trash2 size={15} />
                            삭제
                        </button>
                        <button
                            onClick={() => {
                                setIsSelectMode(true);
                                setSelectedIds([contextMenu.sessionId]);
                                setContextMenu({ visible: false, sessionId: null, x: 0, y: 0 });
                            }}
                            style={{
                                width: '100%',
                                padding: '0.65rem 0.7rem',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-main)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                fontWeight: '500',
                                transition: 'background 0.15s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <CheckCircle size={15} />
                            여러 개 선택
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default HomeView;
