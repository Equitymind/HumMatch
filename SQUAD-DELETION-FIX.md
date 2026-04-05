# Squad Deletion Fix

## The Bug
The DELETE endpoint for squads doesn't exist in server.js, so the "Delete Squad" button fails.

## The Fix
Add this endpoint to `server.js` around line 1490, **BEFORE** the `// API: Hum History` comment:

```javascript
// Delete squad
app.delete('/api/hummatch/squad/:id', requireAuth, (req, res) => {
  try {
    const squadId = req.params.id;
    const userId = req.user.id;
    
    // Get squad and verify ownership
    const squad = db.prepare('SELECT * FROM squads WHERE id = ? AND owner_user_id = ?').get(squadId, userId);
    if (!squad) {
      return res.status(404).json({ error: 'Squad not found or you are not the owner' });
    }
    
    // Delete squad members first (foreign key constraint)
    db.prepare('DELETE FROM squad_members WHERE squad_id = ?').run(squadId);
    
    // Delete name votes
    db.prepare('DELETE FROM squad_name_votes WHERE squad_id = ?').run(squadId);
    
    // Delete the squad itself
    db.prepare('DELETE FROM squads WHERE id = ?').run(squadId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Squad deletion error:', error);
    res.status(500).json({ error: 'Failed to delete squad' });
  }
});
```

## To Deploy

1. Open `server.js` in VSCode or your editor
2. Find the comment `// API: Hum History` (around line 1490)
3. Paste the code above BEFORE that comment
4. Save the file
5. Commit and push:
   ```bash
   git add server.js
   git commit -m "Add squad deletion endpoint"
   git push origin main
   ```
6. Render will auto-deploy in ~2 minutes

## Test
1. Go to dashboard
2. Click "Delete Squad" on one of the duplicate "TheNalgas" entries
3. Should delete successfully without error
