import axios from "axios";
import { authClient } from "./auth-client";

export const api = axios.create({
  withCredentials: true,
  baseURL: process.env.NEXT_PUBLIC_BASE_URL! as string,
});

api.interceptors.request.use(async (config) => {
  const { data } = await authClient.token();
  if (data?.token) {
    config.headers.Authorization = `Bearer ${data.token}`;
  }
  return config;
});
