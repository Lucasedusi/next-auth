import axios, { AxiosError } from "axios";
import { parseCookies, setCookie } from "nookies";

interface AxiosErrorResponse {
	code?: string;
}

let cookies = parseCookies();
let isRefresing = false;
let failedRequestQueue = [];

export const api = axios.create({
	baseURL: "http://localhost:3333",
	headers: {
		Authorization: `Bearer ${cookies["nextauth.token"]}`,
	},
});

api.interceptors.response.use(
	(response) => {
		return response;
	},
	(error: AxiosError<AxiosErrorResponse>) => {
		if (error.response.status === 401) {
			if (error.response.data?.code === "token.expired") {
				cookies = parseCookies();

				const { "nextauth.refreshToken": refreshToken } = cookies;
				const originalConfig = error.config;

				if (!isRefresing) {
					isRefresing = true;

					api
						.post("/refresh", {
							refreshToken,
						})
						.then((response) => {
							const { token } = response.data;

							setCookie(undefined, "nextauth.token", token, {
								maxAge: 60 * 60 * 24 * 30,
								path: "/",
							});

							setCookie(
								undefined,
								"nextauth.refreshToken",
								response.data.refreshToken,
								{
									maxAge: 60 * 60 * 24 * 30,
									path: "/",
								}
							);

							api.defaults.headers["authorization"] = `Bearer ${token}`;

							failedRequestQueue.forEach((request) => request.onSuccess(token));
							failedRequestQueue = [];
						})
						.catch((err) => {
							failedRequestQueue.forEach((request) => request.onFailure(err));
							failedRequestQueue = [];
						})
						.finally(() => {
							isRefresing = false;
						});
				}

				return new Promise((resolve, reject) => {
					failedRequestQueue.push({
						onSuccess: (token: string) => {
							originalConfig.headers["Authorization"] = `Bearer ${token}`;

							resolve(api(originalConfig));
						},
						onFailure: (err: AxiosError) => {
							reject(err);
						},
					});
				});
			} else {
				//
			}
		}
	}
);
