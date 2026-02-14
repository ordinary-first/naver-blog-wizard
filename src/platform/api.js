import { supabase } from '../supabaseClient';
import { createPostSlug } from './utils';

const BLOG_POST_SELECT = `
  id,
  author_id,
  slug,
  title,
  summary,
  content,
  cover_image_url,
  status,
  published_at,
  created_at,
  updated_at
`;

const enrichAuthor = async (posts) => {
  if (!posts || posts.length === 0) return [];

  const authorIds = [...new Set(posts.map((post) => post.author_id).filter(Boolean))];
  if (authorIds.length === 0) return posts.map((post) => ({ ...post, author: null }));

  const { data: authors, error } = await supabase
    .from('profiles')
    .select('id, username, blog_title, avatar_url')
    .in('id', authorIds);

  if (error) {
    return posts.map((post) => ({ ...post, author: null }));
  }

  const authorMap = new Map(authors.map((author) => [author.id, author]));

  return posts.map((post) => ({
    ...post,
    author: authorMap.get(post.author_id) || null,
  }));
};

export const fetchFeedPosts = async (limit = 30) => {
  const { data, error } = await supabase
    .from('blog_posts')
    .select(BLOG_POST_SELECT)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return enrichAuthor(data || []);
};

export const fetchPostBySlug = async (slug) => {
  const { data, error } = await supabase
    .from('blog_posts')
    .select(BLOG_POST_SELECT)
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const enriched = await enrichAuthor([data]);
  return enriched[0] || null;
};

export const fetchProfileByUsername = async (username) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, blog_title, avatar_url')
    .eq('username', username)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const fetchPostsByAuthor = async (authorId) => {
  const { data, error } = await supabase
    .from('blog_posts')
    .select(BLOG_POST_SELECT)
    .eq('author_id', authorId)
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (error) throw error;
  return enrichAuthor(data || []);
};

export const fetchMyPosts = async (authorId) => {
  const { data, error } = await supabase
    .from('blog_posts')
    .select(BLOG_POST_SELECT)
    .eq('author_id', authorId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const fetchMyPostById = async (postId, authorId) => {
  const { data, error } = await supabase
    .from('blog_posts')
    .select(BLOG_POST_SELECT)
    .eq('id', postId)
    .eq('author_id', authorId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const upsertPost = async ({
  id,
  authorId,
  title,
  summary,
  content,
  status,
  coverImageUrl,
  slug,
}) => {
  const normalizedTitle = title.trim();
  const normalizedSummary = summary.trim();
  const normalizedContent = content.trim();
  const normalizedStatus = status === 'published' ? 'published' : 'draft';
  const resolvedSlug = slug || createPostSlug(normalizedTitle);
  const now = new Date().toISOString();

  const payload = {
    author_id: authorId,
    title: normalizedTitle,
    summary: normalizedSummary,
    content: normalizedContent,
    status: normalizedStatus,
    cover_image_url: coverImageUrl?.trim() || null,
    slug: resolvedSlug,
    updated_at: now,
    published_at: normalizedStatus === 'published' ? now : null,
  };

  if (id) {
    const { data, error } = await supabase
      .from('blog_posts')
      .update(payload)
      .eq('id', id)
      .eq('author_id', authorId)
      .select(BLOG_POST_SELECT)
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('blog_posts')
    .insert({
      ...payload,
      id: crypto.randomUUID(),
      created_at: now,
    })
    .select(BLOG_POST_SELECT)
    .single();

  if (error) throw error;
  return data;
};

export const updatePostStatus = async ({ postId, authorId, status }) => {
  const normalizedStatus = status === 'published' ? 'published' : 'draft';
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('blog_posts')
    .update({
      status: normalizedStatus,
      published_at: normalizedStatus === 'published' ? now : null,
      updated_at: now,
    })
    .eq('id', postId)
    .eq('author_id', authorId)
    .select(BLOG_POST_SELECT)
    .single();

  if (error) throw error;
  return data;
};

export const deletePost = async ({ postId, authorId }) => {
  const { error } = await supabase
    .from('blog_posts')
    .delete()
    .eq('id', postId)
    .eq('author_id', authorId);

  if (error) throw error;
  return true;
};
