import React from 'react';

export const LanguageContext = React.createContext<{
  language: string;
  changeLanguage: (code: string) => Promise<void>;
}>({
  language: 'en',
  changeLanguage: async () => {},
});
