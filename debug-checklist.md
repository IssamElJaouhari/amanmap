# Debug Checklist for Rating Submission

## Step 1: Verify Login Status
1. Open browser to http://localhost:3000
2. Open browser console (F12)
3. Go to http://localhost:3000/api/debug
4. Check if it shows `"authenticated": true`
5. If false, you need to log in first

## Step 2: Log In (if needed)
1. Click "Sign In" button
2. Use: admin@amanmap.com / admin123
3. After login, check /api/debug again - should show authenticated: true

## Step 3: Test Rating Submission
1. Click "Add Rating" button
2. Click "Point" or "Area" button
3. Click on the map to draw
4. Fill out the rating sliders
5. Click "Submit Rating"
6. **WATCH THE CONSOLE** - you should see logs starting with 🚀

## Step 4: Check What You See
Please tell me EXACTLY what you see in:

### Browser Console (F12 -> Console tab):
- Any errors in red?
- Any logs starting with 🚀 or ❌?
- What happens when you click Submit Rating?

### Terminal (where npm run dev is running):
- Any logs starting with 🚀 POST /api/ratings?
- Any authentication errors?
- Any database errors?

### MongoDB Compass:
- Refresh the ratings collection
- Any new documents?

## Step 5: If Still Not Working
Run these commands and tell me the output:

```bash
# Check if you're logged in
curl http://localhost:3000/api/debug

# Check database connection
node test-rating.js
```
