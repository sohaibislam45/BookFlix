import mongoose from 'mongoose';
import { USER_ROLES } from '@/lib/constants';

const userSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  profilePhoto: {
    type: String,
    default: null,
  },
  role: {
    type: String,
    enum: Object.values(USER_ROLES),
    default: USER_ROLES.MEMBER,
  },
  address: {
    division: { type: String, trim: true },
    city: { type: String, trim: true },
    area: { type: String, trim: true },
    landmark: { type: String, trim: true },
  },
  subscription: {
    type: {
      type: String,
      enum: ['free', 'monthly', 'yearly'],
      default: 'free',
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired'],
      default: 'active',
    },
    startDate: Date,
    endDate: Date,
    stripeSubscriptionId: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create indexes
userSchema.index({ email: 1 });
userSchema.index({ firebaseUid: 1 });
userSchema.index({ role: 1 });

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;

