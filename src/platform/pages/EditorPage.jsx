import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchMyPostById, upsertPost } from '../api';

const INITIAL_FORM = {
  title: '',
  summary: '',
  content: '',
  coverImageUrl: '',
  status: 'draft',
  slug: '',
};

export const EditorPage = ({ currentUser }) => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!postId);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const run = async () => {
      if (!postId || !currentUser?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage('');

      try {
        const data = await fetchMyPostById(postId, currentUser.id);
        if (!data) {
          setErrorMessage('수정할 글을 찾을 수 없습니다.');
          return;
        }

        setForm({
          title: data.title || '',
          summary: data.summary || '',
          content: data.content || '',
          coverImageUrl: data.cover_image_url || '',
          status: data.status || 'draft',
          slug: data.slug || '',
        });
      } catch (error) {
        setErrorMessage('글 정보를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [postId, currentUser?.id]);

  const isReadyToSave = useMemo(() => {
    return form.title.trim() && form.content.trim();
  }, [form.title, form.content]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (nextStatus) => {
    if (!currentUser?.id || !isReadyToSave) return;

    setSaving(true);
    setErrorMessage('');

    try {
      await upsertPost({
        id: postId,
        authorId: currentUser.id,
        title: form.title,
        summary: form.summary,
        content: form.content,
        status: nextStatus,
        coverImageUrl: form.coverImageUrl,
        slug: form.slug,
      });
      navigate('/platform/me');
    } catch (error) {
      setErrorMessage('저장에 실패했습니다. 제목 중복 여부를 확인해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  if (!currentUser?.id) {
    return (
      <section className="platform-empty">
        글 작성은 로그인 이후 가능합니다. <a href="/">네이버 로그인으로 이동</a>
      </section>
    );
  }

  if (loading) return <section className="platform-empty">글 정보를 불러오는 중...</section>;

  return (
    <section className="platform-page">
      <header className="platform-page-header">
        <div>
          <h1>{postId ? '글 수정' : '새 글 작성'}</h1>
          <p>초안 저장 후 검토하고, 공개 상태로 전환하면 피드에 노출됩니다.</p>
        </div>
        <Link className="platform-btn" to="/platform/me">
          내 글 목록
        </Link>
      </header>

      <div className="platform-editor">
        <label>
          제목
          <input
            name="title"
            onChange={handleChange}
            placeholder="글 제목"
            value={form.title}
          />
        </label>

        <label>
          요약
          <textarea
            name="summary"
            onChange={handleChange}
            placeholder="피드에 노출되는 요약"
            rows={3}
            value={form.summary}
          />
        </label>

        <label>
          커버 이미지 URL (선택)
          <input
            name="coverImageUrl"
            onChange={handleChange}
            placeholder="https://..."
            value={form.coverImageUrl}
          />
        </label>

        <label>
          본문
          <textarea
            name="content"
            onChange={handleChange}
            placeholder="본문을 입력하세요"
            rows={16}
            value={form.content}
          />
        </label>

        {errorMessage && <div className="platform-error">{errorMessage}</div>}

        <div className="platform-editor-actions">
          <button
            className="platform-btn"
            disabled={!isReadyToSave || saving}
            onClick={() => handleSave('draft')}
            type="button"
          >
            초안 저장
          </button>
          <button
            className="platform-btn platform-btn-primary"
            disabled={!isReadyToSave || saving}
            onClick={() => handleSave('published')}
            type="button"
          >
            공개하기
          </button>
        </div>
      </div>
    </section>
  );
};

