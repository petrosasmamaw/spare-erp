"use client";

import { configureStore } from "@reduxjs/toolkit";
import erpReducer from "@/lib/features/erpSlice";

export const store = configureStore({
  reducer: {
    erp: erpReducer,
  },
});
