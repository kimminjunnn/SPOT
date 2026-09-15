// src/lib/api/client.ts
import axios, { type AxiosInstance } from "axios";
import { router } from "expo-router";
import { useAuthStore } from "@/src/stores/useAuthStore";

let isHandlingUnauthorized = false;

function attachInterceptors(client: AxiosInstance): AxiosInstance {
  client.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;

    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });

  client.interceptors.response.use(
    (res) => {
      if (__DEV__) {
        const method = (res.config?.method ?? "GET").toUpperCase();
        console.log(`✅ [${method}] ${res.config.url} ${res.status}`);
      }

      return res;
    },
    (err) => {
      const method = (err.config?.method ?? "GET").toUpperCase();
      const message =
        err.response?.data?.message ?? err.message ?? "Unknown error";
      const status = err.response?.status;

      console.error(
        `❌ [${method}] ${err.config?.url ?? "unknown url"} ${status}`,
      );
      console.error(`❌ ${message}`);

      if (status === 401 && !isHandlingUnauthorized) {
        isHandlingUnauthorized = true;

        void useAuthStore
          .getState()
          .clearAuth()
          .finally(() => {
            router.replace("/login");
            isHandlingUnauthorized = false;
          });
      }

      return Promise.reject(err);
    },
  );

  return client;
}

export const api8080 = attachInterceptors(
  axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_BASE_URL_8080,
    timeout: 10_000,
  }),
);

export const api8000 = attachInterceptors(
  axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_BASE_URL_8000,
    timeout: 10_000,
  }),
);

export const api8001 = attachInterceptors(
  axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_BASE_URL_8001,
    timeout: 10_000,
  }),
);
