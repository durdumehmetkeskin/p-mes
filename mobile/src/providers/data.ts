import simpleRestDataProvider from "@refinedev/simple-rest";

import { API_URL } from "@/lib/constants";
import { axiosInstance } from "./axios";

/**
 * REST data provider pointed at the NestJS backend, over the shared axios
 * instance (JWT + auto-refresh). getList relies on the backend's
 * `x-total-count` header for pagination (Refine simple-rest contract).
 */
export const dataProvider = simpleRestDataProvider(API_URL, axiosInstance);
