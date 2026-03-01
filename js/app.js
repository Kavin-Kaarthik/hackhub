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

    // Reset looking_for_team so the user appears in the pool again
    await supabase.from('profiles').update({ looking_for_team: true }).eq('id', userId);
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
// TEAM INVITATIONS & REQUESTS
// ═══════════════════════════════════════════════════════
export async function sendTeamInvitation(teamId, userId) {
    // Check if invitation already exists
    const { data: existing } = await supabase
        .from('team_invitations')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .maybeSingle();
    if (existing) throw new Error('Invitation already sent to this user');

    // Check if user already in team
    const { data: isMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .maybeSingle();
    if (isMember) throw new Error('User is already in the team');

    const { error } = await supabase
        .from('team_invitations')
        .insert({
            team_id: teamId,
            user_id: userId,
            status: 'pending',
            sent_at: new Date().toISOString()
        });
    if (error) throw error;
}

const DEFAULT_MAX_TEAM_MEMBERS = 10;

export async function acceptTeamInvitation(invitationId, userId) {
    // Get invitation details
    const { data: invitation, error: invErr } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('id', invitationId)
        .single();
    if (invErr) throw invErr;
    if (invitation.user_id !== userId || invitation.status !== 'pending') {
        throw new Error('Invalid invitation');
    }

    // Check team capacity (use count for accuracy; max_members may be null)
    const { data: team } = await supabase
        .from('teams')
        .select('max_members')
        .eq('id', invitation.team_id)
        .single();
    const maxMembers = team?.max_members ?? DEFAULT_MAX_TEAM_MEMBERS;
    const { count: memberCount } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', invitation.team_id);
    if ((memberCount ?? 0) >= maxMembers) {
        throw new Error('Team is full');
    }

    // Add user to team
    const { error: memberErr } = await supabase
        .from('team_members')
        .insert({ team_id: invitation.team_id, user_id: userId, role: 'member' });
    if (memberErr) throw memberErr;

    // Update invitation status
    const { error: updateErr } = await supabase
        .from('team_invitations')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', invitationId);
    if (updateErr) throw updateErr;

    // Update looking_for_team flag
    await supabase.from('profiles').update({ looking_for_team: false }).eq('id', userId);
}

export async function rejectTeamInvitation(invitationId, userId) {
    // Verify ownership
    const { data: invitation } = await supabase
        .from('team_invitations')
        .select('user_id')
        .eq('id', invitationId)
        .single();
    if (invitation.user_id !== userId) {
        throw new Error('Unauthorized');
    }

    const { error } = await supabase
        .from('team_invitations')
        .update({ status: 'rejected', responded_at: new Date().toISOString() })
        .eq('id', invitationId);
    if (error) throw error;
}

export async function getPendingInvitations(userId) {
    const { data, error } = await supabase
        .from('team_invitations')
        .select(`
            *,
            teams:team_id (id, team_name, description, max_members, team_members(count))
        `)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('sent_at', { ascending: false });
    if (error) throw error;
    return data;
}

export async function getPendingRequests(teamId) {
    const { data, error } = await supabase
        .from('team_invitations')
        .select(`
            *,
            profiles:user_id (id, display_name, avatar_url, skills, experience_level, bio)
        `)
        .eq('team_id', teamId)
        .eq('status', 'pending')
        .order('sent_at', { ascending: false });
    if (error) throw error;
    return data;
}

// ═══════════════════════════════════════════════════════
// TEAM MEMBER MANAGEMENT
// ═══════════════════════════════════════════════════════
export async function removeTeamMember(teamId, userId) {
    const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId);
    if (error) throw error;

    // Update looking_for_team flag
    await supabase.from('profiles').update({ looking_for_team: true }).eq('id', userId);
}

export async function deleteTeam(teamId) {
    // Get member user_ids BEFORE deleting (so we can reset looking_for_team)
    const { data: members, error: fetchErr } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', teamId);
    if (fetchErr) throw fetchErr;

    // Delete all team_members
    const { error: membersErr } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId);
    if (membersErr) throw membersErr;

    // Update all former members' looking_for_team flag
    if (members?.length) {
        for (const member of members) {
            await supabase.from('profiles').update({ looking_for_team: true }).eq('id', member.user_id);
        }
    }

    // Delete team
    const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);
    if (error) throw error;
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
    // Only persist schema columns: innovation, design, impact, technical, scored_at
    const { data, error } = await supabase
        .from('scores')
        .upsert({
            judge_id: judgeId,
            project_id: projectId,
            innovation: scores.innovation,
            design: scores.design,
            impact: scores.impact,
            technical: scores.technical,
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

// ═══════════════════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════════════════
// CURRENT (broken for this project - checks profiles.role which doesn't exist here)
 
// FIX - check the admins table instead
export async function isAdmin(userId) {
  const { data } = await supabase
    .from('admins')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}

export async function getAllUsers() {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

export async function getAllJudges() {
    const { data, error } = await supabase
        .from('judges')
        .select(`
            *,
            profiles:user_id (display_name, avatar_url, email)
        `)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

export async function addJudgeByEmail(email) {
    // Look up user
    const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .eq('email', email)
        .maybeSingle();
    if (pErr) throw pErr;
    if (!profile) throw new Error('No registered user found with that email');

    // Check if already a judge
    const { data: existing } = await supabase
        .from('judges')
        .select('id')
        .eq('user_id', profile.id)
        .maybeSingle();
    if (existing) throw new Error('This user is already a judge');

    // Insert
    const { error } = await supabase
        .from('judges')
        .insert({
            user_id: profile.id,
            name: profile.display_name || email,
            email: profile.email,
        });
    if (error) throw error;
}

export async function removeJudge(judgeId) {
    const { error } = await supabase
        .from('judges')
        .delete()
        .eq('id', judgeId);
    if (error) throw error;
}

export async function getEventStats() {
    const [usersRes, teamsRes, projectsRes, judgesRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('teams').select('id', { count: 'exact', head: true }),
        supabase.from('projects').select('id', { count: 'exact', head: true }),
        supabase.from('judges').select('id', { count: 'exact', head: true }),
    ]);
    return {
        users: usersRes?.count ?? 0,
        teams: teamsRes?.count ?? 0,
        projects: projectsRes?.count ?? 0,
        judges: judgesRes?.count ?? 0,
    };
}