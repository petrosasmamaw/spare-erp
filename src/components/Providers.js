"use client";

import { Provider } from "react-redux";
import { store } from "@/lib/store";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";

export default function Providers({ children }) {
  return (
    <Provider store={store}>
      <LanguageProvider>{children}</LanguageProvider>
    </Provider>
  );
}
