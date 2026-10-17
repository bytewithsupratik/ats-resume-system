require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const apiRoutes = require('./routes/api');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api', apiRoutes);

mongoose
.connect(process.env.MONGO_URI)
.then( () => {
    console.log('Connected to MongoDB sucessfully');
})
.catch( (err) => {
    console.error('Error connecting to MongoDB:', err.message);
});

app.get('/', (req, res) => {
    res.json({ message: 'Resume Builder API is up and running!'});
});

const PORT = process.env.PORT || 5001;  
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});