import mongoose from 'mongoose';
import { BOOK_STATUS } from '@/lib/constants';

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  author: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  isbn: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    index: true,
  },
  description: {
    type: String,
    trim: true,
  },
  coverImage: {
    type: String,
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
    index: true,
  },
  publishedDate: {
    type: Date,
  },
  publisher: {
    type: String,
    trim: true,
  },
  bookLanguage: {
    type: String,
    default: 'en',
    trim: true,
  },
  shelfLocation: {
    type: String,
    trim: true,
  },
  pages: {
    type: Number,
    min: 0,
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  ratingCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
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

// Text index for search
// Set default_language to 'none' to prevent Atlas Search from using document's language field as override
bookSchema.index(
  { title: 'text', author: 'text', description: 'text', tags: 'text' },
  { default_language: 'none' }
);
bookSchema.index({ category: 1, isActive: 1 });
bookSchema.index({ rating: -1, ratingCount: -1 });

// Note: updatedAt is automatically managed by timestamps: true in schema options

// Virtual for available copies count
bookSchema.virtual('availableCopies', {
  ref: 'BookCopy',
  localField: '_id',
  foreignField: 'book',
  match: { status: BOOK_STATUS.AVAILABLE },
  count: true,
});

// Virtual for total copies count
bookSchema.virtual('totalCopies', {
  ref: 'BookCopy',
  localField: '_id',
  foreignField: 'book',
  count: true,
});

// Ensure virtuals are included in JSON
bookSchema.set('toJSON', { virtuals: true });
bookSchema.set('toObject', { virtuals: true });

const Book = mongoose.models.Book || mongoose.model('Book', bookSchema);

export default Book;

