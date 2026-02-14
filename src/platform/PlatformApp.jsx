import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { FeedPage } from './pages/FeedPage';
import { PostDetailPage } from './pages/PostDetailPage';
import { AuthorPage } from './pages/AuthorPage';
import { MyPostsPage } from './pages/MyPostsPage';
import { EditorPage } from './pages/EditorPage';
import './platform.css';
import './platform-content.css';

const PlatformShell = ({ currentUser }) => {
  return (
    <div className="platform-shell">
      <header className="platform-topbar">
        <div className="platform-topbar-inner">
          <Link className="platform-brand" to="/platform">
            Talklog Platform
          </Link>
          <nav className="platform-nav">
            <NavLink to="/platform">피드</NavLink>
            <NavLink to="/platform/me">내 글</NavLink>
            <NavLink to="/platform/write">작성</NavLink>
          </nav>
          <div className="platform-user-area">
            {currentUser?.email ? (
              <span>{currentUser.email}</span>
            ) : (
              <a href="/">네이버 로그인</a>
            )}
            <a href="/">레거시 스튜디오</a>
          </div>
        </div>
      </header>
      <main className="platform-main">
        <Outlet />
      </main>
    </div>
  );
};

export const PlatformApp = () => {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    let active = true;

    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (active) setCurrentUser(data.user || null);
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <Routes>
      <Route element={<PlatformShell currentUser={currentUser} />}>
        <Route element={<FeedPage currentUser={currentUser} />} index />
        <Route element={<PostDetailPage />} path="post/:slug" />
        <Route element={<AuthorPage />} path="author/:username" />
        <Route element={<MyPostsPage currentUser={currentUser} />} path="me" />
        <Route element={<EditorPage currentUser={currentUser} />} path="write" />
        <Route element={<EditorPage currentUser={currentUser} />} path="edit/:postId" />
      </Route>
    </Routes>
  );
};
