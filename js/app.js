import { supabase } from './supabase.js';

// ═══════════════════════════════════════════════════════
// PROFILES
// ═══════════════════════════════════════════════════════
export async function getProfile(userId) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    if (error) throw error;
    return data;
}

export async function updateProfile(userId, updates) {
    const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function getParticipants(filters = {}) {
    let query = supabase.from('profiles').select('*');
    if (filters.lookingForTeam) {
        query = query.eq('looking_for_team', true);
    }
    if (filters.skill) {
        query = query.contains('skills', [filters.skill]);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

// ═══════════════════════════════════════════════════════
// TEAMS
// ═══════════════════════════════════════════════════════
export async function createTeam(teamName, description, userId) {
    // Create team
    const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({ team_name: teamName, description, created_by: userId })
        .select()
        .single();
    if (teamError) throw teamError;

    // Add creator as leader
    const { error: memberError } = await supabase
        .from('team_members')
        .insert({ team_id: team.id, user_id: userId, role: 'leader' });
    if (memberError) throw memberError;

    // Set looking_for_team to false
    await supabase.from('profiles').update({ looking_for_team: false }).eq('id', userId);

    return team;
}

export async function getTeams() {
    const { data, error } = await supabase
        .from('teams')
        .select(`
      *,
      team_members (
        user_id,
        role,
        profiles:user_id (display_name, avatar_url, skills)
      )
    `)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

export async function getTeam(teamId) {
    const { data, error } = await supabase
        .from('teams')
        .select(`
      *,
      team_members (
        user_id,
        role,
        profiles:user_id (id, display_name, avatar_url, skills, experience_level)
      )
    `)
        .eq('id', teamId)
        .single();
    if (error) throw error;
    return data;
}

export async function joinTeam(teamId, userId) {
    const { error } = await supabase
        .from('team_members')
        .insert({ team_id: teamId, user_id: userId, role: 'member' });
    if (error) throw error;
    await supabase.from('profiles').update({ looking_for_team: false }).eq('id', userId);
}

export async function leaveTeam(teamId, userId) {
    const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId);
    if (error) throw error;
}

export async function addTeamMemberByEmail(teamId, email) {
    // Look up user by email in profiles
    const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();
    if (profileErr) throw profileErr;
    if (!profile) throw new Error('No registered user found with that email');

    // Check if already a member
    const { data: existing } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', profile.id)
        .maybeSingle();
    if (existing) throw new Error('This user is already in the team');

    // Add as member
    const { error: insertErr } = await supabase
        .from('team_members')
        .insert({ team_id: teamId, user_id: profile.id, role: 'member' });
    if (insertErr) throw insertErr;

    // Update their looking_for_team status
    await supabase.from('profiles').update({ looking_for_team: false }).eq('id', profile.id);
}

export async function getUserTeam(userId) {
    const { data, error } = await supabase
        .from('team_members')
        .select(`
      role,
      teams (*)
    `)
        .eq('user_id', userId)
        .maybeSingle();
    if (error) throw error;
    return data;
}

// ═══════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════
export async function getEvent() {
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
    if (error) throw error;
    return data;
}

export async function getSchedule(eventId) {
    const { data, error } = await supabase
        .from('event_schedule')
        .select('*')
        .eq('event_id', eventId)
        .order('start_time', { ascending: true });
    if (error) throw error;
    return data;
}

// ═══════════════════════════════════════════════════════
// PROJECTS
// ═══════════════════════════════════════════════════════
export async function submitProject(projectData) {
    const { data, error } = await supabase
        .from('projects')
        .insert(projectData)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function getProjects() {
    const { data, error } = await supabase
        .from('projects')
        .select(`
      *,
      teams:team_id (team_name, team_members (profiles:user_id (display_name, avatar_url)))
    `)
        .order('submitted_at', { ascending: false });
    if (error) throw error;
    return data;
}

export async function getProject(projectId) {
    const { data, error } = await supabase
        .from('projects')
        .select(`
      *,
      teams:team_id (
        team_name,
        team_members (
          role,
          profiles:user_id (display_name, avatar_url, skills)
        )
      )
    `)
        .eq('id', projectId)
        .single();
    if (error) throw error;
    return data;
}

// ═══════════════════════════════════════════════════════
// JUDGING & LEADERBOARD
// ═══════════════════════════════════════════════════════
export async function isJudge(userId) {
    const { data, error } = await supabase
        .from('judges')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
    if (error) throw error;
    return data;
}

export async function submitScore(judgeId, projectId, scores) {
    const { data, error } = await supabase
        .from('scores')
        .upsert({
            judge_id: judgeId,
            project_id: projectId,
            ...scores,
            scored_at: new Date().toISOString(),
        }, { onConflict: 'judge_id,project_id' })
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function getLeaderboard() {
    const { data, error } = await supabase
        .from('projects')
        .select(`
      id,
      title,
      tech_stack,
      teams:team_id (team_name),
      scores (innovation, design, impact, technical)
    `)
        .order('submitted_at', { ascending: false });
    if (error) throw error;

    // Calculate average scores
    return data.map(project => {
        const scoreEntries = project.scores || [];
        if (scoreEntries.length === 0) {
            return { ...project, avg_score: 0, total_judges: 0 };
        }
        const totals = scoreEntries.reduce(
            (acc, s) => ({
                innovation: acc.innovation + s.innovation,
                design: acc.design + s.design,
                impact: acc.impact + s.impact,
                technical: acc.technical + s.technical,
            }),
            { innovation: 0, design: 0, impact: 0, technical: 0 }
        );
        const count = scoreEntries.length;
        const avg_score = (totals.innovation + totals.design + totals.impact + totals.technical) / (count * 4);
        return { ...project, avg_score: Math.round(avg_score * 10) / 10, total_judges: count };
    }).sort((a, b) => b.avg_score - a.avg_score);
}

// ═══════════════════════════════════════════════════════
// REALTIME
// ═══════════════════════════════════════════════════════
export function subscribeToScores(callback) {
    return supabase
        .channel('scores-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, (payload) => {
            callback(payload);
        })
        .subscribe();
}
