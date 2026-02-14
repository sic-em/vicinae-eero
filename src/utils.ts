import { readFile, writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { homedir } from "os";
import { EeroAPI } from "./api";

/**
 * Configuration interface for Eero API credentials
 */
export interface EeroConfig {
	token?: string;
	network_id?: string;
}

/**
 * Authentication status response with network details
 */
export interface AuthStatus {
	authenticated: boolean;
	networkName?: string;
	token?: string;
	networkId?: string;
}

/**
 * Get the path to the Eero config file
 */
export const getConfigPath = (): string => {
	return join(homedir(), ".config", "eero-cli", "config.json");
};

/**
 * Read the Eero config file
 */
export const getConfig = async (): Promise<EeroConfig> => {
	try {
		const configPath = getConfigPath();
		const content = await readFile(configPath, "utf-8");
		return JSON.parse(content);
	} catch {
		return {};
	}
};

/**
 * Save the Eero config file
 */
export const saveConfig = async (config: EeroConfig): Promise<void> => {
	const configPath = getConfigPath();
	const configDirectory = dirname(configPath);

	await mkdir(configDirectory, { recursive: true, mode: 0o700 });
	await writeFile(configPath, JSON.stringify(config, null, 2), {
		mode: 0o600,
	});
};

/**
 * Check if the user is authenticated by verifying token existence
 */
export const isAuthenticated = async (): Promise<boolean> => {
	try {
		const config = await getConfig();
		return !!config.token;
	} catch {
		return false;
	}
};

/**
 * Get authentication status with network details
 */
export const getAuthStatus = async (): Promise<AuthStatus> => {
	const config = await getConfig();

	if (!config.token) {
		return { authenticated: false };
	}

	try {
		const api = new EeroAPI(config.token);
		const account = await api.getAccount();

		const networkName =
			account.networks.data.length > 0
				? account.networks.data[0].name
				: undefined;

		return {
			authenticated: true,
			networkName,
			token: config.token,
			networkId: config.network_id,
		};
	} catch {
		return {
			authenticated: true,
			token: config.token,
			networkId: config.network_id,
		};
	}
};

/**
 * Logout by clearing the saved token and network ID
 */
export const logout = async (): Promise<void> => {
	await saveConfig({ token: "", network_id: "" });
};
