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
        console.log('🔑 [AUTH DEBUG] ==================== START ====================');
        console.log('🔑 [AUTH DEBUG] naverUser:', JSON.stringify(naverUser, null, 2));
        console.log('🔑 [AUTH DEBUG] naverId determined:', naverId);
        console.log('🔑 [AUTH DEBUG] isSupabaseReady:', isSupabaseReady);
        console.log('🔑 [AUTH DEBUG] supabaseUserId:', supabaseUserId);

        if (!naverId) {
            console.log('🔑 [AUTH DEBUG] No naverId, exiting');
            return;
        }

        const autoLogin = async () => {
            // First, check if current Supabase session matches the Naver user
            if (isSupabaseReady && supabaseUserId) {
                try {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('naver_id')
                        .eq('id', supabaseUserId)
                        .single();

                    if (profile && profile.naver_id === naverId) {
                        console.log('🔑 [AUTH DEBUG] Session matches current Naver user, exiting');
                        return;
                    } else {
                        console.log('🔑 [AUTH DEBUG] Session mismatch! Profile naverId:', profile?.naver_id, 'vs current:', naverId);
                        console.log('🔑 [AUTH DEBUG] Signing out stale session...');
                        await supabase.auth.signOut();
                        setIsSupabaseReady(false);
                        setSupabaseUserId(null);
                        // Continue to login with new user
                    }
                } catch (error) {
                    console.error('🔑 [AUTH DEBUG] Session check error:', error);
                }
            }

            // Create email-safe identifier by hashing the naverId
            // This ensures consistent, valid email format regardless of naverId content
            const encoder = new TextEncoder();
            const data = encoder.encode(naverId);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            const emailSafeId = hashHex.substring(0, 32); // Use first 32 chars of hash

            const email = `talklog.${emailSafeId}@gmail.com`;
            const password = `talklog_secure_${emailSafeId}`; // Use same hash for consistency

            console.log('🔑 [AUTH DEBUG] Email-safe ID generated:', emailSafeId);
            console.log('🔑 [AUTH DEBUG] Original naverId:', naverId);
            console.log('🔑 [AUTH DEBUG] Attempting login with email:', email);

            try {
                // Try sign in
                const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (signInError) {
                    // If fail, try sign up
                    console.log('❌ [AUTH DEBUG] Sign in FAILED:', signInError.message);
                    console.log('❌ [AUTH DEBUG] Attempting sign up...');
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
                    console.log('✅ [AUTH DEBUG] Sign up SUCCESS! New userId:', userId);
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
                    console.log('✅ [AUTH DEBUG] Sign in SUCCESS! Existing userId:', userId);
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
                console.log('✅ [AUTH DEBUG] Supabase Connected! Ready to fetch data.');
                console.log('🔑 [AUTH DEBUG] ==================== END ====================');
            } catch (error) {
                console.error('❌ [AUTH DEBUG] Supabase Auth Error:', error);
                console.log('🔑 [AUTH DEBUG] ==================== END (ERROR) ====================');
            }
        };

        autoLogin();
    }, [naverUser, isSupabaseReady, supabaseUserId]);

    // 3. Data Fetching
    const fetchSessions = async () => {
        console.log('📥 [FETCH DEBUG] ==================== FETCH SESSIONS ====================');
        console.log('📥 [FETCH DEBUG] isSupabaseReady:', isSupabaseReady);
        console.log('📥 [FETCH DEBUG] supabaseUserId:', supabaseUserId);

        if (!isSupabaseReady || !supabaseUserId) {
            console.log('📥 [FETCH DEBUG] Not ready or no userId, returning empty array');
            return [];
        }

        try {
            console.log('📥 [FETCH DEBUG] Querying Supabase with user_id:', supabaseUserId);
            const { data: sessions, error } = await supabase
                .from('chat_sessions')
                .select(`
          *,
          messages:chat_messages(*)
        `)
                .eq('user_id', supabaseUserId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('📥 [FETCH DEBUG] Query ERROR:', error);
                throw error;
            }

            console.log('📥 [FETCH DEBUG] Query SUCCESS! Found', sessions?.length || 0, 'sessions');
            if (sessions && sessions.length > 0) {
                console.log('📥 [FETCH DEBUG] First session:', sessions[0].title);
            }

            // Transform DB structure to match App state structure
            const transformed = sessions.map(s => ({
                id: s.id,
                title: s.title,
                status: s.status,
                isRepresentative: s.is_representative,
                publishedAt: s.published_at && s.published_at !== '' ? s.published_at : null,
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

            return transformed;

        } catch (error) {
            console.error('Fetch Sessions Error:', error);
            return [];
        }
    };

    // 4. Save Session (Upsert)
    const saveSessionToSupabase = async (session) => {
        console.log('💾 [SAVE DEBUG] ==================== SAVE SESSION ====================');
        console.log('💾 [SAVE DEBUG] isSupabaseReady:', isSupabaseReady);
        console.log('💾 [SAVE DEBUG] supabaseUserId:', supabaseUserId);
        console.log('💾 [SAVE DEBUG] session.id:', session.id);
        console.log('💾 [SAVE DEBUG] session.title:', session.title);
        console.log('💾 [SAVE DEBUG] session.messages count:', session.messages?.length || 0);

        if (!isSupabaseReady || !supabaseUserId) {
            console.log('💾 [SAVE DEBUG] NOT READY! Cannot save. Exiting.');
            return;
        }

        try {
            console.log('💾 [SAVE DEBUG] Upserting session to Supabase...');
            // 1. Session upsert
            const { error: sessionError } = await supabase
                .from('chat_sessions')
                .upsert({
                    id: session.id,
                    user_id: supabaseUserId,
                    title: session.title,
                    status: session.status,
                    is_representative: session.isRepresentative || false,
                    published_at: session.publishedAt || null, // Explicitly set NULL if falsy
                    created_at: session.createdAt || new Date().toISOString(),
                    post_data: session.post || {} // Save post data
                }, { onConflict: 'id' });

            if (sessionError) {
                console.error('💾 [SAVE DEBUG] Session upsert ERROR:', sessionError);
                throw sessionError;
            }
            console.log('💾 [SAVE DEBUG] Session upsert SUCCESS!');

            // 2. Messages upsert
            if (session.messages && session.messages.length > 0) {
                const messagesToUpsert = session.messages.map(m => {
                    // For image messages, content should now be a URL (not base64)
                    // No need for placeholder anymore
                    return {
                        id: typeof m.id === 'string' ? m.id : crypto.randomUUID(),
                        session_id: session.id,
                        role: m.sender || m.role,
                        type: m.type || 'text', // Preserve message type
                        content: m.content,
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
        if (!isSupabaseReady) {
            console.warn('Supabase not ready, cannot delete session:', sessionId);
            return false;
        }
        try {
            // First delete related messages (due to foreign key)
            const { error: msgDeleteError } = await supabase
                .from('chat_messages')
                .delete()
                .eq('session_id', sessionId);

            if (msgDeleteError) {
                console.error('Error deleting messages:', msgDeleteError);
            }

            // Then delete the session
            const { error: sessionError } = await supabase
                .from('chat_sessions')
                .delete()
                .eq('id', sessionId);

            if (sessionError) {
                console.error('Error deleting session:', sessionError);
                return false;
            }

            console.log('Session deleted from Supabase:', sessionId);
            return true;
        } catch (error) {
            console.error('Delete Session Error:', error);
            return false;
        }
    };

    // 6. Upload File directly to Supabase Storage (iOS Safari compatible - NO base64 conversion)
    const uploadFileDirectly = async (file) => {
        console.log('[DirectUpload] Start - isSupabaseReady:', isSupabaseReady, 'supabaseUserId:', supabaseUserId);

        if (!isSupabaseReady || !supabaseUserId) {
            console.log('[DirectUpload] Session not ready, attempting recovery...');

            // iOS Safari: Try to refresh session if not ready
            try {
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                console.log('[DirectUpload] Session check result:', session ? 'found' : 'none', sessionError || '');

                if (session?.user) {
                    console.log('[DirectUpload] Session recovered:', session.user.id);
                    return await performDirectUpload(file, session.user.id);
                }
            } catch (sessionError) {
                console.error('[DirectUpload] Session recovery exception:', sessionError);
            }
            console.error('[DirectUpload] Failed - no valid session');
            return null;
        }

        return await performDirectUpload(file, supabaseUserId);
    };

    // Helper function for direct upload
    const performDirectUpload = async (file, userId) => {
        try {
            console.log('[DirectUpload] performDirectUpload start');
            console.log('[DirectUpload] File:', file.name, 'Type:', file.type, 'Size:', file.size, 'bytes');
            console.log('[DirectUpload] UserId:', userId);

            // Validate file
            if (!file || file.size < 100) {
                console.error('[DirectUpload] Invalid file or too small');
                return null;
            }

            // Determine file extension (iOS may not provide correct type for HEIC)
            let fileExt = 'jpg';
            const fileType = file.type?.toLowerCase() || '';
            const originalFileName = file.name?.toLowerCase() || '';

            if (fileType.includes('png') || originalFileName.endsWith('.png')) {
                fileExt = 'png';
            } else if (fileType.includes('gif') || originalFileName.endsWith('.gif')) {
                fileExt = 'gif';
            } else if (fileType.includes('webp') || originalFileName.endsWith('.webp')) {
                fileExt = 'webp';
            } else if (fileType.includes('heic') || fileType.includes('heif') ||
                       originalFileName.endsWith('.heic') || originalFileName.endsWith('.heif')) {
                console.log('[DirectUpload] HEIC/HEIF detected, using jpg extension');
                fileExt = 'jpg';
            }

            const uploadFileName = `${userId}/${Date.now()}_${crypto.randomUUID()}.${fileExt}`;
            console.log('[DirectUpload] Target path:', uploadFileName);

            // Upload File directly (most reliable for iOS)
            console.log('[DirectUpload] Calling supabase.storage.upload...');
            const { data, error } = await supabase.storage
                .from('chat-images')
                .upload(uploadFileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.error('[DirectUpload] Supabase error:', error.message);
                console.error('[DirectUpload] Error details:', JSON.stringify(error));
                throw error;
            }

            console.log('[DirectUpload] Upload response:', data);

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('chat-images')
                .getPublicUrl(uploadFileName);

            console.log('[DirectUpload] SUCCESS - URL:', publicUrl);
            return publicUrl;

        } catch (error) {
            console.error('[DirectUpload] Exception:', error.message || error);
            console.error('[DirectUpload] Stack:', error.stack);
            return null;
        }
    };

    // 7. Upload Image to Supabase Storage (base64 version - fallback)
    const uploadImageToSupabase = async (base64Image) => {
        if (!isSupabaseReady || !supabaseUserId) {
            console.error('Supabase not ready or user not logged in');
            return null;
        }

        try {
            // Validate input
            if (!base64Image || typeof base64Image !== 'string') {
                console.error('Invalid base64Image input:', typeof base64Image);
                return null;
            }

            if (!base64Image.startsWith('data:')) {
                console.error('base64Image does not start with data:', base64Image.substring(0, 50));
                return null;
            }

            // Extract mime type with better error handling (iOS HEIC support)
            const mimeMatch = base64Image.match(/data:([^;]+);/);
            let mimeType = 'image/jpeg'; // Default fallback

            if (mimeMatch) {
                mimeType = mimeMatch[1];
                // Normalize HEIC/HEIF to JPEG (already converted by canvas)
                if (mimeType.includes('heic') || mimeType.includes('heif')) {
                    console.log('HEIC detected, treating as JPEG (already converted)');
                    mimeType = 'image/jpeg';
                }
            } else {
                console.warn('Could not extract mime type, using default: image/jpeg');
            }
            console.log('Using mime type:', mimeType);

            // Convert base64 to Blob
            const base64Data = base64Image.split(',')[1];
            if (!base64Data) {
                console.error('Could not extract base64 data');
                return null;
            }

            // iOS Safari compatible base64 decoding
            let byteArray;
            try {
                const byteCharacters = atob(base64Data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                byteArray = new Uint8Array(byteNumbers);
            } catch (decodeError) {
                console.error('Base64 decode error:', decodeError);
                return null;
            }

            const blob = new Blob([byteArray], { type: mimeType });
            console.log('Blob created, size:', blob.size, 'bytes');

            // Validate blob size (prevent empty uploads)
            if (blob.size < 100) {
                console.error('Blob too small, likely invalid:', blob.size);
                return null;
            }

            // Generate unique filename (always use jpg for consistency)
            const fileExt = mimeType === 'image/png' ? 'png' : 'jpg';
            const fileName = `${supabaseUserId}/${Date.now()}_${crypto.randomUUID()}.${fileExt}`;

            // Upload to Supabase Storage
            const { error } = await supabase.storage
                .from('chat-images')
                .upload(fileName, blob, {
                    contentType: mimeType,
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('chat-images')
                .getPublicUrl(fileName);

            console.log('Image uploaded successfully:', publicUrl);
            return publicUrl;

        } catch (error) {
            console.error('Image Upload Error:', error);
            return null;
        }
    };

    // 8. Log errors to Supabase for remote debugging (iOS issues)
    const logErrorToSupabase = async (errorType, errorMessage, errorDetails = {}) => {
        try {
            // Get session even if hook state is stale
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id || supabaseUserId;

            if (!userId) {
                console.log('[ErrorLog] No user ID, skipping log');
                return;
            }

            const { error } = await supabase
                .from('error_logs')
                .insert({
                    user_id: userId,
                    error_type: errorType,
                    error_message: errorMessage,
                    error_details: {
                        ...errorDetails,
                        timestamp: new Date().toISOString()
                    },
                    user_agent: navigator.userAgent
                });

            if (error) {
                console.error('[ErrorLog] Failed to save:', error);
            } else {
                console.log('[ErrorLog] Saved:', errorType);
            }
        } catch (e) {
            console.error('[ErrorLog] Exception:', e);
        }
    };

    return {
        isSupabaseReady,
        supabaseUserId,
        fetchSessions,
        saveSessionToSupabase,
        deleteSessionFromSupabase,
        uploadFileDirectly,
        uploadImageToSupabase,
        logErrorToSupabase
    };
};
