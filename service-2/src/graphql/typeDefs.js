export const typeDefs = `#graphql
  enum Sentiment {
    POSITIVE
    NEUTRAL
    NEGATIVE
  }

  type Review {
    id: ID!
    text: String!
    sentiment: Sentiment
    createdAt: String!
  }

  input CreateReviewInput {
    text: String!
    sentiment: Sentiment
  }

  type ReviewStats {
    total: Int!
    positive: Int!
    negative: Int!
    neutral: Int!
  }

  type Query {
    "Fetch reviews, most recent first. Optionally filter by sentiment and paginate."
    reviews(sentiment: Sentiment, limit: Int = 20, offset: Int = 0): [Review!]!
    "Fetch a single review by id, or null if it doesn't exist"
    review(id: ID!): Review
    "Review counts by sentiment, plus the total across all reviews"
    reviewStats: ReviewStats!
  }

  type Mutation {
    createReview(input: CreateReviewInput!): Review!
    updateReview(id: ID!, input: CreateReviewInput!): Review!
    deleteReview(id: ID!): Boolean!
  }
`;
