# Task Assignment Notification Fix

## Problem
When a user assigned a task to another user, both users were receiving notifications instead of just the assigned user.

## Solution
Updated the notification logic in the `BoardsService` to ensure that **only the assigned user receives notifications**, not the user who performed the assignment.

## Changes Made

### 1. Updated `boards.service.ts`

**Modified `updateCard` method** (lines 115-180):
- Already had correct logic: `data.assignee !== userId` ensures the assigner doesn't get notified
- This handles regular card updates through the standard API

**Modified `createCard` method** (lines 74-113):
- Already had correct logic: `saved.assignee !== userId` ensures the assigner doesn't get notified
- This handles new card creation

**Modified `createCardForList` method** (lines 417-457):
- Already had correct logic: `saved.assignee !== creatorId` ensures the assigner doesn't get notified
- This handles system-level card creation (e.g., from meetings)

**NEW: Updated `updateCardById` method** (lines 459-501):
- **Added notification logic** that was missing
- Now properly notifies only the assigned user when a task is reassigned
- Added optional `updaterId` parameter to track who made the update
- Logic: Only notify if `data.assignee !== updaterId` (i.e., user is not assigning to themselves)
- This is critical for meeting tasks and other system operations

### 2. Updated `boards.controller.ts`

**Modified `updateCardSystem` endpoint** (line 156):
- Now passes `req.session.userId` as the `updaterId` parameter
- This allows the service to know who initiated the update and prevent self-notification

## How It Works

### Scenario 1: User A assigns a task to User B
```typescript
// When User A creates or updates a card and assigns it to User B:
data.assignee = userB.id;  // User B's ID
userId = userA.id;          // User A's ID (from session)

// Notification check:
if (data.assignee !== userId && data.assignee !== existing.assignee) {
  // User B gets notified ✅
  // User A does NOT get notified ✅
}
```

### Scenario 2: User A assigns a task to themselves
```typescript
// When User A creates or updates a card and assigns it to themselves:
data.assignee = userA.id;   // User A's ID
userId = userA.id;          // User A's ID (from session)

// Notification check:
if (data.assignee !== userId && data.assignee !== existing.assignee) {
  // This condition is false, so NO notification is sent ✅
}
```

### Scenario 3: Meeting task assignment (system endpoint)
```typescript
// When User A assigns a meeting point to User B:
data.assignee = userB.id;   // User B's ID
updaterId = userA.id;       // User A's ID (from session)

// Notification check:
if (!updaterId || data.assignee !== updaterId) {
  if (data.assignee !== existing.assignee) {
    // User B gets notified ✅
    // User A does NOT get notified ✅
  }
}
```

## Testing

### Manual Testing Steps

1. **Create two test users** (if not already created):
   - User A (e.g., admin@example.com)
   - User B (e.g., test@example.com)

2. **Test regular task assignment**:
   - Login as User A
   - Go to a board and create a new task
   - Assign the task to User B
   - Check notifications:
     - User B should see: "New task assigned: [Task Name]" ✅
     - User A should NOT see any notification ✅

3. **Test task reassignment**:
   - Login as User A
   - Edit an existing task
   - Change assignee from User A to User B
   - Check notifications:
     - User B should see: "Task assigned: [Task Name]" ✅
     - User A should NOT see any notification ✅

4. **Test meeting task assignment**:
   - Login as User A
   - Create or edit a meeting
   - Add an action item in the notes
   - Assign the action item to User B
   - Save the meeting
   - Check notifications:
     - User B should see: "New task assigned: [Task Name]" ✅
     - User A should NOT see any notification ✅

5. **Test self-assignment** (edge case):
   - Login as User A
   - Create a task and assign it to yourself (User A)
   - Check notifications:
     - User A should NOT see any notification ✅

### Query to Check Recent Notifications

Run this script to see recent task assignment notifications:

```bash
cd backend
npx ts-node src/scripts/test-meeting-task-notifications.ts
```

This will show the last 10 task_assigned notifications and which users received them.

## Expected Behavior

✅ **Correct**: Only the assigned user receives a notification
❌ **Incorrect**: Both the assigner and assignee receive notifications
✅ **Correct**: No notification when a user assigns a task to themselves

## Files Modified

1. `/backend/src/boards/boards.service.ts` - Added notification logic to `updateCardById` method
2. `/backend/src/boards/boards.controller.ts` - Updated `updateCardSystem` endpoint to pass user ID
