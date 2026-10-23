const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Atlas URI
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://chhaliamankumar_db_user:PE30O0P9rE16MBu7@cluster0.kzk2ov7.mongodb.net/?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
  .then(() => console.log("Connected to MongoDB Atlas successfully!"))
  .catch(err => console.error("Database connection error:", err));

// Member Schema
const memberSchema = new mongoose.Schema({
    cardNo: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    gatepass: { type: String, required: true },
    dailyWage: { type: Number, required: true, default: 0 }
});

const Member = mongoose.model('Member', memberSchema);

// API Endpoints
app.get('/api/members', async (req, res) => {
    try {
        const members = await Member.find();
        res.json(members);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/members', async (req, res) => {
    try {
        const newMember = new Member(req.body);
        await newMember.save();
        res.status(201).json(newMember);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.put('/api/members/:cardNo', async (req, res) => {
    try {
        const updated = await Member.findOneAndUpdate(
            { cardNo: req.params.cardNo }, 
            req.body, 
            { new: true, upsert: true }
        );
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

