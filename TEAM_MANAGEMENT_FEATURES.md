# HackHub Team Management Features

## Overview
Complete implementation of team management features that allow team leaders to manage team members and enable team members to join/leave teams through a handshake mechanism.

---

## 1. Team Leaders Can Remove Members

### How It Works
- **Location**: Teams Page → Team Management Panel
- **UI**: Leaders see a "⚙️ Manage Team" button on their team card
- **Function**: `removeTeamMember(teamId, userId)` in `/js/app.js`

### Database Changes
```javascript
// Updates made to database:
1. Deletes the member from team_members table:
   DELETE FROM team_members WHERE team_id = ? AND user_id = ?

2. Updates the member's profile to set looking_for_team = true:
   UPDATE profiles SET looking_for_team = true WHERE id = ?
```

### Flow
1. Leader clicks "⚙️ Manage Team" on their team card
2. Modal opens showing all team members
3. For non-leader members, a "Remove" button is shown
4. Clicking Remove triggers confirmation dialog
5. Member is deleted from team_members table
6. Member's looking_for_team flag is set to true
7. Member can now join other teams

---

## 2. Team Leaders Can Add Members Looking for a Team

### Handshake Mechanism
Uses the `team_invitations` table for pending requests:

### Process (Two Methods)

#### Method 1: Invite from "Looking for Team" Tab
- **Location**: Teams Page → "👤 Looking for Team" tab
- **UI**: Team leaders see "📩 Send Invitation" button on each participant
- **Function**: `sendTeamInvitation(teamId, userId)` in `/js/app.js`

**Flow**:
1. Navigate to Teams page
2. Switch to "👤 Looking for Team" tab (only visible for team leaders)
3. Click "📩 Send Invitation" on desired participant
4. Confirmation modal appears
5. Invitation is sent to participant's dashboard
6. Participant receives notification in "📩 Team Invitations" card
7. Participant can Accept or Reject

#### Method 2: Add by Email
- **Location**: Teams Page → Team Management → "➕ Add by Email"
- **UI**: Modal with email input field
- **Function**: `addTeamMemberByEmail(teamId, email)` in `/js/app.js`

**Flow**:
1. Leader clicks "⚙️ Manage Team"
2. Clicks "➕ Add by Email"
3. Enter registered user's email
4. User is added directly to team (no handshake)
5. User's looking_for_team flag is set to false

### Database Changes
```javascript
// team_invitations table structure:
INSERT INTO team_invitations (team_id, user_id, status, sent_at) 
VALUES (?, ?, 'pending', now())

// Update when accepted:
UPDATE team_invitations SET status = 'accepted', responded_at = now() WHERE id = ?

// Add to team_members:
INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, 'member')
```

---

## 3. Handshake System for Joining Teams

### Invitation Flow
1. **Sent by Leaders**: `sendTeamInvitation(teamId, userId)` creates pending invitation
2. **Received by Players**: Dashboard shows "📩 Team Invitations" card
3. **Accept/Reject**: 
   - Accept: `acceptTeamInvitation(invitationId, userId)`
   - Reject: `rejectTeamInvitation(invitationId, userId)`

### Automatic Joining
Players not looking for a team can:
- Join team directly if not full: `joinTeam(teamId, userId)`
- Team must have space (< max_members)
- Looking_for_team flag is set to false

### Status Tracking
```
team_invitations.status:
- 'pending': Awaiting response
- 'accepted': User joined team
- 'rejected': User declined invitation
```

---

## 4. People in a Team Can Leave

### How It Works
- **Function**: `leaveTeam(teamId, userId)` in `/js/app.js`
- **Available On**: 
  - Dashboard → "👥 Your Team" card
  - Teams Page → Team card (for members only)

### UI Updates Made
1. **Dashboard**: Added "Leave Team" button below team info
2. **Teams Page**: Added "Leave Team" button on team card for members

