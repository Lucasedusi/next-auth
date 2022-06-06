import { createContext, ReactNode, useState } from "react";
import { setCookie } from "nookies";
import { api } from "../services/api";
import Router from "next/router";

type User = {
	email: string;
	permissions: string[];
	roles: string;
};

type SignInCredentials = {
	email: string;
	password: string;
};

type AuthContextData = {
	user: User;
	SignIn(credentials: SignInCredentials): Promise<void>;
	isAuthenticated: boolean;
};

type AuthProviderProps = {
	children: ReactNode;
};

export const AuthContext = createContext({} as AuthContextData);

export function AuthProvider({ children }: AuthProviderProps) {
	const [user, setUser] = useState<User>();
	const isAuthenticated = !!user;

	async function SignIn({ email, password }: SignInCredentials) {
		try {
			const response = await api.post("sessions", {
				email,
				password,
			});

			const { token, refreshToken, permissions, roles } = response.data;

			setCookie(undefined, "nextauth.token", token, {
				maxAge: 60 * 60 * 24 * 30,
				path: "/",
			});
			setCookie(undefined, "nextauth.refreshToken", refreshToken, {
				maxAge: 60 * 60 * 24 * 30,
				path: "/",
			});

			setUser({
				email,
				permissions,
				roles,
			});

			Router.push("/dashboard");
		} catch (error) {
			console.log(error);
		}
	}

	return (
		<AuthContext.Provider value={{ SignIn, isAuthenticated, user }}>
			{children}
		</AuthContext.Provider>
	);
}
