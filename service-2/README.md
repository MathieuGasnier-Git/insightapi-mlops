# service-2

GraphQL microservice (Apollo Server) backed by MongoDB Atlas. Exposes a `Review` type for text reviews with sentiment.

## Setup

```bash
cd service-2
npm install
cp .env.example .env   # then set MONGODB_URI to your Atlas connection string
npm run dev
```

The server starts at `http://localhost:4002/` (override with `PORT`).

## Schema

```graphql
type Review {
  id: ID!
  text: String!
  sentiment: Sentiment
  createdAt: String!
}

enum Sentiment {
  POSITIVE
  NEUTRAL
  NEGATIVE
}

type ReviewStats {
  total: Int!
  positive: Int!
  negative: Int!
  neutral: Int!
}

type Query {
  # Most recent first. Optionally filter by sentiment and paginate (limit defaults to 20, offset to 0).
  reviews(sentiment: Sentiment, limit: Int = 20, offset: Int = 0): [Review!]!
  review(id: ID!): Review
  reviewStats: ReviewStats!
}

type Mutation {
  createReview(input: CreateReviewInput!): Review!
  updateReview(id: ID!, input: CreateReviewInput!): Review!
  deleteReview(id: ID!): Boolean!
}
```

`updateReview` and `deleteReview` return a `NOT_FOUND` `GraphQLError` (same `extensions.code` pattern as `createReview`'s `BAD_USER_INPUT`) if `id` doesn't match an existing review.

## Example operations

```graphql
mutation {
  createReview(input: { text: "Great product!", sentiment: POSITIVE }) {
    id
    text
    sentiment
    createdAt
  }
}

query {
  reviews(sentiment: POSITIVE, limit: 10, offset: 0) {
    id
    text
    sentiment
    createdAt
  }
}

query {
  reviewStats {
    total
    positive
    negative
    neutral
  }
}

mutation {
  updateReview(id: "...", input: { text: "Updated text", sentiment: NEGATIVE }) {
    id
    text
    sentiment
  }
}

mutation {
  deleteReview(id: "...")
}
```
