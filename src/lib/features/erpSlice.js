"use client";

import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiRequest } from "@/lib/api";

export const fetchProducts = createAsyncThunk("erp/fetchProducts", async (search = "") => {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiRequest(`/products${query}`);
});

export const createProduct = createAsyncThunk("erp/createProduct", async (payload, { dispatch }) => {
  await apiRequest("/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  await dispatch(fetchProducts());
  await dispatch(fetchFinanceSummary());
  return true;
});

export const deleteProduct = createAsyncThunk("erp/deleteProduct", async (productId, { dispatch }) => {
  await apiRequest(`/products/${productId}`, {
    method: "DELETE",
  });

  await dispatch(fetchProducts());
  await dispatch(fetchFinanceSummary());
  return true;
});

export const buyProduct = createAsyncThunk("erp/buyProduct", async ({ productId, payload }, { dispatch }) => {
  await apiRequest(`/products/${productId}/buy`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  await dispatch(fetchProducts());
  await dispatch(fetchFinanceSummary());
  return true;
});

export const sellProduct = createAsyncThunk("erp/sellProduct", async ({ productId, payload }, { dispatch }) => {
  await apiRequest(`/products/${productId}/sell`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  await dispatch(fetchProducts());
  await dispatch(fetchFinanceSummary());
  return true;
});

export const fetchReports = createAsyncThunk("erp/fetchReports", async ({ productId = "", range = "all" } = {}) => {
  const params = new URLSearchParams();
  if (productId) {
    params.set("productId", String(productId));
  }
  if (range && range !== "all") {
    params.set("range", range);
  }

  const query = params.toString();
  return apiRequest(`/item-reports${query ? `?${query}` : ""}`);
});

export const fetchTransactions = createAsyncThunk("erp/fetchTransactions", async (range = "all") => {
  const query = range && range !== "all" ? `?range=${range}` : "";
  return apiRequest(`/transactions${query}`);
});

export const fetchDashboard = createAsyncThunk("erp/fetchDashboard", async (range = "all") => {
  const query = range && range !== "all" ? `?range=${range}` : "";
  return apiRequest(`/dashboard${query}`);
});

export const fetchFinanceSummary = createAsyncThunk("erp/fetchFinanceSummary", async () => {
  return apiRequest("/finance/summary");
});

export const fetchFinanceReports = createAsyncThunk(
  "erp/fetchFinanceReports",
  async ({ range = "all", account = "" } = {}) => {
    const params = new URLSearchParams();
    if (range && range !== "all") {
      params.set("range", range);
    }
    if (account) {
      params.set("account", account);
    }

    const query = params.toString();
    return apiRequest(`/finance/reports${query ? `?${query}` : ""}`);
  }
);

export const createFinanceEntry = createAsyncThunk(
  "erp/createFinanceEntry",
  async (payload, { dispatch }) => {
    await apiRequest("/finance/entry", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    await dispatch(fetchFinanceSummary());
    await dispatch(fetchFinanceReports());
    return true;
  }
);

const initialState = {
  products: [],
  reports: [],
  transactions: [],
  financeReports: [],
  financeSummary: {
    balance: 0,
    credit: 0,
    profit: 0,
    stockValue: 0,
  },
  dashboard: {
    totalSales: 0,
    totalPurchases: 0,
    profit: 0,
    currentStock: 0,
  },
  loading: false,
  actionLoading: false,
  error: null,
};

const erpSlice = createSlice({
  name: "erp",
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to load products";
      })
      .addCase(fetchReports.fulfilled, (state, action) => {
        state.reports = action.payload;
      })
      .addCase(fetchReports.rejected, (state, action) => {
        state.error = action.error.message || "Failed to load reports";
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.transactions = action.payload;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.error = action.error.message || "Failed to load transactions";
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.dashboard = action.payload;
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.error = action.error.message || "Failed to load dashboard";
      })
      .addCase(fetchFinanceSummary.fulfilled, (state, action) => {
        state.financeSummary = action.payload;
      })
      .addCase(fetchFinanceSummary.rejected, (state, action) => {
        state.error = action.error.message || "Failed to load finance summary";
      })
      .addCase(fetchFinanceReports.fulfilled, (state, action) => {
        state.financeReports = action.payload;
      })
      .addCase(fetchFinanceReports.rejected, (state, action) => {
        state.error = action.error.message || "Failed to load finance reports";
      })
      .addMatcher(
        (action) =>
          action.type === createProduct.pending.type ||
          action.type === deleteProduct.pending.type ||
          action.type === buyProduct.pending.type ||
          action.type === sellProduct.pending.type ||
          action.type === createFinanceEntry.pending.type,
        (state) => {
          state.actionLoading = true;
          state.error = null;
        }
      )
      .addMatcher(
        (action) =>
          action.type === createProduct.fulfilled.type ||
          action.type === deleteProduct.fulfilled.type ||
          action.type === buyProduct.fulfilled.type ||
          action.type === sellProduct.fulfilled.type ||
          action.type === createFinanceEntry.fulfilled.type,
        (state) => {
          state.actionLoading = false;
        }
      )
      .addMatcher(
        (action) =>
          action.type === createProduct.rejected.type ||
          action.type === deleteProduct.rejected.type ||
          action.type === buyProduct.rejected.type ||
          action.type === sellProduct.rejected.type ||
          action.type === createFinanceEntry.rejected.type,
        (state, action) => {
          state.actionLoading = false;
          state.error = action.error.message || "Action failed";
        }
      );
  },
});

export const { clearError } = erpSlice.actions;

export default erpSlice.reducer;
