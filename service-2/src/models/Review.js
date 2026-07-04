import mongoose from 'mongoose';

const { Schema } = mongoose;

export const SENTIMENTS = ['POSITIVE', 'NEUTRAL', 'NEGATIVE'];

const reviewSchema = new Schema(
  {
    text: { type: String, required: true, trim: true },
    sentiment: { type: String, enum: SENTIMENTS, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const Review = mongoose.model('Review', reviewSchema);
