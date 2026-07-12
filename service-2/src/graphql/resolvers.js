import { GraphQLError } from 'graphql';
import { Review } from '../models/Review.js';

function assertReviewText(input) {
  const text = input.text?.trim();

  if (!text) {
    throw new GraphQLError('Review text must not be empty', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  return text;
}

function notFound(id) {
  return new GraphQLError(`Review ${id} not found`, {
    extensions: { code: 'NOT_FOUND' },
  });
}

export const resolvers = {
  Query: {
    reviews: async (_parent, { sentiment, limit, offset }) =>
      Review.find(sentiment ? { sentiment } : {})
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit),
    review: async (_parent, { id }) => Review.findById(id).catch(() => null),
    reviewStats: async () => {
      const counts = await Review.aggregate([
        { $group: { _id: '$sentiment', count: { $sum: 1 } } },
      ]);

      const stats = { total: 0, positive: 0, negative: 0, neutral: 0 };
      for (const { _id, count } of counts) {
        stats.total += count;
        if (_id === 'POSITIVE') stats.positive = count;
        else if (_id === 'NEGATIVE') stats.negative = count;
        else if (_id === 'NEUTRAL') stats.neutral = count;
      }
      return stats;
    },
  },

  Mutation: {
    createReview: async (_parent, { input }) => {
      const text = assertReviewText(input);
      return Review.create({ text, sentiment: input.sentiment ?? null });
    },

    updateReview: async (_parent, { id, input }) => {
      const text = assertReviewText(input);

      const updated = await Review.findByIdAndUpdate(
        id,
        { text, sentiment: input.sentiment ?? null },
        { new: true, runValidators: true }
      ).catch(() => null);

      if (!updated) {
        throw notFound(id);
      }
      return updated;
    },

    deleteReview: async (_parent, { id }) => {
      const deleted = await Review.findByIdAndDelete(id).catch(() => null);

      if (!deleted) {
        throw notFound(id);
      }
      return true;
    },
  },

  Review: {
    id: (review) => review.id,
    createdAt: (review) => review.createdAt.toISOString(),
  },
};
