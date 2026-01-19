import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export const useSupabase = (naverUser) => {
    const [isSupabaseReady, setIsSupabaseReady] = useState(false);
    const [supabaseUserId, setSupabaseUserId] = useState(null);

    // 1. Auto Login / Signup based on Naver ID
    useEffect(() => {
        if (!naverUser?.id) return;

        const autoLogin = async () => {
            const email = `${naverUser.id}@talklog.app`;
            const password = `talklog_secure_${naverUser.id}`;

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
                                naver_id: naverUser.id,
                                username: naverUser.nickname || 'User',
                                avatar_url: naverUser.profileImage,
                                blog_title: naverUser.blogTitle
                            }
                        }
                    });

                    if (signUpError) throw signUpError;
                    setSupabaseUserId(signUpData.user.id);
                } else {
                    setSupabaseUserId(signInData.user.id);
                }

                // Sync Profile Data
                if (supabaseUserId) {
                    await supabase.from('profiles').upsert({
                        id: supabaseUserId,
                        naver_id: naverUser.id,
                        username: naverUser.nickname,
                        avatar_url: naverUser.profileImage,
                        blog_title: naverUser.blogTitle,
                        updated_at: new Date()
                    }, { onConflict: 'id' });
                }

                setIsSupabaseReady(true);
                console.log('Supabase Connected!');
            } catch (error) {
                console.error('Supabase Auth Error:', error);
            }
        };

        autoLogin();
    }, [naverUser]);

    // 2. Data Fetching
    const fetchSessions = async () => {
        if (!isSupabaseReady) return [];

        try {
            const { data: sessions, error } = await supabase
                .from('chat_sessions')
                .select(`
          *,
          messages:chat_messages(*)
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Transform needed to match app state structure if necessary
            // Assuming DB structure matches App structure closely
            return sessions.map(s => ({
                ...s,
                messages: s.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
            }));

        } catch (error) {
            console.error('Fetch Sessions Error:', error);
            return [];
        }
    };

    // 3. Save Session (Upsert)
    const saveSessionToSupabase = async (session) => {
        if (!isSupabaseReady || !supabaseUserId) return;

        try {
            // 1. Session upsert
            const { data: sessionData, error: sessionError } = await supabase
                .from('chat_sessions')
                .upsert({
                    id: session.id, // Ensure session has UUID
                    user_id: supabaseUserId,
                    title: session.title,
                    status: session.status,
                    is_representative: session.isRepresentative || false, // Adjust field name if needed
                    published_at: session.publishedAt,
                    updated_at: new Date() // if column exists
                })
                .select()
                .single();

            if (sessionError) throw sessionError;

            // 2. Messages upsert
            // Only upsert new or modified messages to save bandwidth? 
            // For simplicity, we can upsert all, but better to filter.
            if (session.messages && session.messages.length > 0) {
                const messagesToUpsert = session.messages.map(m => ({
                    id: m.id,
                    session_id: session.id,
                    role: m.role,
                    content: m.content,
                    created_at: m.createdAt || new Date()
                }));

                const { error: msgError } = await supabase
                    .from('chat_messages')
                    .upsert(messagesToUpsert);

                if (msgError) throw msgError;
            }

        } catch (error) {
            console.error('Save Session Error:', error);
        }
    };

    // 4. Delete Session
    const deleteSessionFromSupabase = async (sessionId) => {
        if (!isSupabaseReady) return;
        await supabase.from('chat_sessions').delete().eq('id', sessionId);
    };

    return { isSupabaseReady, fetchSessions, saveSessionToSupabase, deleteSessionFromSupabase };
};
