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

  type Query {
    "Fetch all reviews, most recent first"
    reviews: [Review!]!
    "Fetch a single review by id, or null if it doesn't exist"
    review(id: ID!): Review
  }

  type Mutation {
    createReview(input: CreateReviewInput!): Review!
  }
`;
