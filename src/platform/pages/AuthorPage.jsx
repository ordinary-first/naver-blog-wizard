import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchPostsByAuthor, fetchProfileByUsername } from '../api';
import { formatDate } from '../utils';

export const AuthorPage = () => {
  const { username } = useParams();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setErrorMessage('');

      try {
        const profileData = await fetchProfileByUsername(username);
        if (!profileData) {
          setProfile(null);
          setPosts([]);
          return;
        }

        setProfile(profileData);
        const postData = await fetchPostsByAuthor(profileData.id);
        setPosts(postData);
      } catch (error) {
        setErrorMessage('작성자 페이지를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [username]);

  if (loading) return <section className="platform-empty">작성자 글을 불러오는 중...</section>;
  if (errorMessage) return <section className="platform-error">{errorMessage}</section>;
  if (!profile) return <section className="platform-empty">작성자를 찾을 수 없습니다.</section>;

  return (
    <section className="platform-page">
      <header className="platform-page-header">
        <div>
          <h1>{profile.blog_title || `${profile.username}의 블로그`}</h1>
          <p>@{profile.username} 님이 공개한 글 모음입니다.</p>
        </div>
        <Link className="platform-btn" to="/platform">
          피드
        </Link>
      </header>

      {posts.length === 0 && <div className="platform-empty">아직 공개된 글이 없습니다.</div>}

      <div className="platform-list">
        {posts.map((post) => (
          <article className="platform-list-item" key={post.id}>
            <div>
              <h2>
                <Link to={`/platform/post/${post.slug}`}>{post.title}</Link>
              </h2>
              <p>{post.summary || '요약이 아직 없습니다.'}</p>
            </div>
            <time>{formatDate(post.published_at || post.created_at)}</time>
          </article>
        ))}
      </div>
    </section>
  );
};

