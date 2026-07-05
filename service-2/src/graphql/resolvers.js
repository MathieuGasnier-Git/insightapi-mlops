import { GraphQLError } from 'graphql';
import { Review } from '../models/Review.js';

export const resolvers = {
  Query: {
    reviews: async () => Review.find().sort({ createdAt: -1 }),
    review: async (_parent, { id }) => Review.findById(id).catch(() => null),
  },

  Mutation: {
    createReview: async (_parent, { input }) => {
      const text = input.text?.trim();

      if (!text) {
        throw new GraphQLError('Review text must not be empty', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      return Review.create({ text, sentiment: input.sentiment ?? null });
    },
  },

  Review: {
    id: (review) => review.id,
    createdAt: (review) => review.createdAt.toISOString(),
  },
};
