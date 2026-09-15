const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Please add a name'],
    trim: true 
  },
  phone: { 
    type: String, 
    default: '' 
  },
  email: { 
    type: String, 
    unique: true, 
    required: [true, 'Please add an email'], 
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  passwordHash: { 
    type: String, 
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'publisher', 'admin'],
    default: 'user'
  },
  jobPreferences: { 
    type: [String], 
    default: [] 
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// Create and export the model
const User = mongoose.model('User', userSchema);
module.exports = User;