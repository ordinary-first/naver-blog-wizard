import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchPostBySlug } from '../api';
import { formatDate } from '../utils';

export const PostDetailPage = ({ currentUser }) => {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setErrorMessage('');

      try {
        const data = await fetchPostBySlug(slug);
        setPost(data);
      } catch (_error) {
        setErrorMessage('게시글을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [slug]);

  const paragraphs = useMemo(() => {
    if (!post?.content) return [];
    return post.content.split('\n').map((line) => line.trim()).filter(Boolean);
  }, [post]);

  const isAuthor = Boolean(currentUser?.id && currentUser.id === post?.author_id);

  if (loading) return <section className="platform-empty">게시글을 불러오는 중...</section>;
  if (errorMessage) return <section className="platform-error">{errorMessage}</section>;
  if (!post) return <section className="platform-empty">게시글을 찾을 수 없습니다.</section>;

  return (
    <article className="platform-post">
      <header className="platform-post-header">
        <Link className="platform-link" to="/platform">
          피드로 돌아가기
        </Link>
        <h1>{post.title}</h1>
        <div className="platform-post-meta">
          <Link to={`/platform/author/${post.author?.username || 'unknown'}`}>
            @{post.author?.username || 'unknown'}
          </Link>
          <span>{formatDate(post.published_at || post.created_at)}</span>
          {post.status === 'draft' && <span>초안</span>}
        </div>
        {post.summary && <p className="platform-post-summary">{post.summary}</p>}
        {isAuthor && (
          <div className="platform-inline-actions">
            <Link className="platform-link" to={`/platform/edit/${post.id}`}>
              이 글 수정
            </Link>
            <Link className="platform-link" to="/platform/me">
              내 글 관리
            </Link>
          </div>
        )}
      </header>

      {post.cover_image_url && (
        <img alt={post.title} className="platform-post-cover" src={post.cover_image_url} />
      )}

      <section className="platform-post-content">
        {paragraphs.map((line, index) => (
          <p key={`${post.id}-${index}`}>{line}</p>
        ))}
      </section>
    </article>
  );
};

