import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
import { getGraphqlUrl } from '../config';

export function createApolloClient(uri: string = getGraphqlUrl()) {
  return new ApolloClient({
    link: new HttpLink({ uri }),
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: { fetchPolicy: 'cache-and-network' },
    },
  });
}
