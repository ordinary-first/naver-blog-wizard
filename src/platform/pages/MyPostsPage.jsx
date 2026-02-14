import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchMyPosts } from '../api';
import { formatDate } from '../utils';

export const MyPostsPage = ({ currentUser }) => {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const run = async () => {
      if (!currentUser?.id) {
        setLoading(false);
        setPosts([]);
        return;
      }

      setLoading(true);
      setErrorMessage('');

      try {
        const data = await fetchMyPosts(currentUser.id);
        setPosts(data);
      } catch (error) {
        setErrorMessage('내 글 목록을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [currentUser?.id]);

  if (!currentUser?.id) {
    return (
      <section className="platform-empty">
        로그인 후 내 글을 관리할 수 있습니다. <a href="/">네이버 로그인으로 이동</a>
      </section>
    );
  }

  return (
    <section className="platform-page">
      <header className="platform-page-header">
        <div>
          <h1>내 글 관리</h1>
          <p>초안과 공개 글을 한 화면에서 관리합니다.</p>
        </div>
        <Link className="platform-btn platform-btn-primary" to="/platform/write">
          새 글 작성
        </Link>
      </header>

      {loading && <div className="platform-empty">내 글을 불러오는 중...</div>}
      {!loading && errorMessage && <div className="platform-error">{errorMessage}</div>}
      {!loading && !errorMessage && posts.length === 0 && (
        <div className="platform-empty">아직 작성한 글이 없습니다.</div>
      )}

      <div className="platform-list">
        {posts.map((post) => (
          <article className="platform-list-item" key={post.id}>
            <div>
              <h2>{post.title}</h2>
              <p>{post.summary || '요약 없음'}</p>
              <div className="platform-inline-actions">
                <Link className="platform-link" to={`/platform/edit/${post.id}`}>
                  수정
                </Link>
                {post.status === 'published' && (
                  <Link className="platform-link" to={`/platform/post/${post.slug}`}>
                    보기
                  </Link>
                )}
              </div>
            </div>
            <div className="platform-pill-wrap">
              <span className={`platform-pill ${post.status === 'published' ? 'is-live' : ''}`}>
                {post.status === 'published' ? '공개' : '초안'}
              </span>
              <time>{formatDate(post.updated_at || post.created_at)}</time>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

