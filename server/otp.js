
// Node.js Express backend for OTP generation and verification (production-ready)
const express = require('express');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const cors = require('cors');
const User = require('./models/User');
const Otp = require('./models/Otp');
const twilio = require('twilio');
const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/civicpulse', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});


// Configure nodemailer with Gmail SMTP for production
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'subhasishrath6@gmail.com', // <-- CHANGE THIS
    pass: 'subhasishgmail@00',   // <-- CHANGE THIS
  },
});

// Configure Twilio for SMS OTP
const TWILIO_ACCOUNT_SID = 'ACd7c65c4094a7863d45a7308c95981da6';
const TWILIO_AUTH_TOKEN = '0bb4193ac5c39e3dfaf77481ff3cabc4';
const TWILIO_WHATSAPP_NUMBER = 'whatsapp:+14155238886';
const TWILIO_CONTENT_SID = 'HXb5b62575e6e4ff6129ad7c8efe1f983e';
const twilioClient = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);


// Request OTP endpoint (production-ready)
app.post('/api/request-otp', async (req, res) => {
  const { email, phone } = req.body;

  if (!email && !phone) return res.status(400).json({ error: 'Email or phone required' });

  // Check if user exists in DB (allow any user to request OTP for password reset)
  let user;
  if (email) {
    user = await User.findOne({ email });
    if (!user) {
      // Optionally, create a user record or return error
      return res.status(404).json({ error: 'User not found' });
    }
  } else if (phone) {
    user = await User.findOne({ phone });
    if (!user) {
      // Optionally, create a user record or return error
      return res.status(404).json({ error: 'User not found' });
    }
  }

  // Generate OTP
  const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
  const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry

  // Store OTP in DB
  const identifier = email || phone;
  await Otp.findOneAndDelete({ identifier }); // Remove previous OTPs
  await Otp.create({ identifier, otp, expires });

  if (email) {
    try {
      await transporter.sendMail({
        from: 'subhasishrath6@gmail.com',
        to: email,
        subject: 'Your OTP Code',
        text: `Your OTP code is: ${otp}`,
      });
      res.json({ success: true });
    } catch (err) {
      console.error('OTP send error:', err);
      res.status(500).json({ error: 'Failed to send OTP', details: err.message });
    }
  } else if (phone) {
    try {
      // Send OTP via WhatsApp using Twilio template
      const message = await twilioClient.messages.create({
        from: TWILIO_WHATSAPP_NUMBER,
        contentSid: TWILIO_CONTENT_SID,
        contentVariables: JSON.stringify({ '1': otp }),
        to: `whatsapp:${phone.startsWith('+') ? phone : '+91' + phone}`,
      });
      res.json({ success: true, message: 'OTP sent to WhatsApp.', sid: message.sid });
    } catch (err) {
      console.error('Twilio WhatsApp OTP send error:', err);
      res.status(500).json({ error: 'Failed to send OTP via WhatsApp', details: err.message });
    }
  }
});


// Verify OTP endpoint (production-ready)
app.post('/api/verify-otp', async (req, res) => {
  const { identifier, otp } = req.body; // identifier: email or phone
  const record = await Otp.findOne({ identifier, otp });
  if (!record || record.expires < new Date()) {
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }
  // OTP is valid, allow password reset
  await Otp.deleteOne({ _id: record._id });
  res.json({ success: true });
});


app.listen(4000, () => console.log('OTP server running on port 4000'));
