const fs = require('fs');
const path = require('path');
const express = require('express');
const app = express();

// Middleware to parse JSON request body
app.use(express.json());

// Serve static files from the current directory
app.use(express.static(path.join(__dirname, '/')));

const leaderboardPath = path.join(__dirname, 'leaderboard.json');

// GET - Fetch the leaderboard
app.get('/leaderboard.json', (req, res) => {
    fs.readFile(leaderboardPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading leaderboard:', err);
            return res.status(500).send('Unable to fetch leaderboard');
        }
        res.send(JSON.parse(data || '[]'));
    });
});

// POST - Update the leaderboard
app.post('/leaderboard.json', (req, res) => {
    const newLeaderboard = req.body;

    // Ensure the body contains valid data
    if (!Array.isArray(newLeaderboard)) {
        return res.status(400).send('Invalid leaderboard format');
    }

    fs.writeFile(leaderboardPath, JSON.stringify(newLeaderboard, null, 2), (err) => {
        if (err) {
            console.error('Error writing leaderboard:', err);
            return res.status(500).send('Unable to update leaderboard');
        }
        res.send('Leaderboard updated successfully');
    });
});

// Start the server
const PORT = 8000; // Ensure this matches the port used in your client
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
