import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { fetchFeedPosts } from '../api';
import { formatDate } from '../utils';

export const FeedPage = ({ currentUser }) => {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [query, setQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setErrorMessage('');

      try {
        const data = await fetchFeedPosts();
        setPosts(data);
      } catch (_error) {
        setErrorMessage('피드를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const filteredPosts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return posts;

    return posts.filter((post) => {
      const title = post.title?.toLowerCase() || '';
      const summary = post.summary?.toLowerCase() || '';
      const author = post.author?.username?.toLowerCase() || '';
      return title.includes(normalized) || summary.includes(normalized) || author.includes(normalized);
    });
  }, [posts, query]);

  return (
    <section className="platform-page">
      <header className="platform-page-header">
        <div>
          <h1>Talklog Feed</h1>
          <p>작성자가 공개한 글을 탐색하고, 내 글도 바로 발행할 수 있습니다.</p>
        </div>
        {currentUser ? (
          <Link className="platform-btn platform-btn-primary" to="/platform/write">
            새 글 작성
          </Link>
        ) : (
          <a className="platform-btn platform-btn-primary" href="/">
            로그인하고 글 작성
          </a>
        )}
      </header>

      <div className="platform-search">
        <Search size={16} />
        <input
          placeholder="제목, 요약, 작성자 검색"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {loading && <div className="platform-empty">피드를 불러오는 중...</div>}
      {!loading && errorMessage && <div className="platform-error">{errorMessage}</div>}
      {!loading && !errorMessage && filteredPosts.length === 0 && (
        <div className="platform-empty">아직 공개된 글이 없습니다.</div>
      )}

      <div className="platform-grid">
        {filteredPosts.map((post) => (
          <article key={post.id} className="platform-card">
            {post.cover_image_url ? (
              <img alt={post.title} className="platform-card-image" src={post.cover_image_url} />
            ) : (
              <div className="platform-card-image platform-card-image-fallback" />
            )}
            <div className="platform-card-body">
              <div className="platform-card-meta">
                <Link to={`/platform/author/${post.author?.username || 'unknown'}`}>
                  @{post.author?.username || 'unknown'}
                </Link>
                <span>{formatDate(post.published_at || post.created_at)}</span>
              </div>
              <h2>
                <Link to={`/platform/post/${post.slug}`}>{post.title}</Link>
              </h2>
              <p>{post.summary || '요약이 없습니다.'}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