### Database Changes
```javascript
// Delete from team_members:
DELETE FROM team_members WHERE team_id = ? AND user_id = ?

// Note: looking_for_team flag is automatically set to true by removeTeamMember function
```

### Flow
1. User clicks "Leave Team" button
2. Confirmation dialog appears
3. If confirmed:
   - User is removed from team_members
   - looking_for_team flag is set to true
   - User can rejoin other teams
4. Toast notification confirms action
5. UI updates to show "Find a Team" state

---

## 5. Complete User Journeys

### Journey 1: Team Leader Adding Third-Party Member
```
Leader → Teams Page
       → "⚙️ Manage Team" button
       → "➕ Add by Email" button
       → Enter email of registered user
       → User automatically added to team
       → User sees their team in dashboard
```

### Journey 2: Team Leader Inviting Member Looking for Team
```
Leader → Teams Page
      → "👤 Looking for Team" tab
      → "📩 Send Invitation" on participant
      → Confirm invitation
      → Participant receives invite on Dashboard
      → Participant can Accept/Reject in "📩 Team Invitations"
```

### Journey 3: Member Leaving Team
```
Member → Dashboard OR Teams Page
       → Clicks "Leave Team"
       → Confirms action
       → Removed from team_members table
       → Can now find/join new teams
```

### Journey 4: Removing Underperforming Member
```
Leader → Teams Page
       → "⚙️ Manage Team" button
       → Finds member in list
       → Clicks "Remove" button
       → Confirms removal
       → Member is kicked from team_members
       → Member's looking_for_team flag is reset to true
```

---

## Files Modified

1. **dashboard.html**
   - Added `leaveTeam` import
   - Enhanced `loadTeamStatus` to show "Leave Team" button
   - Wired up leave team event listeners

2. **teams.html**
   - Added `leaveTeam` import
   - Updated team card UI to show "Leave Team" for members
   - Added leave team event listeners with confirmation

3. **js/app.js** (pre-existing, verified)
   - `removeTeamMember(teamId, userId)` - Works ✓
   - `leaveTeam(teamId, userId)` - Works ✓
   - `sendTeamInvitation(teamId, userId)` - Works ✓
   - `addTeamMemberByEmail(teamId, email)` - Works ✓
   - `acceptTeamInvitation(invitationId, userId)` - Works ✓
   - `rejectTeamInvitation(invitationId, userId)` - Works ✓

---

## Database Schema Summary

### Tables Used
- **team_members**: User membership in teams
- **team_invitations**: Pending/sent invitations
- **profiles**: User info (looking_for_team flag)

### Key Operations
```SQL
-- Remove member
DELETE FROM team_members WHERE team_id = ? AND user_id = ?
UPDATE profiles SET looking_for_team = true WHERE id = ?

-- Leave team
DELETE FROM team_members WHERE team_id = ? AND user_id = ?
UPDATE profiles SET looking_for_team = true WHERE id = ?

-- Send invitation
INSERT INTO team_invitations (team_id, user_id, status, sent_at) 
VALUES (?, ?, 'pending', now())

-- Accept invitation
UPDATE team_invitations SET status = 'accepted', responded_at = now() WHERE id = ?
INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, 'member')
UPDATE profiles SET looking_for_team = false WHERE id = ?

-- Add by email
INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, 'member')
UPDATE profiles SET looking_for_team = false WHERE id = ?
```

---

## Feature Checklist

- ✅ Team leaders can remove members from team
- ✅ Removal is reflected in SQL (team_members and profiles tables)
- ✅ Team leaders can add registered members by email
- ✅ Team leaders can invite members looking for a team
- ✅ Handshake system for invitations (pending → accepted/rejected)
- ✅ Team members can leave team from dashboard
- ✅ Team members can leave team from teams page
- ✅ looking_for_team flag is properly maintained
- ✅ Proper confirmations before destructive actions
- ✅ Toast notifications for all actions
- ✅ Error handling throughout

