import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export const useSupabase = (naverUser) => {
    const [isSupabaseReady, setIsSupabaseReady] = useState(false);
    const [supabaseUserId, setSupabaseUserId] = useState(null);

    // 1. Check for existing Supabase session on mount
    useEffect(() => {
        const checkExistingSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (session?.user) {
                    console.log('Existing Supabase session found!');
                    setSupabaseUserId(session.user.id);
                    setIsSupabaseReady(true);
                }
            } catch (error) {
                console.error('Session check error:', error);
            }
        };

        checkExistingSession();

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user) {
                setSupabaseUserId(session.user.id);
                setIsSupabaseReady(true);
            } else {
                setSupabaseUserId(null);
                setIsSupabaseReady(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // 2. Auto Login / Signup based on Naver ID (when naverUser is available)
    useEffect(() => {
        const naverId = naverUser?.id || naverUser?.nickname;
        if (!naverId) return;
        if (isSupabaseReady) return; // Already logged in

        const autoLogin = async () => {
            const email = `talklog.${naverId}@gmail.com`;
            const password = `talklog_secure_${naverId}`;

            try {
                // Try sign in
                const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (signInError) {
                    // If fail, try sign up
                    console.log('Sign in failed, trying sign up...');
                    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                        email,
                        password,
                        options: {
                            data: {
                                naver_id: naverId,
                                username: naverUser.nickname || 'User',
                                avatar_url: naverUser.profileImage,
                                blog_title: naverUser.blogTitle
                            }
                        }
                    });

                    if (signUpError) throw signUpError;

                    const userId = signUpData.user?.id;
                    if (userId) {
                        setSupabaseUserId(userId);
                        // Sync Profile Data
                        await supabase.from('profiles').upsert({
                            id: userId,
                            naver_id: naverId,
                            username: naverUser.nickname,
                            avatar_url: naverUser.profileImage,
                            blog_title: naverUser.blogTitle,
                            updated_at: new Date()
                        }, { onConflict: 'id' });
                    }
                } else {
                    const userId = signInData.user?.id;
                    if (userId) {
                        setSupabaseUserId(userId);
                        // Sync Profile Data on login too
                        await supabase.from('profiles').upsert({
                            id: userId,
                            naver_id: naverId,
                            username: naverUser.nickname,
                            avatar_url: naverUser.profileImage,
                            blog_title: naverUser.blogTitle,
                            updated_at: new Date()
                        }, { onConflict: 'id' });
                    }
                }

                setIsSupabaseReady(true);
                console.log('Supabase Connected!');
            } catch (error) {
                console.error('Supabase Auth Error:', error);
            }
        };

        autoLogin();
    }, [naverUser, isSupabaseReady]);

    // 3. Data Fetching
    const fetchSessions = async () => {
        if (!isSupabaseReady || !supabaseUserId) return [];

        try {
            const { data: sessions, error } = await supabase
                .from('chat_sessions')
                .select(`
          *,
          messages:chat_messages(*)
        `)
                .eq('user_id', supabaseUserId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Transform DB structure to match App state structure
            return sessions.map(s => ({
                id: s.id,
                title: s.title,
                status: s.status,
                isRepresentative: s.is_representative,
                publishedAt: s.published_at,
                createdAt: s.created_at,
                messages: (s.messages || [])
                    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                    .map(m => ({
                        id: m.id,
                        sender: m.role,
                        type: m.type || 'text', // Preserve message type, default to text if not specified
                        content: m.content,
                        timestamp: m.timestamp || new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    })),
                post: s.post_data || { title: '', content: [], tags: [] } // Load post data or default
            }));

        } catch (error) {
            console.error('Fetch Sessions Error:', error);
            return [];
        }
    };

    // 4. Save Session (Upsert)
    const saveSessionToSupabase = async (session) => {
        if (!isSupabaseReady || !supabaseUserId) return;

        try {
            // 1. Session upsert
            const { error: sessionError } = await supabase
                .from('chat_sessions')
                .upsert({
                    id: session.id,
                    user_id: supabaseUserId,
                    title: session.title,
                    status: session.status,
                    is_representative: session.isRepresentative || false,
                    published_at: session.publishedAt,
                    created_at: session.createdAt || new Date().toISOString(),
                    post_data: session.post || {} // Save post data
                }, { onConflict: 'id' });

            if (sessionError) throw sessionError;

            // 2. Messages upsert
            if (session.messages && session.messages.length > 0) {
                const messagesToUpsert = session.messages.map(m => {
                    // For image messages, don't store the base64 content (too large)
                    // Instead, store a placeholder or metadata
                    const content = m.type === 'image'
                        ? `[IMAGE_${m.id}]` // Placeholder instead of base64
                        : m.content;

                    return {
                        id: typeof m.id === 'string' ? m.id : crypto.randomUUID(),
                        session_id: session.id,
                        role: m.sender || m.role,
                        type: m.type || 'text', // Preserve message type
                        content: content,
                        timestamp: m.timestamp,
                        created_at: m.createdAt || new Date().toISOString()
                    };
                });

                const { error: msgError } = await supabase
                    .from('chat_messages')
                    .upsert(messagesToUpsert, { onConflict: 'id' });

                if (msgError) throw msgError;
            }

            console.log('Session saved to Supabase:', session.id);
        } catch (error) {
            console.error('Save Session Error:', error);
        }
    };

    // 5. Delete Session
    const deleteSessionFromSupabase = async (sessionId) => {
        if (!isSupabaseReady) return;
        try {
            await supabase.from('chat_sessions').delete().eq('id', sessionId);
            console.log('Session deleted from Supabase:', sessionId);
        } catch (error) {
            console.error('Delete Session Error:', error);
        }
    };

    return {
        isSupabaseReady,
        supabaseUserId,
        fetchSessions,
        saveSessionToSupabase,
        deleteSessionFromSupabase
    };
};
