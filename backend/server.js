const express = require('express');
const cors = require('cors');
const path = require('path');
const { processData } = require('./lib/processor');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

const USER_ID = 'suraj_01012000';
const EMAIL_ID = 'suraj@college.edu';
const COLLEGE_ROLL = 'XXXXXX';

app.post('/bfhl', (req, res) => {
  try {
    const { data } = req.body;
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ is_success: false, error: 'Need a "data" array.' });
    }
    const result = processData(data);
    return res.json({ is_success: true, user_id: USER_ID, email_id: EMAIL_ID, college_roll_number: COLLEGE_ROLL, ...result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ is_success: false, error: 'Internal server error.' });
  }
});

app.get('/bfhl', (req, res) => {
  res.json({ operation_code: 1 });
});

app.listen(PORT, () => {
  console.log('BFHL API running on http://localhost:' + PORT);
});
