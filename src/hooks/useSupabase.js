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
                        return; // Session matches, no need to re-login
                    } else {
                        // Session mismatch, sign out and continue with new user
                        await supabase.auth.signOut();
                        setIsSupabaseReady(false);
                        setSupabaseUserId(null);
                    }
                } catch (error) {
                    console.error('Session check error:', error);
                }
            }

            // Create email-safe identifier by hashing the naverId
            const encoder = new TextEncoder();
            const data = encoder.encode(naverId);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            const emailSafeId = hashHex.substring(0, 32);

            const email = `talklog.${emailSafeId}@gmail.com`;
            const password = `talklog_secure_${emailSafeId}`;

            try {
                // Try sign in
                const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (signInError) {
                    // If fail, try sign up
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
            } catch (error) {
                console.error('Supabase Auth Error:', error);
            }
        };

        autoLogin();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [naverUser, isSupabaseReady]);

    // 3. Data Fetching
    const fetchSessions = async () => {
        if (!isSupabaseReady || !supabaseUserId) {
            return [];
        }

        try {
            const { data: sessions, error } = await supabase
                .from('chat_sessions')
                .select(`
          *,
          messages:chat_messages(*)
        `)
                .eq('user_id', supabaseUserId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Fetch sessions error:', error);
                throw error;
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
        if (!isSupabaseReady || !supabaseUserId) {
            return;
        }

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
                    published_at: session.publishedAt || null,
                    created_at: session.createdAt || new Date().toISOString(),
                    post_data: session.post || {}
                }, { onConflict: 'id' });

            if (sessionError) {
                console.error('Save session error:', sessionError);
                throw sessionError;
            }

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

    // 6. Upload File directly to Supabase Storage (iOS Safari compatible)
    const uploadFileDirectly = async (file) => {
        if (!isSupabaseReady || !supabaseUserId) {
            // iOS Safari: Try to refresh session if not ready
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    return await performDirectUpload(file, session.user.id);
                }
            } catch (sessionError) {
                console.error('Session recovery error:', sessionError);
            }
            return null;
        }

        return await performDirectUpload(file, supabaseUserId);
    };

    // Helper function for direct upload
    const performDirectUpload = async (file, userId) => {
        try {
            // Validate file
            if (!file || file.size < 100) {
                console.error('Invalid file or too small');
                return null;
            }

            // Determine file extension
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
                fileExt = 'jpg';
            }

            const uploadFileName = `${userId}/${Date.now()}_${crypto.randomUUID()}.${fileExt}`;

            // Upload File directly
            const { error } = await supabase.storage
                .from('chat-images')
                .upload(uploadFileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.error('Upload error:', error.message);
                throw error;
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('chat-images')
                .getPublicUrl(uploadFileName);

            return publicUrl;

        } catch (error) {
            console.error('Direct upload error:', error.message || error);
            return null;
        }
    };

    // 7. Upload Image to Supabase Storage (base64 version - fallback)
    const uploadImageToSupabase = async (base64Image) => {
        if (!isSupabaseReady || !supabaseUserId) {
            return null;
        }

        try {
            // Validate input
            if (!base64Image || typeof base64Image !== 'string' || !base64Image.startsWith('data:')) {
                return null;
            }

            // Extract mime type
            const mimeMatch = base64Image.match(/data:([^;]+);/);
            let mimeType = 'image/jpeg';

            if (mimeMatch) {
                mimeType = mimeMatch[1];
                if (mimeType.includes('heic') || mimeType.includes('heif')) {
                    mimeType = 'image/jpeg';
                }
            }

            // Convert base64 to Blob
            const base64Data = base64Image.split(',')[1];
            if (!base64Data) return null;

            // iOS Safari compatible base64 decoding
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);

            const blob = new Blob([byteArray], { type: mimeType });

            // Validate blob size
            if (blob.size < 100) {
                return null;
            }

            // Generate unique filename
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

            return publicUrl;

        } catch (error) {
            console.error('Image upload error:', error);
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

    // 9. Fetch Subscription Status
    const fetchSubscriptionStatus = async () => {
        if (!isSupabaseReady || !supabaseUserId) {
            return null;
        }

        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('subscription_tier, subscription_status, blog_generation_count, subscription_end_date')
                .eq('id', supabaseUserId)
                .single();

            if (error) {
                console.error('Fetch subscription error:', error);
                return null;
            }

            const tier = profile.subscription_tier || 'free';
            const limit = tier === 'free' ? 10 : Infinity;

            return {
                tier,
                status: profile.subscription_status || 'active',
                blogCount: profile.blog_generation_count || 0,
                limit,
                endDate: profile.subscription_end_date
            };
        } catch (error) {
            console.error('Fetch Subscription Status Error:', error);
            return null;
        }
    };

    // 10. Check Blog Generation Limit
    const checkBlogGenerationLimit = async () => {
        if (!isSupabaseReady || !supabaseUserId) {
            return {
                allowed: false,
                remaining: 0,
                message: 'User not authenticated'
            };
        }

        try {
            const subscriptionStatus = await fetchSubscriptionStatus();

            if (!subscriptionStatus) {
                return {
                    allowed: false,
                    remaining: 0,
                    message: 'Failed to fetch subscription status'
                };
            }

            const { tier, blogCount, limit } = subscriptionStatus;

            if (tier === 'premium') {
                return {
                    allowed: true,
                    remaining: Infinity,
                    message: 'Unlimited generation available'
                };
            }

            // Free tier check
            const remaining = Math.max(0, limit - blogCount);
            const allowed = blogCount < limit;

            return {
                allowed,
                remaining,
                message: allowed
                    ? `${remaining} generations remaining`
                    : 'Monthly limit reached. Upgrade to Premium for unlimited generation.'
            };
        } catch (error) {
            console.error('Check Blog Generation Limit Error:', error);
            return {
                allowed: false,
                remaining: 0,
                message: 'Error checking generation limit'
            };
        }
    };

    // 11. Increment Blog Count
    const incrementBlogCount = async () => {
        if (!isSupabaseReady || !supabaseUserId) {
            console.warn('Cannot increment blog count: user not ready');
            return false;
        }

        try {
            // First fetch current subscription tier
            const { data: profile, error: fetchError } = await supabase
                .from('profiles')
                .select('subscription_tier, blog_generation_count')
                .eq('id', supabaseUserId)
                .single();

            if (fetchError) {
                console.error('Fetch profile error:', fetchError);
                return false;
            }

            const tier = profile.subscription_tier || 'free';

            // Only increment for free tier users
            if (tier !== 'free') {
                console.log('Premium user, skipping blog count increment');
                return true;
            }

            const currentCount = profile.blog_generation_count || 0;

            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    blog_generation_count: currentCount + 1,
                    updated_at: new Date().toISOString()
                })
                .eq('id', supabaseUserId);

            if (updateError) {
                console.error('Increment blog count error:', updateError);
                return false;
            }

            console.log('Blog count incremented:', currentCount + 1);
            return true;
        } catch (error) {
            console.error('Increment Blog Count Error:', error);
            return false;
        }
    };

    // 12. Initiate Payment (PortOne)
    const initiatePayment = async (planType) => {
        if (!isSupabaseReady || !supabaseUserId) {
            throw new Error('User not authenticated');
        }

        try {
            const { data, error } = await supabase.functions.invoke('create-payment', {
                body: {
                    userId: supabaseUserId,
                    amount: 2000,
                    planType
                }
            });

            if (error) {
                console.error('Payment initiation error:', error);
                throw error;
            }

            if (!data || !data.paymentId) {
                throw new Error('Payment data not returned');
            }

            // Return payment data for PortOne SDK
            // storeId, paymentId, amount, orderName, etc.
            return data;
        } catch (error) {
            console.error('Initiate Payment Error:', error);
            throw error;
        }
    };

    // 13. Cancel Subscription
    const cancelSubscription = async () => {
        if (!isSupabaseReady || !supabaseUserId) {
            throw new Error('User not authenticated');
        }

        try {
            const { data, error } = await supabase.functions.invoke('cancel-subscription', {
                body: {
                    userId: supabaseUserId
                }
            });

            if (error) {
                console.error('Subscription cancellation error:', error);
                throw error;
            }

            console.log('Subscription cancelled successfully');
            return data;
        } catch (error) {
            console.error('Cancel Subscription Error:', error);
            throw error;
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
        logErrorToSupabase,
        fetchSubscriptionStatus,
        checkBlogGenerationLimit,
        incrementBlogCount,
        initiatePayment,
        cancelSubscription
    };
};
