import { supabase } from './supabase.js';

// ── Session helpers ──────────────────────────────────
export async function getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

export async function getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

// ── Google OAuth ─────────────────────────────────────
export async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin + '/dashboard.html',
        },
    });
    if (error) throw error;
    return data;
}

// ── Magic Link ───────────────────────────────────────
export async function sendMagicLink(email) {
    const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            shouldCreateUser: true,
            emailRedirectTo: window.location.origin + '/dashboard.html',
        },
    });
    if (error) throw error;
    return data;
}

// Alias for backwards compatibility
export const sendOtp = sendMagicLink;

// ── Sign out ─────────────────────────────────────────
export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    window.location.href = '/';
}

// ── Route protection ─────────────────────────────────
export async function requireAuth() {
    const session = await getSession();
    if (!session) {
        window.location.href = '/auth.html';
        return null;
    }
    return session;
}

// ── Auth state listener ──────────────────────────────
export function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
}

// ── Update navbar based on auth state ────────────────
export async function initNavAuth() {
    const session = await getSession();
    const authBtns = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');

    if (!authBtns || !userMenu) return;

    if (session) {
        authBtns.style.display = 'none';
        userMenu.style.display = 'flex';
        const avatar = userMenu.querySelector('.user-avatar');
        const name = userMenu.querySelector('.user-name');
        if (avatar && session.user.user_metadata?.avatar_url) {
            avatar.src = session.user.user_metadata.avatar_url;
        }
        if (name) {
            name.textContent = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User';
        }
    } else {
        authBtns.style.display = 'flex';
        userMenu.style.display = 'none';
    }

    // Sign out button
    const signOutBtn = document.getElementById('sign-out-btn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await signOut();
        });
    }
}
