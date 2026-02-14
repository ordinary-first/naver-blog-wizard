import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { deletePost, fetchMyPosts, updatePostStatus } from '../api';
import { formatDate } from '../utils';

const FILTER_OPTIONS = ['all', 'published', 'draft'];

export const MyPostsPage = ({ currentUser }) => {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [actingPostId, setActingPostId] = useState(null);

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
      } catch (_error) {
        setErrorMessage('내 글 목록을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [currentUser?.id]);

  const filteredPosts = useMemo(() => {
    if (activeFilter === 'all') return posts;
    return posts.filter((post) => post.status === activeFilter);
  }, [activeFilter, posts]);

  const onToggleStatus = async (post) => {
    if (!currentUser?.id) return;

    const nextStatus = post.status === 'published' ? 'draft' : 'published';
    setActingPostId(post.id);
    setErrorMessage('');

    try {
      const updatedPost = await updatePostStatus({
        postId: post.id,
        authorId: currentUser.id,
        status: nextStatus,
      });

      setPosts((prev) => prev.map((item) => (item.id === post.id ? updatedPost : item)));
    } catch (_error) {
      setErrorMessage('상태 변경에 실패했습니다.');
    } finally {
      setActingPostId(null);
    }
  };

  const onDelete = async (post) => {
    if (!currentUser?.id) return;
    if (!window.confirm(`"${post.title}" 글을 삭제할까요?`)) return;

    setActingPostId(post.id);
    setErrorMessage('');

    try {
      await deletePost({
        postId: post.id,
        authorId: currentUser.id,
      });
      setPosts((prev) => prev.filter((item) => item.id !== post.id));
    } catch (_error) {
      setErrorMessage('글 삭제에 실패했습니다.');
    } finally {
      setActingPostId(null);
    }
  };

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
          <p>초안, 공개 글, 삭제까지 한 번에 관리합니다.</p>
        </div>
        <Link className="platform-btn platform-btn-primary" to="/platform/write">
          새 글 작성
        </Link>
      </header>

      <div className="platform-filters">
        {FILTER_OPTIONS.map((filter) => (
          <button
            key={filter}
            className={`platform-filter-btn ${activeFilter === filter ? 'is-active' : ''}`}
            onClick={() => setActiveFilter(filter)}
            type="button"
          >
            {filter === 'all' ? '전체' : filter === 'published' ? '공개' : '초안'}
          </button>
        ))}
      </div>

      {loading && <div className="platform-empty">내 글을 불러오는 중...</div>}
      {!loading && errorMessage && <div className="platform-error">{errorMessage}</div>}
      {!loading && !errorMessage && filteredPosts.length === 0 && (
        <div className="platform-empty">조건에 맞는 글이 없습니다.</div>
      )}

      <div className="platform-list">
        {filteredPosts.map((post) => {
          const isActing = actingPostId === post.id;
          return (
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
                <div className="platform-card-actions">
                  <button
                    className="platform-small-btn"
                    disabled={isActing}
                    onClick={() => onToggleStatus(post)}
                    type="button"
                  >
                    {post.status === 'published' ? '비공개' : '공개'}
                  </button>
                  <button
                    className="platform-small-btn is-danger"
                    disabled={isActing}
                    onClick={() => onDelete(post)}
                    type="button"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

