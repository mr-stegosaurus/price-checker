const express = require('express');
const app = express();

app.use(express.static('src/services/visualization/web'));
app.listen(3000, () => console.log('Dashboard running on http://localhost:3000')); 