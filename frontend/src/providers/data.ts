import simpleRestDataProvider from "@refinedev/simple-rest";
import { axiosInstance } from "./axios";
import { API_URL } from "./constants";

/**
 * REST data provider pointed at the NestJS backend. Uses the shared axios
 * instance so every request carries the JWT and benefits from auto-refresh.
 * getList relies on the backend's `x-total-count` header for pagination.
 */
export const dataProvider = simpleRestDataProvider(API_URL, axiosInstance);
