import 'dotenv/config';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { connectToDatabase } from './db.js';
import { typeDefs } from './graphql/typeDefs.js';
import { resolvers } from './graphql/resolvers.js';

async function main() {
  await connectToDatabase();

  const server = new ApolloServer({ typeDefs, resolvers });

  const { url } = await startStandaloneServer(server, {
    listen: { port: Number(process.env.PORT) || 4002 },
  });

  console.log(`service-2 GraphQL server ready at ${url}`);
}

main().catch((error) => {
  console.error('Failed to start service-2:', error);
  process.exit(1);
});
