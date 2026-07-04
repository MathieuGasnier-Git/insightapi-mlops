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

type Query {
  reviews: [Review!]!
  review(id: ID!): Review
}

type Mutation {
  createReview(input: CreateReviewInput!): Review!
}
```

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
  reviews {
    id
    text
    sentiment
    createdAt
  }
}
```
