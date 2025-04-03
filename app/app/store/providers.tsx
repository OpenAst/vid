'use client';

import { Provider } from 'react-redux';
import { store, persistor } from './store';
import { ReactNode } from 'react';
import { PersistGate } from 'redux-persist/integration/react';


type ProvidersProps = {
  children: ReactNode;
}
export default function Providers({ children }: ProvidersProps) {
  return (
  <Provider store={store}>
    <PersistGate persistor={persistor}>
      {children}
    </PersistGate>
  </Provider>
  );
}