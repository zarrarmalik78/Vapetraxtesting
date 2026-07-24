import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useFirestore } from '../hooks/useFirestore';
import { where } from 'firebase/firestore';

interface DataContextType {
  products: any[];
  productsLoading: boolean;
  customers: any[];
  customersLoading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { shopId } = useAuth();

  const { documents: products, loading: productsLoading } = useFirestore<any>(
    shopId ? 'products' : null,
    where('shopId', '==', shopId)
  );

  const { documents: customers, loading: customersLoading } = useFirestore<any>(
    shopId ? 'customers' : null,
    where('shopId', '==', shopId)
  );

  return (
    <DataContext.Provider value={{ products, productsLoading, customers, customersLoading }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
