import React from 'react';
import { Providers, renderWithApolloData } from '@apollosproject/ui-test-utils';
import { MockedProvider } from '@apollo/client/testing';

import Onboarding from '.';

describe('the Onboarding component', () => {
  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('should render Onboarding', async () => {
    const tree = await renderWithApolloData(
      <Providers MockedProvider={MockedProvider}>
        <Onboarding />
      </Providers>
    );
    expect(tree).toMatchSnapshot();
  });
});
